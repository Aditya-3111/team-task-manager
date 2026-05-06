from datetime import datetime, timezone
from extensions import db
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'member'), default='member', nullable=False)
    avatar_color = db.Column(db.String(20), default='#3b82f6')
    bio = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    owned_projects = db.relationship('Project', foreign_keys='Project.owner_id', backref='owner', lazy='dynamic')
    project_memberships = db.relationship('ProjectMember', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    assigned_tasks = db.relationship('Task', foreign_keys='Task.assignee_id', backref='assignee', lazy='dynamic')
    created_tasks = db.relationship('Task', foreign_keys='Task.creator_id', backref='creator', lazy='dynamic')
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_stats=False):
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'avatar_color': self.avatar_color,
            'bio': self.bio,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
        }
        if include_stats:
            data['stats'] = {
                'total_tasks': self.assigned_tasks.count(),
                'completed_tasks': self.assigned_tasks.filter_by(status='done').count(),
                'projects': self.project_memberships.count(),
            }
        return data


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default='')
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.Enum('active', 'on_hold', 'completed', 'archived'), default='active')
    priority = db.Column(db.Enum('low', 'medium', 'high', 'critical'), default='medium')
    color = db.Column(db.String(20), default='#3b82f6')
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    members = db.relationship('ProjectMember', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    tasks = db.relationship('Task', backref='project', lazy='dynamic', cascade='all, delete-orphan')

    def get_progress(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        done = self.tasks.filter_by(status='done').count()
        return round((done / total) * 100)

    def to_dict(self, include_members=False, include_stats=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'owner_id': self.owner_id,
            'owner': self.owner.to_dict() if self.owner else None,
            'status': self.status,
            'priority': self.priority,
            'color': self.color,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'progress': self.get_progress(),
            'task_count': self.tasks.count(),
            'member_count': self.members.count(),
        }
        if include_members:
            data['members'] = [m.to_dict() for m in self.members.all()]
        if include_stats:
            data['stats'] = {
                'todo': self.tasks.filter_by(status='todo').count(),
                'in_progress': self.tasks.filter_by(status='in_progress').count(),
                'in_review': self.tasks.filter_by(status='in_review').count(),
                'done': self.tasks.filter_by(status='done').count(),
                'overdue': sum(1 for t in self.tasks.all() if t.is_overdue()),
            }
        return data


class ProjectMember(db.Model):
    __tablename__ = 'project_members'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.Enum('admin', 'member', 'viewer'), default='member')
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint('project_id', 'user_id', name='unique_project_member'),)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.Enum('todo', 'in_progress', 'in_review', 'done'), default='todo')
    priority = db.Column(db.Enum('low', 'medium', 'high', 'critical'), default='medium')
    due_date = db.Column(db.DateTime, nullable=True)
    estimated_hours = db.Column(db.Float, nullable=True)
    tags = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    comments = db.relationship('Comment', backref='task', lazy='dynamic', cascade='all, delete-orphan')

    def is_overdue(self):
        if self.due_date and self.status != 'done':
            return datetime.now(timezone.utc) > self.due_date.replace(tzinfo=timezone.utc)
        return False

    def to_dict(self, include_comments=False):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'project_id': self.project_id,
            'project': {'id': self.project.id, 'name': self.project.name, 'color': self.project.color} if self.project else None,
            'assignee_id': self.assignee_id,
            'assignee': self.assignee.to_dict() if self.assignee else None,
            'creator_id': self.creator_id,
            'creator': self.creator.to_dict() if self.creator else None,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'estimated_hours': self.estimated_hours,
            'tags': self.tags.split(',') if self.tags else [],
            'is_overdue': self.is_overdue(),
            'comment_count': self.comments.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
        if include_comments:
            data['comments'] = [c.to_dict() for c in self.comments.order_by(Comment.created_at.asc()).all()]
        return data


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'author': self.author.to_dict() if self.author else None,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)  # 'task', 'project', 'comment'
    entity_id = db.Column(db.Integer, nullable=False)
    entity_name = db.Column(db.String(200), default='')
    project_id = db.Column(db.Integer, nullable=True)
    meta = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'entity_name': self.entity_name,
            'project_id': self.project_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, default='')
    type = db.Column(db.String(50), default='info')  # info, success, warning, error
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }