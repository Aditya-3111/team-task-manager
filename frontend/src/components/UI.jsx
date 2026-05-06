import { X } from 'lucide-react'
import { useEffect } from 'react'

// Priority badge
export function PriorityBadge({ priority }) {
  const styles = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const dots = { low: 'bg-emerald-400', medium: 'bg-amber-400', high: 'bg-orange-400', critical: 'bg-red-400' }
  return (
    <span className={`badge border ${styles[priority] || styles.medium}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority] || dots.medium}`} />
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  )
}

// Status badge
export function StatusBadge({ status }) {
  const styles = {
    todo: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_review: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }
  const labels = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }
  return (
    <span className={`badge border ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  )
}

// Project status badge
export function ProjectStatusBadge({ status }) {
  const styles = {
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    on_hold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  const labels = { active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived' }
  return (
    <span className={`badge border ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  )
}

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${sizes[size]} w-full card shadow-2xl animate-slide-up max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto scrollbar-thin flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// Loading skeleton
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-500" />
      </div>
      <h3 className="font-display font-semibold text-slate-300 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// Progress bar
export function ProgressBar({ value, color = '#3b82f6', size = 'md' }) {
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' }
  return (
    <div className={`w-full bg-white/[0.05] rounded-full ${heights[size]} overflow-hidden`}>
      <div className={`${heights[size]} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
    </div>
  )
}

// Avatar
export function Avatar({ user, size = 'md' }) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center font-display font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: user?.avatar_color || '#3b82f6' }}>
      {initials}
    </div>
  )
}

// Confirm dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-sm w-full card p-6 shadow-2xl animate-slide-up">
        <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Select input
export function Select({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select value={value} onChange={onChange}
        className="input appearance-none cursor-pointer">
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// Tag
export function Tag({ children, color }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-300 border border-white/[0.08]">
      {children}
    </span>
  )
}
