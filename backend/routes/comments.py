from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Comment, Task, User, Activity, Notification, ProjectMember

comments_bp = Blueprint('comments', __name__)


@comments_bp.route('/task/<int:task_id>', methods=['GET'])
@jwt_required()
def get_comments(task_id):
    task = Task.query.get_or_404(task_id)
    comments = Comment.query.filter_by(task_id=task_id)\
        .order_by(Comment.created_at.asc()).all()
    return jsonify({'comments': [c.to_dict() for c in comments]}), 200


@comments_bp.route('/task/<int:task_id>', methods=['POST'])
@jwt_required()
def add_comment(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if not data.get('content') or not data['content'].strip():
        return jsonify({'error': 'Comment content is required'}), 422

    comment = Comment(
        task_id=task_id,
        user_id=user_id,
        content=data['content'].strip()
    )
    db.session.add(comment)

    # Notify task assignee
    if task.assignee_id and task.assignee_id != user_id:
        notif = Notification(
            user_id=task.assignee_id,
            title='New comment on your task',
            message=f'Someone commented on "{task.title}"',
            type='info',
            link=f'/tasks/{task.id}'
        )
        db.session.add(notif)

    # Notify task creator
    if task.creator_id and task.creator_id != user_id and task.creator_id != task.assignee_id:
        notif = Notification(
            user_id=task.creator_id,
            title='New comment on task',
            message=f'Someone commented on "{task.title}"',
            type='info',
            link=f'/tasks/{task.id}'
        )
        db.session.add(notif)

    activity = Activity(
        user_id=user_id, action='commented', entity_type='task',
        entity_id=task.id, entity_name=task.title, project_id=task.project_id
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'message': 'Comment added', 'comment': comment.to_dict()}), 201


@comments_bp.route('/<int:comment_id>', methods=['PUT'])
@jwt_required()
def update_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get_or_404(comment_id)

    if comment.user_id != user_id:
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json()
    if not data.get('content') or not data['content'].strip():
        return jsonify({'error': 'Comment content is required'}), 422

    comment.content = data['content'].strip()
    db.session.commit()

    return jsonify({'message': 'Comment updated', 'comment': comment.to_dict()}), 200


@comments_bp.route('/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get_or_404(comment_id)

    if comment.user_id != user_id:
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Permission denied'}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({'message': 'Comment deleted'}), 200
