import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  accent?: 'cyan' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const accentMap = {
  cyan: 'from-accent-cyan/20 to-transparent text-accent-cyan border-accent-cyan/30',
  blue: 'from-accent-blue/20 to-transparent text-accent-blue border-accent-blue/30',
  green: 'from-accent-green/20 to-transparent text-accent-green border-accent-green/30',
  amber: 'from-accent-amber/20 to-transparent text-accent-amber border-accent-amber/30',
  red: 'from-accent-red/20 to-transparent text-accent-red border-accent-red/30',
  purple: 'from-accent-purple/20 to-transparent text-accent-purple border-accent-purple/30',
};

export function KPICard({ icon: Icon, label, value, unit, trend, trendUp, accent = 'cyan' }: KPICardProps) {
  return (
    <div className="bg-navy-850 rounded-xl border border-navy-700 p-5 hover:border-navy-600 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center border`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-mono ${trendUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono">
        {value}
        {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

export function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-navy-850 rounded-xl border border-navy-700 p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className="w-5 h-5 text-accent-cyan" />}
            <div>
              {title && <h3 className="text-white font-semibold text-sm">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center border border-accent-cyan/30">
          <Icon className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
