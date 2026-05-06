from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone
from extensions import db
from models import User, Notification

auth_bp = Blueprint('auth', __name__)


def validate_email(email):
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Validation
    errors = {}
    if not data.get('name') or len(data['name'].strip()) < 2:
        errors['name'] = 'Name must be at least 2 characters'
    if not data.get('email') or not validate_email(data['email']):
        errors['email'] = 'Valid email is required'
    if not data.get('password') or len(data['password']) < 6:
        errors['password'] = 'Password must be at least 6 characters'

    if errors:
        return jsonify({'errors': errors}), 422

    # Check existing user
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'errors': {'email': 'Email already registered'}}), 422

    # Determine role - first user becomes admin
    role = 'admin' if User.query.count() == 0 else data.get('role', 'member')

    # Avatar colors pool
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    color = colors[User.query.count() % len(colors)]

    user = User(
        name=data['name'].strip(),
        email=data['email'].lower().strip(),
        role=role,
        avatar_color=color,
        bio=data.get('bio', '')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    # Welcome notification
    notif = Notification(
        user_id=user.id,
        title='Welcome to TeamTask! 🎉',
        message=f'Hi {user.name}, your account has been created successfully.',
        type='success'
    )
    db.session.add(notif)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Account created successfully',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 422

    user = User.query.filter_by(email=data['email'].lower().strip()).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact admin.'}), 403

    # Update last seen
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(include_stats=True),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'user': user.to_dict(include_stats=True)}), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'bio' in data:
        user.bio = data['bio']
    if 'avatar_color' in data:
        user.avatar_color = data['avatar_color']
    if 'current_password' in data and 'new_password' in data:
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200
