import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notificationsAPI } from '../utils/api'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, User,
  LogOut, Bell, Menu, X, ChevronRight, Zap, Search
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/team', icon: Users, label: 'Team' },
]

function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center font-display font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: user?.avatar_color || '#3b82f6' }}>
      {initials}
    </div>
  )
}

export { Avatar }

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getAll()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900/95 border-r border-white/[0.06]
        flex flex-col z-50 transition-transform duration-300 backdrop-blur-xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-glow-blue/30 flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-none">TeamTask</h1>
            <p className="text-xs text-slate-500 mt-0.5">Command Center</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-2 mt-1">Menu</p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRight size={14} className="ml-auto opacity-30" />
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-2 mt-3">Admin</p>
              <NavLink to="/team"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <Users size={17} />
                <span>Manage Team</span>
                <ChevronRight size={14} className="ml-auto opacity-30" />
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/[0.06]">
          <NavLink to="/profile"
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer ${isActive ? 'bg-white/[0.06]' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
            <User size={14} className="text-slate-500 flex-shrink-0" />
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm mt-1">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navbar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 py-4 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>

          {/* Page breadcrumb */}
          <div className="flex-1">
            <h2 className="font-display font-semibold text-white text-base capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </h2>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center transition-all">
                <Bell size={16} className="text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 card shadow-2xl z-50 animate-slide-up overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="font-display font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="text-center text-slate-500 text-sm py-6">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${!n.is_read ? 'bg-blue-500/[0.04]' : ''}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-blue-400' : 'bg-transparent'}`} />
                            <div>
                              <p className="text-xs font-semibold text-white">{n.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Avatar user={user} size="sm" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 lg:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
