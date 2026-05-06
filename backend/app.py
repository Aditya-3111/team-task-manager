import os
from flask import Flask, jsonify
from flask_cors import CORS
from extensions import db, jwt, migrate
from config import config


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # CORS
    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:5173')
    CORS(app, resources={
        r"/api/*": {
            "origins": ["*"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({'error': 'Token has expired', 'code': 'token_expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'code': 'invalid_token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization required', 'code': 'authorization_required'}), 401

    # Register blueprints
    from routes.auth import auth_bp
    from routes.projects import projects_bp
    from routes.tasks import tasks_bp
    from routes.users import users_bp
    from routes.dashboard import dashboard_bp
    from routes.comments import comments_bp
    from routes.notifications import notifications_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(comments_bp, url_prefix='/api/comments')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    # Health check
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'Team Task Manager API is running'}), 200

    # Create tables
    with app.app_context():
        db.create_all()
        seed_admin(app)

    return app


def seed_admin(app):
    """Create default admin user if no users exist"""
    with app.app_context():
        from models import User
        if User.query.count() == 0:
            admin = User(
                name='Admin User',
                email='admin@teamtask.com',
                role='admin',
                avatar_color='#3b82f6',
                bio='System Administrator'
            )
            admin.set_password('Admin@123')
            db.session.add(admin)

            # Add sample member
            member = User(
                name='Jane Smith',
                email='jane@teamtask.com',
                role='member',
                avatar_color='#10b981',
                bio='Frontend Developer'
            )
            member.set_password('Member@123')
            db.session.add(member)
            db.session.commit()
            print("✅ Default users created: admin@teamtask.com / Admin@123")
@app.route("/api/health")
def health():
    return {"status": "ok"}, 200

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
