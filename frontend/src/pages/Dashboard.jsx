import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardAPI } from '../utils/api'
import { ProgressBar, PriorityBadge, StatusBadge, Avatar, Skeleton } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle,
  TrendingUp, Users, ArrowRight, Activity, Flame
} from 'lucide-react'
import { formatDistanceToNow, format, isPast } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', text: 'text-blue-400' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', text: 'text-amber-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400', text: 'text-red-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-400', text: 'text-purple-400' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className={`stat-card border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
        {sub !== undefined && (
          <span className={`text-xs font-semibold ${c.text} ${c.bg} px-2 py-0.5 rounded-lg`}>
            {sub}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div>
          <div className="font-display font-bold text-3xl text-white">{value ?? '—'}</div>
          <div className="text-slate-400 text-sm mt-0.5">{label}</div>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [myTasks, setMyTasks] = useState([])
  const [activity, setActivity] = useState([])
  const [overdue, setOverdue] = useState([])
  const [chartData, setChartData] = useState([])
  const [projectHealth, setProjectHealth] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, myTasksRes, actRes, overdueRes, chartRes, healthRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getMyTasks(),
          dashboardAPI.getRecentActivity(),
          dashboardAPI.getOverdueTasks(),
          dashboardAPI.getCompletionChart(),
          dashboardAPI.getProjectHealth(),
        ])
        setStats(statsRes.data)
        setMyTasks(myTasksRes.data.tasks || [])
        setActivity(actRes.data.activities || [])
        setOverdue(overdueRes.data.tasks || [])
        setChartData(chartRes.data.chart_data || [])
        setProjectHealth(healthRes.data.projects || [])
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const actionColor = (action) => {
    if (action.includes('created')) return 'text-emerald-400'
    if (action.includes('deleted')) return 'text-red-400'
    if (action.includes('done') || action.includes('completed')) return 'text-blue-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {stats ? `You have ${stats.my_tasks} task${stats.my_tasks !== 1 ? 's' : ''} assigned to you` : 'Loading your workspace...'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Active Projects" value={stats?.active_projects} color="blue"
          sub={`${stats?.total_projects ?? '—'} total`} loading={loading} />
        <StatCard icon={CheckSquare} label="My Tasks" value={stats?.my_tasks} color="purple"
          sub={`${stats?.completion_rate ?? '—'}% done`} loading={loading} />
        <StatCard icon={Clock} label="Due Today" value={stats?.due_today} color="amber" loading={loading} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats?.overdue}
          color={stats?.overdue > 0 ? 'red' : 'green'} loading={loading} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-white">Task Activity</h3>
              <p className="text-slate-500 text-xs mt-0.5">Last 7 days</p>
            </div>
            <TrendingUp size={16} className="text-slate-500" />
          </div>
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-3 rounded-sm bg-blue-500/60" /> Created
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Completed
            </div>
          </div>
        </div>

        {/* Project health */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">Project Health</h3>
            <Link to="/projects" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : projectHealth.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No active projects</p>
          ) : (
            <div className="space-y-4">
              {projectHealth.map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm text-white font-medium truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: p.color }}>{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} color={p.color} size="sm" />
                  {p.overdue > 0 && (
                    <p className="text-[10px] text-red-400 mt-1">{p.overdue} overdue task{p.overdue > 1 ? 's' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">My Open Tasks</h3>
            <Link to="/tasks?my_tasks=true" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">All caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 5).map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${task.is_overdue ? 'bg-red-400' : 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 truncate">{task.project?.name}</span>
                      {task.due_date && (
                        <span className={`text-xs ${task.is_overdue ? 'text-red-400' : 'text-slate-500'}`}>
                          {task.is_overdue ? '⚠ Overdue' : `Due ${format(new Date(task.due_date), 'MMM d')}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">Recent Activity</h3>
            <Activity size={14} className="text-slate-500" />
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : activity.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <Avatar user={a.user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-white">{a.user?.name}</span>{' '}
                      <span className={actionColor(a.action)}>{a.action.replace(/_/g, ' ')}</span>{' '}
                      <span className="text-slate-400 truncate">{a.entity_name}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue tasks alert */}
      {!loading && overdue.length > 0 && (
        <div className="card border-red-500/20 p-5 bg-red-500/[0.04]">
          <div className="flex items-center gap-3 mb-4">
            <Flame size={18} className="text-red-400" />
            <h3 className="font-display font-semibold text-red-300">Overdue Tasks Require Attention</h3>
            <span className="badge bg-red-500/20 text-red-400 border border-red-500/20 ml-auto">{overdue.length} overdue</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {overdue.slice(0, 4).map(task => (
              <Link key={task.id} to={`/tasks/${task.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.05] hover:bg-red-500/[0.1] transition-all border border-red-500/10">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{task.title}</p>
                  <p className="text-xs text-red-400">
                    {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
