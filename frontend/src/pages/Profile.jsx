import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'
import { Avatar } from '../components/UI'
import { User, Mail, Lock, Palette, Save, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#a855f7']

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar_color: user?.avatar_color || '#3b82f6',
  })
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setPass = k => e => setPassForm(p => ({ ...p, [k]: e.target.value }))

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await authAPI.updateMe(form)
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.new_password !== passForm.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    if (passForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSavingPass(true)
    try {
      await authAPI.updateMe({
        current_password: passForm.current_password,
        new_password: passForm.new_password
      })
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setSavingPass(false) }
  }

  const previewUser = { ...user, ...form }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your personal information</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/[0.06]">
          <Avatar user={previewUser} size="lg" />
          <div>
            <h2 className="font-display font-semibold text-xl text-white">{previewUser.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge border ${user?.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                {user?.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5"><User size={11} /> Full Name</label>
            <input value={form.name} onChange={set('name')} className="input" required minLength={2} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea value={form.bio} onChange={set('bio')} rows={3}
              placeholder="Tell your team about yourself..." className="input resize-none" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Palette size={11} /> Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, avatar_color: c }))}
                  className={`w-8 h-8 rounded-xl transition-all ${form.avatar_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={15} /> Save Profile</>}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
          <Lock size={16} className="text-slate-400" /> Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={passForm.current_password} onChange={setPass('current_password')}
              placeholder="Enter current password" className="input" required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={passForm.new_password} onChange={setPass('new_password')}
              placeholder="Min. 6 characters" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={passForm.confirm_password} onChange={setPass('confirm_password')}
              placeholder="Repeat new password" className="input" required />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={savingPass} className="btn-primary disabled:opacity-60">
              {savingPass ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock size={15} /> Update Password</>}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white mb-4">Account Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-slate-400 flex items-center gap-2"><Mail size={13} /> Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-slate-400 flex items-center gap-2"><Shield size={13} /> Role</span>
            <span className="text-white capitalize">{user?.role}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Member Since</span>
            <span className="text-white">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
