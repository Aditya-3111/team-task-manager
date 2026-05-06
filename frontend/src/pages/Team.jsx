import { useState, useEffect } from 'react'
import { usersAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Avatar, Modal, ConfirmDialog, EmptyState } from '../components/UI'
import { Users, Search, Shield, UserCheck, UserX, Edit, BarChart2, Mail, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

function UserCard({ member, currentUser, isAdmin, onEdit, onToggleActive }) {
  const isMe = member.id === currentUser?.id
  const stats = member.stats || {}

  return (
    <div className={`card p-5 flex flex-col gap-4 transition-all ${!member.is_active ? 'opacity-50' : 'hover:border-white/[0.12]'}`}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar user={member} size="lg" />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${member.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-white">{member.name}</h3>
            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">You</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Mail size={11} className="text-slate-500" />
            <span className="text-xs text-slate-400 truncate">{member.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge border ${member.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
            {member.role === 'admin' ? <Shield size={10} /> : <UserCheck size={10} />}
            {member.role}
          </span>
        </div>
      </div>

      {member.bio && (
        <p className="text-xs text-slate-500 leading-relaxed">{member.bio}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Projects', value: stats.projects || 0, color: '#3b82f6' },
          { label: 'Tasks', value: stats.total_tasks || 0, color: '#8b5cf6' },
          { label: 'Done', value: stats.completed_tasks || 0, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center border border-white/[0.06]">
            <div className="font-display font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-white/[0.04]">
        <span className="flex items-center gap-1">
          <Calendar size={10} /> Joined {format(new Date(member.created_at), 'MMM yyyy')}
        </span>
        <span>Last seen {formatDistanceToNow(new Date(member.last_seen), { addSuffix: true })}</span>
      </div>

      {/* Admin actions */}
      {isAdmin && !isMe && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onEdit(member)}
            className="flex-1 btn-secondary text-xs py-1.5 justify-center">
            <Edit size={12} /> Edit
          </button>
          <button onClick={() => onToggleActive(member)}
            className={`flex-1 text-xs py-1.5 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all ${member.is_active
              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
            {member.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Team() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [toggleTarget, setToggleTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [teamStats, setTeamStats] = useState(null)

  useEffect(() => { fetchUsers(); if (isAdmin) fetchTeamStats() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await usersAPI.getAll()
      setUsers(data.users || [])
    } catch { toast.error('Failed to load team') }
    finally { setLoading(false) }
  }

  const fetchTeamStats = async () => {
    try { const { data } = await usersAPI.getStats(); setTeamStats(data) } catch {}
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await usersAPI.update(editTarget.id, editForm)
      setUsers(p => p.map(u => u.id === editTarget.id ? data.user : u))
      setEditTarget(null)
      toast.success('User updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async () => {
    try {
      const { data } = await usersAPI.toggleActive(toggleTarget.id)
      setUsers(p => p.map(u => u.id === toggleTarget.id ? data.user : u))
      setToggleTarget(null)
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    }
  }

  const openEdit = (member) => {
    setEditTarget(member)
    setEditForm({ name: member.name, bio: member.bio || '', role: member.role, avatar_color: member.avatar_color })
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl text-white">Team</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} members</p>
        </div>
      </div>

      {/* Team stats (admin) */}
      {isAdmin && teamStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Members', value: teamStats.total, color: '#3b82f6' },
            { label: 'Admins', value: teamStats.admins, color: '#8b5cf6' },
            { label: 'Active', value: teamStats.active, color: '#10b981' },
            { label: 'Inactive', value: teamStats.inactive, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="font-display font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..." className="input pl-9" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-36">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex gap-3"><div className="w-11 h-11 skeleton rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-32 rounded-lg" /><div className="skeleton h-3 w-24 rounded-lg" /></div></div>
              <div className="grid grid-cols-3 gap-2">{[1,2,3].map(j => <div key={j} className="skeleton h-14 rounded-xl" />)}</div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No members found" description="Try adjusting your search" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <UserCard key={member.id} member={member} currentUser={user} isAdmin={isAdmin}
              onEdit={openEdit} onToggleActive={setToggleTarget} />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Team Member" size="sm">
        <form onSubmit={handleEdit} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea value={editForm.bio || ''} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
              rows={3} className="input resize-none" placeholder="Brief bio..." />
          </div>
          {isAdmin && (
            <div>
              <label className="label">Role</label>
              <select value={editForm.role || 'member'} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="input">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <div>
            <label className="label">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setEditForm(p => ({ ...p, avatar_color: c }))}
                  className={`w-7 h-7 rounded-lg transition-all ${editForm.avatar_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Toggle Active confirm */}
      <ConfirmDialog open={!!toggleTarget} onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive} danger={toggleTarget?.is_active}
        title={toggleTarget?.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${toggleTarget?.is_active ? 'deactivate' : 'activate'} ${toggleTarget?.name}?`}
        confirmText={toggleTarget?.is_active ? 'Deactivate' : 'Activate'} />
    </div>
  )
}
