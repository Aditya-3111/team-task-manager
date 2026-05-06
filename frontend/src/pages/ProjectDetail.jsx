import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { projectsAPI, tasksAPI, usersAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Modal, PriorityBadge, StatusBadge, ProjectStatusBadge, Avatar, ProgressBar, ConfirmDialog, EmptyState } from '../components/UI'
import { ArrowLeft, Plus, Users, Calendar, Trash2, UserPlus, CheckSquare, LayoutGrid, List, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

const STATUSES = [
  { key: 'todo', label: 'To Do', color: '#64748b' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { key: 'done', label: 'Done', color: '#10b981' },
]

function TaskCard({ task, onStatusChange, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const statusColors = { todo: '#64748b', in_progress: '#3b82f6', in_review: '#8b5cf6', done: '#10b981' }

  return (
    <Link to={`/tasks/${task.id}`}
      className="block card p-4 hover:border-white/[0.14] transition-all group cursor-pointer animate-slide-up">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm text-white font-medium leading-snug group-hover:text-blue-300 transition-colors">{task.title}</p>
        <button onClick={e => { e.preventDefault(); onDelete(task) }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all flex-shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <PriorityBadge priority={task.priority} />
        {task.is_overdue && (
          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">⚠ Overdue</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <Avatar user={task.assignee} size="xs" />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-dashed border-white/20 flex items-center justify-center">
              <Users size={10} className="text-slate-600" />
            </div>
          )}
          {task.due_date && (
            <span className={`text-[11px] ${task.is_overdue ? 'text-red-400' : 'text-slate-500'}`}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {STATUSES.filter(s => s.key !== task.status).map(s => (
            <button key={s.key} onClick={e => { e.preventDefault(); onStatusChange(task.id, s.key) }}
              title={`Move to ${s.label}`}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
              style={{ backgroundColor: s.color + '20' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            </button>
          ))}
        </div>
      </div>
    </Link>
  )
}

function KanbanColumn({ status, tasks, onStatusChange, onDelete, onAddTask }) {
  return (
    <div className="flex-1 min-w-[260px] max-w-[320px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="text-sm font-semibold text-slate-300">{status.label}</span>
          <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full text-slate-400">{tasks.length}</span>
        </div>
        <button onClick={() => onAddTask(status.key)}
          className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white transition-all">
          <Plus size={14} />
        </button>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

function CreateTaskModal({ open, onClose, onSubmit, projectId, members, defaultStatus = 'todo' }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: defaultStatus, assignee_id: '', due_date: '', estimated_hours: '', tags: '' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => { if (open) setForm(p => ({ ...p, status: defaultStatus })) }, [open, defaultStatus])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        project_id: projectId,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      }
      await onSubmit(payload)
      setForm({ title: '', description: '', priority: 'medium', status: defaultStatus, assignee_id: '', due_date: '', estimated_hours: '', tags: '' })
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Task" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="label">Task Title *</label>
          <input value={form.title} onChange={set('title')} placeholder="What needs to be done?" className="input" required minLength={2} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={form.description} onChange={set('description')} placeholder="Add details..." rows={3} className="input resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priority</label>
            <select value={form.priority} onChange={set('priority')} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={set('status')} className="input">
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assign To</label>
            <select value={form.assignee_id} onChange={set('assignee_id')} className="input">
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.user?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" value={form.due_date} onChange={set('due_date')} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Est. Hours</label>
            <input type="number" value={form.estimated_hours} onChange={set('estimated_hours')} placeholder="0" min="0" step="0.5" className="input" />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input value={form.tags} onChange={set('tags')} placeholder="bug, feature, ux" className="input" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [showAddTask, setShowAddTask] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('todo')
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activity, setActivity] = useState([])

  useEffect(() => { fetchProject(); fetchTasks(); fetchActivity() }, [id])

  const fetchProject = async () => {
    try {
      const { data } = await projectsAPI.getOne(id)
      setProject(data.project)
    } catch { toast.error('Project not found'); navigate('/projects') }
    finally { setLoading(false) }
  }

  const fetchTasks = async () => {
    try {
      const { data } = await projectsAPI.getTasks(id)
      setTasks(data.tasks || [])
    } catch {}
  }

  const fetchActivity = async () => {
    try {
      const { data } = await projectsAPI.getActivity(id)
      setActivity(data.activities || [])
    } catch {}
  }

  const handleCreateTask = async (payload) => {
    try {
      const { data } = await tasksAPI.create(payload)
      setTasks(p => [data.task, ...p])
      setShowAddTask(false)
      toast.success('Task created!')
      fetchProject()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task')
    }
  }

  const handleStatusChange = async (taskId, status) => {
    try {
      const { data } = await tasksAPI.updateStatus(taskId, status)
      setTasks(p => p.map(t => t.id === taskId ? data.task : t))
      fetchProject()
    } catch { toast.error('Failed to update status') }
  }

  const handleDeleteTask = async () => {
    try {
      await tasksAPI.delete(deleteTarget.id)
      setTasks(p => p.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Task deleted')
      fetchProject()
    } catch { toast.error('Failed to delete task') }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    try {
      const { data } = await projectsAPI.addMember(id, { email: memberEmail, role: memberRole })
      setProject(p => ({ ...p, members: [...p.members, data.member] }))
      setMemberEmail('')
      setShowAddMember(false)
      toast.success('Member added!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      await projectsAPI.removeMember(id, memberId)
      setProject(p => ({ ...p, members: p.members.filter(m => m.user_id !== memberId) }))
      toast.success('Member removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member')
    }
  }

  const tasksByStatus = (status) => tasks.filter(t => t.status === status)

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="flex gap-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-48 flex-1 rounded-2xl" />)}</div>
    </div>
  )

  if (!project) return null

  const isOwnerOrAdmin = isAdmin || project.owner_id === user?.id
  const canEdit = isOwnerOrAdmin || project.members?.some(m => m.user_id === user?.id && m.role === 'admin')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/projects" className="w-9 h-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all mt-0.5">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            </div>
            <h1 className="font-display font-bold text-2xl text-white">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && <p className="text-slate-400 text-sm mt-1 ml-11">{project.description}</p>}
        </div>
        {canEdit && (
          <button onClick={() => { setDefaultStatus('todo'); setShowAddTask(true) }} className="btn-primary flex-shrink-0">
            <Plus size={16} /> Add Task
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.map(s => {
          const count = tasksByStatus(s.key).length
          return (
            <div key={s.key} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + '15' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-white">{count}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">Overall Progress</span>
          <span className="font-display font-bold text-lg" style={{ color: project.color }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={project.color} size="lg" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">{tasks.filter(t => t.status === 'done').length} of {tasks.length} tasks completed</span>
          {project.deadline && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={11} /> {format(new Date(project.deadline), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
          <button onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <LayoutGrid size={14} /> Kanban
          </button>
          <button onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <List size={14} /> List
          </button>
        </div>

        {/* Members */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {project.members?.slice(0, 4).map(m => (
              <div key={m.id} title={m.user?.name}><Avatar user={m.user} size="sm" /></div>
            ))}
            {project.members?.length > 4 && (
              <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs text-slate-400">
                +{project.members.length - 4}
              </div>
            )}
          </div>
          {canEdit && (
            <button onClick={() => setShowAddMember(true)} className="btn-secondary text-xs py-1.5 px-3">
              <UserPlus size={13} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map(s => (
              <KanbanColumn key={s.key} status={s}
                tasks={tasksByStatus(s.key)}
                onStatusChange={handleStatusChange}
                onDelete={setDeleteTarget}
                onAddTask={(st) => { setDefaultStatus(st); setShowAddTask(true) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Task', 'Assignee', 'Status', 'Priority', 'Due Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">No tasks yet</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                  <td className="px-4 py-3">
                    <Link to={`/tasks/${task.id}`} className="text-white hover:text-blue-300 transition-colors font-medium">{task.title}</Link>
                    {task.is_overdue && <span className="text-red-400 text-xs ml-2">⚠ Overdue</span>}
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2"><Avatar user={task.assignee} size="xs" /><span className="text-slate-300">{task.assignee.name}</span></div>
                    ) : <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3 text-slate-400">
                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteTarget(task)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Members Panel */}
      {project.members?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> Team Members ({project.members.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
                <Avatar user={m.user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{m.role}</p>
                </div>
                {canEdit && m.user_id !== project.owner_id && (
                  <button onClick={() => handleRemoveMember(m.user_id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activity.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {activity.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar user={a.user} size="xs" />
                <div>
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold text-white">{a.user?.name}</span>{' '}
                    {a.action.replace(/_/g, ' ')}{' '}
                    <span className="text-slate-400">"{a.entity_name}"</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal open={showAddTask} onClose={() => setShowAddTask(false)}
        onSubmit={handleCreateTask} projectId={parseInt(id)}
        members={project.members || []} defaultStatus={defaultStatus} />

      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add Team Member" size="sm">
        <form onSubmit={handleAddMember} className="p-6 space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)}
              placeholder="team@example.com" className="input" required />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={memberRole} onChange={e => setMemberRole(e.target.value)} className="input">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddMember(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary"><UserPlus size={15} /> Add Member</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTask} danger
        title="Delete Task"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Task" />
    </div>
  )
}
