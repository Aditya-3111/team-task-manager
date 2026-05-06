from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(user_id)

    search = request.args.get('search', '')
    role = request.args.get('role')

    query = User.query
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    if role:
        query = query.filter_by(role=role)

    users = query.order_by(User.name).all()
    return jsonify({'users': [u.to_dict(include_stats=True) for u in users]}), 200


@users_bp.route('/<int:uid>', methods=['GET'])
@jwt_required()
def get_user(uid):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    return jsonify({'user': user.to_dict(include_stats=True)}), 200


@users_bp.route('/<int:uid>', methods=['PUT'])
@jwt_required()
def update_user(uid):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin' and current_user_id != uid:
        return jsonify({'error': 'Permission denied'}), 403

    user = User.query.get_or_404(uid)
    data = request.get_json()

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'bio' in data:
        user.bio = data['bio']
    if 'avatar_color' in data:
        user.avatar_color = data['avatar_color']

    # Admin-only fields
    if current_user.role == 'admin':
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']

    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()}), 200


@users_bp.route('/<int:uid>/deactivate', methods=['POST'])
@jwt_required()
def deactivate_user(uid):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    if current_user_id == uid:
        return jsonify({'error': 'Cannot deactivate your own account'}), 422

    user = User.query.get_or_404(uid)
    user.is_active = not user.is_active
    db.session.commit()

    action = 'activated' if user.is_active else 'deactivated'
    return jsonify({'message': f'User {action}', 'user': user.to_dict()}), 200


@users_bp.route('/stats/overview', methods=['GET'])
@jwt_required()
def get_team_stats():
    user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    users = User.query.all()
    return jsonify({
        'total': len(users),
        'admins': sum(1 for u in users if u.role == 'admin'),
        'members': sum(1 for u in users if u.role == 'member'),
        'active': sum(1 for u in users if u.is_active),
        'inactive': sum(1 for u in users if not u.is_active),
    }), 200
