import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      setErrors({ general: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@teamtask.com', password: 'Admin@123' })
    else setForm({ email: 'jane@teamtask.com', password: 'Member@123' })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-slate-900 via-blue-950/20 to-slate-950 p-12 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-glow-blue">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl">TeamTask</span>
          </div>

          <div className="max-w-md">
            <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
              Your team's
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> command center</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Manage projects, assign tasks, and track progress — all in one elegant workspace.
            </p>
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap gap-3">
            {['Role-based access', 'Real-time progress', 'Task analytics', 'Team collaboration'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-400">
                ✦ {f}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="absolute bottom-12 right-12 left-12 card p-5 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Live dashboard preview</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{label: 'Active Projects', val: '12', color: '#3b82f6'}, {label: 'Tasks Done', val: '87%', color: '#10b981'}, {label: 'Overdue', val: '3', color: '#ef4444'}].map(s => (
              <div key={s.label} className="bg-white/[0.04] rounded-xl p-3">
                <div className="font-display font-bold text-xl" style={{ color: s.color }}>{s.val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-col justify-center flex-1 max-w-md mx-auto w-full px-8 py-12">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">TeamTask</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-2">Sign in</h1>
          <p className="text-slate-400">Welcome back to your workspace</p>
        </div>

        {/* Demo credentials */}
        <div className="mb-6 p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/20">
          <p className="text-xs text-blue-400 font-semibold mb-2">🔑 Demo Credentials</p>
          <div className="flex gap-2">
            <button onClick={() => fillDemo('admin')}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all">
              Admin Account
            </button>
            <button onClick={() => fillDemo('member')}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all">
              Member Account
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                className="input pl-10" required />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="input pl-10 pr-10" required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-3 mt-2 disabled:opacity-60">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
