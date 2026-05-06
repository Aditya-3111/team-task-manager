import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { tasksAPI, commentsAPI, usersAPI, projectsAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { PriorityBadge, StatusBadge, Avatar, ConfirmDialog, Tag } from '../components/UI'
import { ArrowLeft, Edit, Trash2, Send, MessageSquare, Clock, Calendar, CheckCircle2, User, Tag as TagIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

const STATUSES = [
  { key: 'todo', label: 'To Do', color: '#64748b' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { key: 'done', label: 'Done', color: '#10b981' },
]

export default function TaskDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => { fetchTask(); fetchUsers() }, [id])

  const fetchTask = async () => {
    try {
      const { data } = await tasksAPI.getOne(id)
      setTask(data.task)
      setComments(data.task.comments || [])
      setEditForm({
        title: data.task.title, description: data.task.description,
        priority: data.task.priority, status: data.task.status,
        assignee_id: data.task.assignee_id || '',
        due_date: data.task.due_date ? data.task.due_date.split('T')[0] : '',
        tags: data.task.tags?.join(', ') || '',
        estimated_hours: data.task.estimated_hours || '',
      })
    } catch { toast.error('Task not found'); navigate('/tasks') }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try { const { data } = await usersAPI.getAll(); setUsers(data.users || []) } catch {}
  }

  const handleStatusChange = async (status) => {
    try {
      const { data } = await tasksAPI.updateStatus(id, status)
      setTask(data.task)
      toast.success(`Moved to ${status.replace('_', ' ')}`)
    } catch { toast.error('Failed to update status') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        assignee_id: editForm.assignee_id ? parseInt(editForm.assignee_id) : null,
        due_date: editForm.due_date || null,
        estimated_hours: editForm.estimated_hours ? parseFloat(editForm.estimated_hours) : null,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()) : [],
      }
      const { data } = await tasksAPI.update(id, payload)
      setTask(data.task)
      setEditing(false)
      toast.success('Task updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await tasksAPI.delete(id)
      toast.success('Task deleted')
      navigate('/tasks')
    } catch { toast.error('Failed to delete') }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const { data } = await commentsAPI.add(id, { content: commentText })
      setComments(p => [...p, data.comment])
      setCommentText('')
    } catch { toast.error('Failed to post comment') }
    finally { setSendingComment(false) }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsAPI.delete(commentId)
      setComments(p => p.filter(c => c.id !== commentId))
    } catch { toast.error('Failed to delete comment') }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )
  if (!task) return null

  const canEdit = isAdmin || task.creator_id === user?.id || task.assignee_id === user?.id
  const set = k => e => setEditForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tasks" className="w-9 h-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/projects/${task.project?.id}`} className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1">
            {task.project?.name}
          </Link>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => setEditing(!editing)} className="btn-secondary text-sm">
              <Edit size={14} /> {editing ? 'Cancel' : 'Edit'}
            </button>
          )}
          {(isAdmin || task.creator_id === user?.id) && (
            <button onClick={() => setShowDelete(true)} className="btn-danger text-sm">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="card p-6">
        {/* Title */}
        {editing ? (
          <input value={editForm.title} onChange={set('title')}
            className="input text-xl font-display font-bold mb-4 py-3" />
        ) : (
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 cursor-pointer transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-emerald-500'}`}
              onClick={() => handleStatusChange(task.status === 'done' ? 'in_progress' : 'done')}>
              {task.status === 'done' && <CheckCircle2 size={16} className="text-white" />}
            </div>
            <h1 className={`font-display font-bold text-2xl leading-tight ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
              {task.title}
            </h1>
          </div>
        )}

        {/* Status pills */}
        {!editing && (
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => handleStatusChange(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${task.status === s.key
                  ? 'text-white border-transparent' : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:border-white/20'}`}
                style={task.status === s.key ? { backgroundColor: s.color, borderColor: s.color } : {}}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <label className="label">Description</label>
          {editing ? (
            <textarea value={editForm.description} onChange={set('description')}
              rows={5} className="input resize-none" placeholder="Add a description..." />
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {task.description || <span className="text-slate-600 italic">No description</span>}
            </p>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-white/[0.06]">
          <div>
            <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><User size={11} /> Assignee</p>
            {editing ? (
              <select value={editForm.assignee_id} onChange={set('assignee_id')} className="input text-xs py-1.5">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : task.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar user={task.assignee} size="xs" />
                <span className="text-sm text-white">{task.assignee.name}</span>
              </div>
            ) : <span className="text-sm text-slate-600">Unassigned</span>}
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><TagIcon size={11} /> Priority</p>
            {editing ? (
              <select value={editForm.priority} onChange={set('priority')} className="input text-xs py-1.5">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            ) : <PriorityBadge priority={task.priority} />}
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><Calendar size={11} /> Due Date</p>
            {editing ? (
              <input type="date" value={editForm.due_date} onChange={set('due_date')} className="input text-xs py-1.5" />
            ) : task.due_date ? (
              <span className={`text-sm ${task.is_overdue ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                {format(new Date(task.due_date), 'MMM d, yyyy')}
                {task.is_overdue && ' ⚠'}
              </span>
            ) : <span className="text-slate-600 text-sm">—</span>}
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><Clock size={11} /> Est. Hours</p>
            {editing ? (
              <input type="number" value={editForm.estimated_hours} onChange={set('estimated_hours')}
                placeholder="0" min="0" step="0.5" className="input text-xs py-1.5" />
            ) : <span className="text-sm text-slate-300">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</span>}
          </div>
        </div>

        {/* Tags */}
        {(editing || task.tags?.length > 0) && (
          <div className="mt-4">
            <label className="label">Tags</label>
            {editing ? (
              <input value={editForm.tags} onChange={set('tags')} placeholder="bug, feature, ux" className="input" />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {task.tags?.map(tag => <Tag key={tag}>{tag}</Tag>)}
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        {editing && (
          <div className="mt-5 flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 px-1">
        <span>Created by <span className="text-slate-300">{task.creator?.name}</span></span>
        <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
        {task.completed_at && <span className="text-emerald-400">✓ Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}</span>}
      </div>

      {/* Comments */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
          <MessageSquare size={16} className="text-slate-400" />
          Comments ({comments.length})
        </h3>

        <div className="space-y-4 mb-5">
          {comments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No comments yet. Be the first!</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <Avatar user={c.author} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{c.author?.name}</span>
                    <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    {(c.user_id === user?.id || isAdmin) && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 ml-auto text-slate-500 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-3 text-sm text-slate-300 leading-relaxed border border-white/[0.06]">
                    {c.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment form */}
        <form onSubmit={handleComment} className="flex gap-3">
          <Avatar user={user} size="sm" />
          <div className="flex-1 relative">
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..." rows={2}
              className="input resize-none pr-12 text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleComment(e) }} />
            <button type="submit" disabled={!commentText.trim() || sendingComment}
              className="absolute right-2.5 bottom-2.5 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-all">
              {sendingComment ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} className="text-white" />}
            </button>
          </div>
        </form>
        <p className="text-[11px] text-slate-600 mt-1.5 ml-12">Ctrl + Enter to submit</p>
      </div>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)}
        onConfirm={handleDelete} danger title="Delete Task"
        message={`Delete "${task.title}"? This cannot be undone.`} confirmText="Delete Task" />
    </div>
  )
}
