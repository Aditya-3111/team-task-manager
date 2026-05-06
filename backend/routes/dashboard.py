from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, Project, Task, ProjectMember, Activity
from datetime import datetime, timezone, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    now = datetime.now(timezone.utc)

    if user.role == 'admin':
        total_projects = Project.query.count()
        active_projects = Project.query.filter_by(status='active').count()
        total_tasks = Task.query.count()
        my_tasks = Task.query.filter_by(assignee_id=user_id).count()
        completed_tasks = Task.query.filter_by(status='done').count()
        in_progress = Task.query.filter_by(status='in_progress').count()
        in_review = Task.query.filter_by(status='in_review').count()
        todo_count = Task.query.filter_by(status='todo').count()
        overdue = Task.query.filter(Task.due_date < now, Task.status != 'done').count()
        total_members = User.query.count()
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        owned_ids = db.session.query(Project.id).filter_by(owner_id=user_id)
        accessible = member_project_ids.union(owned_ids)

        total_projects = Project.query.filter(Project.id.in_(accessible)).count()
        active_projects = Project.query.filter(Project.id.in_(accessible), Project.status == 'active').count()
        accessible_tasks = Task.query.filter(Task.project_id.in_(accessible))
        total_tasks = accessible_tasks.count()
        my_tasks = accessible_tasks.filter_by(assignee_id=user_id).count()
        completed_tasks = accessible_tasks.filter_by(status='done').count()
        in_progress = accessible_tasks.filter_by(status='in_progress').count()
        in_review = accessible_tasks.filter_by(status='in_review').count()
        todo_count = accessible_tasks.filter_by(status='todo').count()
        overdue = sum(1 for t in accessible_tasks.all() if t.is_overdue())
        total_members = User.query.count()

    # Due today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    if user.role == 'admin':
        due_today = Task.query.filter(
            Task.due_date >= today_start,
            Task.due_date < today_end,
            Task.status != 'done'
        ).count()
    else:
        due_today_query = accessible_tasks.filter(
            Task.due_date >= today_start,
            Task.due_date < today_end,
            Task.status != 'done'
        )
        due_today = due_today_query.count()

    return jsonify({
        'total_projects': total_projects,
        'active_projects': active_projects,
        'total_tasks': total_tasks,
        'my_tasks': my_tasks,
        'completed_tasks': completed_tasks,
        'in_progress': in_progress,
        'in_review': in_review,
        'todo': todo_count,
        'overdue': overdue,
        'due_today': due_today,
        'total_members': total_members,
        'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0),
    }), 200


@dashboard_bp.route('/my-tasks', methods=['GET'])
@jwt_required()
def get_my_tasks():
    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)

    tasks = Task.query.filter_by(assignee_id=user_id)\
        .filter(Task.status != 'done')\
        .order_by(Task.due_date.asc().nullslast(), Task.priority.desc())\
        .limit(10).all()

    return jsonify({'tasks': [t.to_dict() for t in tasks]}), 200


@dashboard_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role == 'admin':
        activities = Activity.query.order_by(Activity.created_at.desc()).limit(20).all()
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        owned_ids = db.session.query(Project.id).filter_by(owner_id=user_id)
        accessible = [r[0] for r in member_project_ids.union(owned_ids).all()]
        activities = Activity.query.filter(
            db.or_(
                Activity.project_id.in_(accessible),
                Activity.user_id == user_id
            )
        ).order_by(Activity.created_at.desc()).limit(20).all()

    return jsonify({'activities': [a.to_dict() for a in activities]}), 200


@dashboard_bp.route('/overdue-tasks', methods=['GET'])
@jwt_required()
def get_overdue_tasks():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    now = datetime.now(timezone.utc)

    if user.role == 'admin':
        tasks = Task.query.filter(Task.due_date < now, Task.status != 'done')\
            .order_by(Task.due_date.asc()).limit(10).all()
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        owned_ids = db.session.query(Project.id).filter_by(owner_id=user_id)
        accessible = member_project_ids.union(owned_ids)
        tasks = Task.query.filter(
            Task.project_id.in_(accessible),
            Task.due_date < now,
            Task.status != 'done'
        ).order_by(Task.due_date.asc()).limit(10).all()

    return jsonify({'tasks': [t.to_dict() for t in tasks]}), 200


@dashboard_bp.route('/task-completion-chart', methods=['GET'])
@jwt_required()
def get_completion_chart():
    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)

    # Last 7 days
    data = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        completed = Task.query.filter(
            Task.completed_at >= day_start,
            Task.completed_at < day_end
        ).count()

        created = Task.query.filter(
            Task.created_at >= day_start,
            Task.created_at < day_end
        ).count()

        data.append({
            'date': day_start.strftime('%a'),
            'completed': completed,
            'created': created,
        })

    return jsonify({'chart_data': data}), 200


@dashboard_bp.route('/project-health', methods=['GET'])
@jwt_required()
def get_project_health():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role == 'admin':
        projects = Project.query.filter_by(status='active').limit(6).all()
    else:
        member_project_ids = db.session.query(ProjectMember.project_id).filter_by(user_id=user_id)
        owned_ids = db.session.query(Project.id).filter_by(owner_id=user_id)
        accessible = member_project_ids.union(owned_ids)
        projects = Project.query.filter(
            Project.id.in_(accessible),
            Project.status == 'active'
        ).limit(6).all()

    result = []
    now = datetime.now(timezone.utc)
    for p in projects:
        tasks = p.tasks.all()
        total = len(tasks)
        overdue_count = sum(1 for t in tasks if t.is_overdue())
        result.append({
            'id': p.id,
            'name': p.name,
            'color': p.color,
            'progress': p.get_progress(),
            'total_tasks': total,
            'overdue': overdue_count,
            'is_overdue': p.deadline and p.deadline.replace(tzinfo=timezone.utc) < now and p.status != 'completed',
        })

    return jsonify({'projects': result}), 200
