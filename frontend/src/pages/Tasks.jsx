import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { tasksAPI, projectsAPI, usersAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { PriorityBadge, StatusBadge, Avatar, EmptyState, ConfirmDialog, Modal } from '../components/UI'
import { CheckSquare, Plus, Search, Filter, Trash2, Edit, ArrowUpDown, AlertTriangle, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function TaskRow({ task, onDelete, onStatusChange }) {
  const [updating, setUpdating] = useState(false)

  const handleStatus = async (newStatus) => {
    setUpdating(true)
    await onStatusChange(task.id, newStatus)
    setUpdating(false)
  }

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group">
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${task.is_overdue ? 'bg-red-400 animate-pulse' : 'bg-slate-600'}`} />
          <div>
            <Link to={`/tasks/${task.id}`}
              className="text-white font-medium hover:text-blue-300 transition-colors text-sm">{task.title}</Link>
            {task.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xs">{task.description}</p>
            )}
            {task.tags?.length > 0 && (
              <div className="flex gap-1 mt-1">
                {task.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-slate-400">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Link to={`/projects/${task.project?.id}`} className="text-sm text-slate-400 hover:text-white transition-colors">
          <div className="flex items-center gap-2">
            {task.project && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.project.color }} />}
            <span className="truncate max-w-[120px]">{task.project?.name || '—'}</span>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3.5">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar user={task.assignee} size="xs" />
            <span className="text-sm text-slate-300 truncate max-w-[100px]">{task.assignee.name}</span>
          </div>
        ) : <span className="text-slate-600 text-sm">Unassigned</span>}
      </td>
      <td className="px-4 py-3.5">
        <select value={task.status} onChange={e => handleStatus(e.target.value)}
          disabled={updating}
          className="text-xs bg-transparent border-0 cursor-pointer focus:outline-none text-slate-300">
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>
      </td>
      <td className="px-4 py-3.5"><PriorityBadge priority={task.priority} /></td>
      <td className="px-4 py-3.5">
        {task.due_date ? (
          <span className={`text-xs ${task.is_overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
            {task.is_overdue ? '⚠ ' : ''}{format(new Date(task.due_date), 'MMM d, yyyy')}
          </span>
        ) : <span className="text-slate-600 text-xs">—</span>}
      </td>
      <td className="px-4 py-3.5">
        <button onClick={() => onDelete(task)}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', project_id: '', my_tasks: false, overdue: false })
  const [sortBy, setSortBy] = useState('created_at')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [createForm, setCreateForm] = useState({ title: '', description: '', project_id: '', assignee_id: '', priority: 'medium', status: 'todo', due_date: '', tags: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTasks(); fetchProjects(); fetchUsers() }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.project_id) params.project_id = filters.project_id
      if (filters.my_tasks) params.my_tasks = true
      if (filters.overdue) params.overdue = true
      const { data } = await tasksAPI.getAll(params)
      setTasks(data.tasks || [])
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks() }, [filters])

  const fetchProjects = async () => {
    try { const { data } = await projectsAPI.getAll(); setProjects(data.projects || []) } catch {}
  }

  const fetchUsers = async () => {
    try { const { data } = await usersAPI.getAll(); setUsers(data.users || []) } catch {}
  }

  const handleStatusChange = async (taskId, status) => {
    try {
      const { data } = await tasksAPI.updateStatus(taskId, status)
      setTasks(p => p.map(t => t.id === taskId ? data.task : t))
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async () => {
    try {
      await tasksAPI.delete(deleteTarget.id)
      setTasks(p => p.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Task deleted')
    } catch { toast.error('Failed to delete') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...createForm,
        project_id: parseInt(createForm.project_id),
        assignee_id: createForm.assignee_id ? parseInt(createForm.assignee_id) : null,
        due_date: createForm.due_date || null,
        tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()) : []
      }
      const { data } = await tasksAPI.create(payload)
      setTasks(p => [data.task, ...p])
      setShowCreate(false)
      setCreateForm({ title: '', description: '', project_id: '', assignee_id: '', priority: 'medium', status: 'todo', due_date: '', tags: '' })
      toast.success('Task created!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task')
    } finally { setSaving(false) }
  }

  const setFilter = k => v => setFilters(p => ({ ...p, [k]: v }))

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (sortBy === 'due_date') return (a.due_date || 'z') < (b.due_date || 'z') ? -1 : 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const overdueCount = tasks.filter(t => t.is_overdue).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {filtered.length} tasks{overdueCount > 0 && <span className="text-red-400"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..." className="input pl-8 text-sm py-2" />
        </div>
        <select value={filters.status} onChange={e => setFilter('status')(e.target.value)} className="input w-36 text-sm py-2">
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.priority} onChange={e => setFilter('priority')(e.target.value)} className="input w-36 text-sm py-2">
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filters.project_id} onChange={e => setFilter('project_id')(e.target.value)} className="input w-40 text-sm py-2">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setFilter('my_tasks')(!filters.my_tasks)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${filters.my_tasks ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white'}`}>
            <User size={12} /> My Tasks
          </button>
          <button onClick={() => setFilter('overdue')(!filters.overdue)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${filters.overdue ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white'}`}>
            <AlertTriangle size={12} /> Overdue
          </button>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input w-36 text-sm py-2">
          <option value="created_at">Newest First</option>
          <option value="priority">By Priority</option>
          <option value="due_date">By Due Date</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4 p-4 border-b border-white/[0.04]">
              <div className="skeleton h-4 flex-1 rounded-lg" />
              <div className="skeleton h-4 w-24 rounded-lg" />
              <div className="skeleton h-4 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found"
          description="Create a task or adjust your filters"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={15} /> Create Task</button>}
        />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {['Task', 'Project', 'Assignee', 'Status', 'Priority', 'Due Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(task => (
                <TaskRow key={task.id} task={task} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Task" size="md">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What needs to be done?" className="input" required minLength={2} />
          </div>
          <div>
            <label className="label">Project *</label>
            <select value={createForm.project_id} onChange={e => setCreateForm(p => ({ ...p, project_id: e.target.value }))}
              className="input" required>
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
              rows={3} className="input resize-none" placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select value={createForm.priority} onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value }))} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select value={createForm.assignee_id} onChange={e => setCreateForm(p => ({ ...p, assignee_id: e.target.value }))} className="input">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={createForm.due_date} onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Tags</label>
              <input value={createForm.tags} onChange={e => setCreateForm(p => ({ ...p, tags: e.target.value }))} placeholder="bug, feature" className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} danger title="Delete Task"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmText="Delete" />
    </div>
  )
}
