import { useState } from 'react';
import {
  LayoutDashboard,
  SlidersHorizontal,
  Network,
  GitCompare,
  BarChart3,
  Info,
  Radio,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useApp, type PageId } from '@/context';

const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Network overview & KPIs' },
  { id: 'simulation', label: 'Simulation Setup', icon: SlidersHorizontal, desc: 'Configure & run simulation' },
  { id: 'topology', label: 'Network Topology', icon: Network, desc: 'Visualize node transmissions' },
  { id: 'comparison', label: 'Algorithm Comparison', icon: GitCompare, desc: 'Compare scheduling methods' },
  { id: 'results', label: 'Research Results', icon: BarChart3, desc: 'Sweep analysis & export' },
  { id: 'about', label: 'About Project', icon: Info, desc: 'Research methodology' },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, hasRun } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } shrink-0 transition-all duration-300 bg-navy-900 border-r border-navy-700 flex flex-col h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-navy-700 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center shrink-0 glow-cyan">
          <Radio className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-white font-bold text-lg leading-tight">LoRaSense</h1>
            <p className="text-xs text-slate-500 leading-tight">MAC Scheduling Lab</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                active
                  ? 'bg-gradient-to-r from-accent-cyan/20 to-transparent text-accent-cyan border-l-2 border-accent-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-accent-cyan' : ''}`} />
              {!collapsed && (
                <div className="text-left animate-fade-in">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className={`text-[10px] leading-tight ${active ? 'text-accent-cyan/60' : 'text-slate-600'}`}>
                    {item.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="bg-navy-850 rounded-lg p-3 border border-navy-700">
            <div className="flex items-center gap-2 mb-1">
              <Activity className={`w-4 h-4 ${hasRun ? 'text-accent-green' : 'text-slate-600'}`} />
              <span className="text-xs font-medium text-slate-300">Engine Status</span>
            </div>
            <p className={`text-xs ${hasRun ? 'text-accent-green' : 'text-slate-500'}`}>
              {hasRun ? 'Simulation results ready' : 'Awaiting first run'}
            </p>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-navy-700 text-slate-500 hover:text-slate-200 hover:bg-navy-800 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}
