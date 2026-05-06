import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { projectsAPI, usersAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Modal, ProjectStatusBadge, PriorityBadge, ProgressBar, EmptyState, ConfirmDialog } from '../components/UI'
import { FolderKanban, Plus, Search, Trash2, Edit, Users, Calendar, ArrowRight, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

function ProjectForm({ initial, onSubmit, loading, users }) {
  const [form, setForm] = useState(initial || {
    name: '', description: '', priority: 'medium', status: 'active',
    color: '#3b82f6', deadline: '', member_ids: []
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="p-6 space-y-4">
      <div>
        <label className="label">Project Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="My Awesome Project"
          className="input" required minLength={2} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea value={form.description} onChange={set('description')}
          placeholder="What's this project about?" rows={3}
          className="input resize-none" />
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
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Deadline</label>
        <input type="date" value={form.deadline} onChange={set('deadline')} className="input" />
      </div>
      <div>
        <label className="label">Color Tag</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
              className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="pt-2 flex justify-end gap-3">
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}

function ProjectCard({ project, onDelete, onEdit, isAdmin }) {
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed'
  return (
    <div className="card-hover p-5 group flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: project.color + '20', border: `1px solid ${project.color}40` }}>
          <FolderKanban size={18} style={{ color: project.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/projects/${project.id}`}
            className="font-display font-semibold text-white hover:text-blue-300 transition-colors truncate block">
            {project.name}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.description || 'No description'}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(project)}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <Edit size={13} />
          </button>
          {(isAdmin || true) && (
            <button onClick={() => onDelete(project)}
              className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Progress</span>
          <span className="text-xs font-semibold" style={{ color: project.color }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={project.color} size="md" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <ProjectStatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
        {isOverdue && (
          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">⚠ Overdue</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users size={12} /> {project.member_count}
          </span>
          <span className="flex items-center gap-1">
            <FolderKanban size={12} /> {project.task_count} tasks
          </span>
        </div>
        {project.deadline && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
            <Calendar size={12} /> {format(new Date(project.deadline), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      <Link to={`/projects/${project.id}`}
        className="flex items-center justify-between text-xs text-blue-400 hover:text-blue-300 transition-colors mt-auto pt-1">
        <span>Open project</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  )
}

export default function Projects() {
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [users, setUsers] = useState([])

  useEffect(() => { fetchProjects(); fetchUsers() }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const { data } = await projectsAPI.getAll()
      setProjects(data.projects || [])
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try { const { data } = await usersAPI.getAll(); setUsers(data.users || []) } catch {}
  }

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      const payload = { ...form, deadline: form.deadline || null }
      const { data } = await projectsAPI.create(payload)
      setProjects(p => [data.project, ...p])
      setShowCreate(false)
      toast.success('Project created!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project')
    } finally { setSaving(false) }
  }

  const handleEdit = async (form) => {
    setSaving(true)
    try {
      const { data } = await projectsAPI.update(editProject.id, form)
      setProjects(p => p.map(x => x.id === editProject.id ? data.project : x))
      setEditProject(null)
      toast.success('Project updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update project')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await projectsAPI.delete(deleteTarget.id)
      setProjects(p => p.filter(x => x.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Project deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete project')
    }
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} total projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..." className="input pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-500" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input w-40">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex gap-3"><div className="w-10 h-10 skeleton rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 rounded-lg" /><div className="skeleton h-3 w-2/3 rounded-lg" /></div></div>
              <div className="skeleton h-2 rounded-full" />
              <div className="flex gap-2"><div className="skeleton h-5 w-16 rounded-lg" /><div className="skeleton h-5 w-14 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found"
          description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first project to get started'}
          action={!search && !statusFilter && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={15} /> Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} isAdmin={isAdmin}
              onDelete={setDeleteTarget} onEdit={setEditProject} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="md">
        <ProjectForm onSubmit={handleCreate} loading={saving} users={users} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project" size="md">
        {editProject && (
          <ProjectForm initial={{
            name: editProject.name, description: editProject.description,
            priority: editProject.priority, status: editProject.status,
            color: editProject.color,
            deadline: editProject.deadline ? editProject.deadline.split('T')[0] : '',
          }} onSubmit={handleEdit} loading={saving} users={users} />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} danger
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All tasks inside will also be deleted.`}
        confirmText="Delete Project" />
    </div>
  )
}
