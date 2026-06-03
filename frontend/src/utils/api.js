import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'https://team-task-manager-production-e0cb.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          })
          const { access_token } = res.data
          localStorage.setItem('access_token', access_token)
          original.headers.Authorization = `Bearer ${access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
}

// Projects
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getTasks: (id, params) => api.get(`/projects/${id}/tasks`, { params }),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getActivity: (id) => api.get(`/projects/${id}/activity`),
}

// Tasks
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
}

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleActive: (id) => api.post(`/users/${id}/deactivate`),
  getStats: () => api.get('/users/stats/overview'),
}

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getMyTasks: () => api.get('/dashboard/my-tasks'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getOverdueTasks: () => api.get('/dashboard/overdue-tasks'),
  getCompletionChart: () => api.get('/dashboard/task-completion-chart'),
  getProjectHealth: () => api.get('/dashboard/project-health'),
}

// Comments
export const commentsAPI = {
  getByTask: (taskId) => api.get(`/comments/task/${taskId}`),
  add: (taskId, data) => api.post(`/comments/task/${taskId}`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
}

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}
