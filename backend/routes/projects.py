from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Project, ProjectMember, User, Task, Activity, Notification
from datetime import datetime, timezone

projects_bp = Blueprint('projects', __name__)


def log_activity(user_id, action, entity_type, entity_id, entity_name, project_id=None):
    activity = Activity(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        project_id=project_id
    )
    db.session.add(activity)


def get_user_project(project_id, user_id):
    """Get project and check if user is a member"""
    project = Project.query.get_or_404(project_id)
    user = User.query.get_or_404(user_id)
    
    if user.role == 'admin':
        return project, 'admin'
    
    membership = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    
    if not membership and project.owner_id != user_id:
        return None, None
    
    return project, membership.role if membership else 'admin'


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    search = request.args.get('search', '')

    if user.role == 'admin':
        query = Project.query
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        query = Project.query.filter(
            db.or_(
                Project.owner_id == user_id,
                Project.id.in_(member_project_ids)
            )
        )

    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(Project.name.ilike(f'%{search}%'))

    query = query.order_by(Project.updated_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'projects': [p.to_dict(include_stats=True) for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@projects_bp.route('', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if not data.get('name') or len(data['name'].strip()) < 2:
        return jsonify({'error': 'Project name must be at least 2 characters'}), 422

    deadline = None
    if data.get('deadline'):
        try:
            deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        except:
            pass

    project = Project(
        name=data['name'].strip(),
        description=data.get('description', ''),
        owner_id=user_id,
        status=data.get('status', 'active'),
        priority=data.get('priority', 'medium'),
        color=data.get('color', '#3b82f6'),
        deadline=deadline
    )
    db.session.add(project)
    db.session.flush()

    # Add creator as admin member
    membership = ProjectMember(project_id=project.id, user_id=user_id, role='admin')
    db.session.add(membership)

    # Add additional members if provided
    for member_id in data.get('member_ids', []):
        if member_id != user_id:
            m = ProjectMember(project_id=project.id, user_id=member_id, role='member')
            db.session.add(m)
            notif = Notification(
                user_id=member_id,
                title='Added to project',
                message=f'You have been added to project "{project.name}"',
                type='info',
                link=f'/projects/{project.id}'
            )
            db.session.add(notif)

    log_activity(user_id, 'created', 'project', project.id, project.name, project.id)
    db.session.commit()

    return jsonify({'message': 'Project created', 'project': project.to_dict(include_members=True)}), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404

    return jsonify({'project': project.to_dict(include_members=True, include_stats=True)}), 200


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404
    if role not in ['admin']:
        return jsonify({'error': 'Only project admins can edit projects'}), 403

    data = request.get_json()
    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'status' in data:
        project.status = data['status']
    if 'priority' in data:
        project.priority = data['priority']
    if 'color' in data:
        project.color = data['color']
    if 'deadline' in data:
        if data['deadline']:
            try:
                project.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            except:
                pass
        else:
            project.deadline = None

    project.updated_at = datetime.now(timezone.utc)
    log_activity(user_id, 'updated', 'project', project.id, project.name, project.id)
    db.session.commit()

    return jsonify({'message': 'Project updated', 'project': project.to_dict(include_members=True)}), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    project = Project.query.get_or_404(project_id)

    if project.owner_id != user_id and user.role != 'admin':
        return jsonify({'error': 'Only project owner or admin can delete'}), 403

    project_name = project.name
    db.session.delete(project)
    log_activity(user_id, 'deleted', 'project', project_id, project_name)
    db.session.commit()

    return jsonify({'message': 'Project deleted'}), 200


@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_member(project_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404
    if role not in ['admin']:
        return jsonify({'error': 'Only admins can add members'}), 403

    data = request.get_json()
    member_email = data.get('email', '').lower().strip()
    member_role = data.get('role', 'member')

    new_member = User.query.filter_by(email=member_email).first()
    if not new_member:
        return jsonify({'error': 'User not found with this email'}), 404

    existing = ProjectMember.query.filter_by(project_id=project_id, user_id=new_member.id).first()
    if existing:
        return jsonify({'error': 'User is already a member of this project'}), 422

    membership = ProjectMember(project_id=project_id, user_id=new_member.id, role=member_role)
    db.session.add(membership)

    notif = Notification(
        user_id=new_member.id,
        title='Added to project',
        message=f'You have been added to project "{project.name}" as {member_role}',
        type='info',
        link=f'/projects/{project.id}'
    )
    db.session.add(notif)
    log_activity(user_id, 'added_member', 'project', project.id, project.name, project.id)
    db.session.commit()

    return jsonify({'message': f'{new_member.name} added to project', 'member': membership.to_dict()}), 201


@projects_bp.route('/<int:project_id>/members/<int:member_user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(project_id, member_user_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404
    if role not in ['admin'] and user_id != member_user_id:
        return jsonify({'error': 'Permission denied'}), 403

    if project.owner_id == member_user_id:
        return jsonify({'error': 'Cannot remove project owner'}), 422

    membership = ProjectMember.query.filter_by(project_id=project_id, user_id=member_user_id).first()
    if not membership:
        return jsonify({'error': 'Member not found'}), 404

    db.session.delete(membership)
    db.session.commit()

    return jsonify({'message': 'Member removed'}), 200


@projects_bp.route('/<int:project_id>/tasks', methods=['GET'])
@jwt_required()
def get_project_tasks(project_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404

    status = request.args.get('status')
    priority = request.args.get('priority')
    assignee_id = request.args.get('assignee_id', type=int)

    query = Task.query.filter_by(project_id=project_id)
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)

    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify({'tasks': [t.to_dict() for t in tasks]}), 200


@projects_bp.route('/<int:project_id>/activity', methods=['GET'])
@jwt_required()
def get_project_activity(project_id):
    user_id = int(get_jwt_identity())
    project, role = get_user_project(project_id, user_id)
    if not project:
        return jsonify({'error': 'Project not found or access denied'}), 404

    activities = Activity.query.filter_by(project_id=project_id)\
        .order_by(Activity.created_at.desc()).limit(50).all()

    return jsonify({'activities': [a.to_dict() for a in activities]}), 200
