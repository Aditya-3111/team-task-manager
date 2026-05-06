# 🚀 TeamTask — Full-Stack Team Task Manager

A production-grade project & task management platform with role-based access control, real-time dashboards, Kanban boards, and team collaboration features.

---

## ✨ Features

### Core Features
- **Authentication** — JWT-based login/register with refresh tokens
- **Role-Based Access Control** — Admin & Member roles with granular permissions
- **Projects** — Create, manage, archive projects with color labels & deadlines
- **Tasks** — Full CRUD with priority levels, status tracking, tags, estimated hours
- **Kanban Board** — Drag-and-drop style task management per project
- **Team Management** — Add/remove members, manage roles, activate/deactivate users
- **Dashboard** — Live stats, charts, activity feed, overdue alerts
- **Comments** — Per-task discussion threads
- **Notifications** — In-app notifications for assignments, comments, project additions

### Extra Features
- 📊 **Task Completion Chart** — 7-day bar chart for task analytics
- 🔥 **Overdue Detection** — Automatic detection with visual alerts
- 🏷️ **Tags** — Categorize tasks with custom tags
- 🎨 **Custom Avatars** — Color-coded avatars with initials
- 🔔 **Real-time Notifications** — Bell icon with unread count
- 📱 **Responsive Design** — Works on mobile, tablet, and desktop
- 🌙 **Dark Theme** — Beautiful dark command-center aesthetic

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP Client | Axios |
| Backend | Flask (Python) |
| Database | MySQL |
| ORM | SQLAlchemy + Flask-Migrate |
| Auth | JWT (Flask-JWT-Extended) |
| Password Hash | bcrypt |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

pip install -r requirements.txt
```

### 2. Create MySQL Database

```sql
CREATE DATABASE teamtaskdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Run Backend

```bash
cd backend
python app.py
# Runs on http://localhost:5000
# Default admin: admin@teamtask.com / Admin@123
```

### 4. Setup & Run Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🌐 Deployment (Railway)

### Backend on Railway

1. Push code to GitHub
2. Create new Railway project → **Deploy from GitHub repo**
3. Add **MySQL** service (Railway provides managed MySQL)
4. Set environment variables:
   ```
   DATABASE_URL=mysql+pymysql://user:pass@host:port/dbname
   JWT_SECRET_KEY=your-secure-random-key-here
   FLASK_ENV=production
   FRONTEND_URL=https://your-frontend.railway.app
   ```
5. Set start command: `gunicorn app:create_app() --bind 0.0.0.0:$PORT`

### Frontend on Railway

1. Add new service from same repo
2. Set root directory to `frontend/`
3. Build command: `npm install && npm run build`
4. Start command: `npx serve dist -p $PORT`
5. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```

---

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── app.py              # Flask app factory + seeder
│   ├── config.py           # Config classes
│   ├── extensions.py       # SQLAlchemy, JWT, Migrate
│   ├── models.py           # All DB models
│   ├── routes/
│   │   ├── auth.py         # Login, register, profile
│   │   ├── projects.py     # Project CRUD + members
│   │   ├── tasks.py        # Task CRUD + status
│   │   ├── users.py        # User management
│   │   ├── dashboard.py    # Stats, charts, activity
│   │   ├── comments.py     # Task comments
│   │   └── notifications.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Router + auth guards
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js      # Axios + all API calls
│   │   ├── components/
│   │   │   ├── Layout.jsx  # Sidebar + navbar
│   │   │   └── UI.jsx      # Reusable components
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Projects.jsx
│   │       ├── ProjectDetail.jsx  # Kanban board
│   │       ├── Tasks.jsx
│   │       ├── TaskDetail.jsx     # Comments
│   │       ├── Team.jsx
│   │       └── Profile.jsx
│   └── package.json
└── README.md
```

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@teamtask.com | Admin@123 |
| Member | jane@teamtask.com | Member@123 |

---

## 📋 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/me | Update profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/members | Add member |
| DELETE | /api/projects/:id/members/:uid | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (with filters) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task + comments |
| PUT | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/status | Update status only |
| DELETE | /api/tasks/:id | Delete task |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Overview stats |
| GET | /api/dashboard/my-tasks | My open tasks |
| GET | /api/dashboard/recent-activity | Activity feed |
| GET | /api/dashboard/overdue-tasks | Overdue tasks |
| GET | /api/dashboard/task-completion-chart | 7-day chart data |
| GET | /api/dashboard/project-health | Project progress |

---

## 📄 License

MIT — Free to use and modify.

---

Built with ❤️ using React + Flask + MySQL
