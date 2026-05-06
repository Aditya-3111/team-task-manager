from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Task, Project, ProjectMember, User, Activity, Notification
from datetime import datetime, timezone

tasks_bp = Blueprint('tasks', __name__)


def log_activity(user_id, action, entity_type, entity_id, entity_name, project_id=None):
    activity = Activity(
        user_id=user_id, action=action, entity_type=entity_type,
        entity_id=entity_id, entity_name=entity_name, project_id=project_id
    )
    db.session.add(activity)


def can_access_task(task, user_id):
    user = User.query.get(user_id)
    if user.role == 'admin':
        return True
    project = task.project
    if project.owner_id == user_id:
        return True
    return ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first() is not None


def can_modify_task(task, user_id):
    user = User.query.get(user_id)
    if user.role == 'admin':
        return True
    project = task.project
    if project.owner_id == user_id:
        return True
    member = ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first()
    return member is not None and member.role in ['admin', 'member']


@tasks_bp.route('', methods=['GET'])
@jwt_required()
def get_tasks():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    project_id = request.args.get('project_id', type=int)
    assignee_id = request.args.get('assignee_id', type=int)
    search = request.args.get('search', '')
    overdue_only = request.args.get('overdue', 'false').lower() == 'true'
    my_tasks = request.args.get('my_tasks', 'false').lower() == 'true'

    if user.role == 'admin':
        query = Task.query
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        owned_project_ids = db.session.query(Project.id).filter_by(owner_id=user_id)
        accessible_projects = member_project_ids.union(owned_project_ids)
        query = Task.query.filter(Task.project_id.in_(accessible_projects))

    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if project_id:
        query = query.filter_by(project_id=project_id)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)
    if my_tasks:
        query = query.filter_by(assignee_id=user_id)
    if search:
        query = query.filter(Task.title.ilike(f'%{search}%'))
    if overdue_only:
        now = datetime.now(timezone.utc)
        query = query.filter(
            Task.due_date < now,
            Task.status != 'done'
        )

    query = query.order_by(Task.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'tasks': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@tasks_bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if not data.get('title') or len(data['title'].strip()) < 2:
        return jsonify({'error': 'Task title must be at least 2 characters'}), 422
    if not data.get('project_id'):
        return jsonify({'error': 'Project ID is required'}), 422

    project = Project.query.get_or_404(data['project_id'])

    # Check access
    if user.role != 'admin' and project.owner_id != user_id:
        member = ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first()
        if not member or member.role == 'viewer':
            return jsonify({'error': 'Access denied'}), 403

    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            pass

    tags = ','.join(data.get('tags', [])) if isinstance(data.get('tags'), list) else data.get('tags', '')

    task = Task(
        title=data['title'].strip(),
        description=data.get('description', ''),
        project_id=data['project_id'],
        assignee_id=data.get('assignee_id'),
        creator_id=user_id,
        status=data.get('status', 'todo'),
        priority=data.get('priority', 'medium'),
        due_date=due_date,
        estimated_hours=data.get('estimated_hours'),
        tags=tags
    )
    db.session.add(task)
    db.session.flush()

    # Notify assignee
    if task.assignee_id and task.assignee_id != user_id:
        notif = Notification(
            user_id=task.assignee_id,
            title='New task assigned',
            message=f'You have been assigned: "{task.title}" in {project.name}',
            type='info',
            link=f'/tasks/{task.id}'
        )
        db.session.add(notif)

    log_activity(user_id, 'created', 'task', task.id, task.title, project.id)
    db.session.commit()

    return jsonify({'message': 'Task created', 'task': task.to_dict()}), 201


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)

    if not can_access_task(task, user_id):
        return jsonify({'error': 'Access denied'}), 403

    return jsonify({'task': task.to_dict(include_comments=True)}), 200


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)

    if not can_modify_task(task, user_id):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    old_status = task.status

    if 'title' in data and data['title'].strip():
        task.title = data['title'].strip()
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        task.status = data['status']
        if data['status'] == 'done' and old_status != 'done':
            task.completed_at = datetime.now(timezone.utc)
        elif data['status'] != 'done':
            task.completed_at = None
    if 'priority' in data:
        task.priority = data['priority']
    if 'assignee_id' in data:
        old_assignee = task.assignee_id
        task.assignee_id = data['assignee_id']
        # Notify new assignee
        if data['assignee_id'] and data['assignee_id'] != old_assignee and data['assignee_id'] != user_id:
            notif = Notification(
                user_id=data['assignee_id'],
                title='Task assigned to you',
                message=f'"{task.title}" has been assigned to you',
                type='info',
                link=f'/tasks/{task.id}'
            )
            db.session.add(notif)
    if 'due_date' in data:
        if data['due_date']:
            try:
                task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except:
                pass
        else:
            task.due_date = None
    if 'estimated_hours' in data:
        task.estimated_hours = data['estimated_hours']
    if 'tags' in data:
        task.tags = ','.join(data['tags']) if isinstance(data['tags'], list) else data['tags']

    task.updated_at = datetime.now(timezone.utc)
    log_activity(user_id, 'updated', 'task', task.id, task.title, task.project_id)
    db.session.commit()

    return jsonify({'message': 'Task updated', 'task': task.to_dict()}), 200


@tasks_bp.route('/<int:task_id>/status', methods=['PATCH'])
@jwt_required()
def update_task_status(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)

    if not can_modify_task(task, user_id):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    new_status = data.get('status')
    valid_statuses = ['todo', 'in_progress', 'in_review', 'done']

    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 422

    task.status = new_status
    if new_status == 'done':
        task.completed_at = datetime.now(timezone.utc)
    else:
        task.completed_at = None

    task.updated_at = datetime.now(timezone.utc)
    log_activity(user_id, f'moved_to_{new_status}', 'task', task.id, task.title, task.project_id)
    db.session.commit()

    return jsonify({'message': 'Status updated', 'task': task.to_dict()}), 200


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    task = Task.query.get_or_404(task_id)

    if user.role != 'admin' and task.creator_id != user_id:
        project = task.project
        if project.owner_id != user_id:
            member = ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first()
            if not member or member.role not in ['admin']:
                return jsonify({'error': 'Access denied'}), 403

    task_name = task.title
    project_id = task.project_id
    db.session.delete(task)
    log_activity(user_id, 'deleted', 'task', task_id, task_name, project_id)
    db.session.commit()

    return jsonify({'message': 'Task deleted'}), 200
