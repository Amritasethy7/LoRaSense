import { useMemo } from 'react';
import { GitCompare, CheckCircle, AlertTriangle, Zap, Clock, Battery } from 'lucide-react';
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '@/context';
import { Card, PageHeader } from '@/components/UI';
import { runSimulation } from '@/simulation/engine';
import type { Algorithm } from '@/types';

const algorithmInfo: Record<Algorithm, { strengths: string[]; limitations: string[]; color: string }> = {
  ALOHA: {
    strengths: ['No synchronization needed', 'Simplest to implement', 'Low computational overhead', 'Works with any device count'],
    limitations: ['Maximum collision probability', 'PDR degrades rapidly with load', 'Poor energy efficiency', 'Not suitable for dense networks'],
    color: '#ef4444',
  },
  'Fixed-Slot': {
    strengths: ['Predictable transmission schedule', 'Lower collision rate than ALOHA', 'Moderate implementation complexity', 'Energy-efficient for fixed networks'],
    limitations: ['Requires time synchronization', 'Inflexible to traffic changes', 'Wastes slots for idle devices', 'Poor scalability beyond slot capacity'],
    color: '#f59e0b',
  },
  CADS: {
    strengths: ['Dynamically avoids collisions', 'Adapts to traffic load changes', 'Best PDR across all scenarios', 'Optimizes channel utilization'],
    limitations: ['Higher computational complexity', 'Requires channel sensing', 'Longer execution time', 'More complex to implement'],
    color: '#06b6d4',
  },
};

export default function AlgorithmComparison() {
  const { config } = useApp();

  const results = useMemo(() => {
    const algos: Algorithm[] = ['ALOHA', 'Fixed-Slot', 'CADS'];
    return algos.map((algo) => {
      const r = runSimulation({ ...config, algorithm: algo });
      return {
        algorithm: algo,
        label: algo === 'ALOHA' ? 'Pure ALOHA' : algo === 'Fixed-Slot' ? 'Fixed-Slot' : 'CADS',
        pdr: r.pdr,
        collisionRate: r.collisionRate,
        avgAirtimeMs: r.avgAirtimeMs,
        energyMJ: r.energyConsumptionMJ,
        executionTimeMs: r.executionTimeMs,
        throughput: r.throughput,
        totalPackets: r.totalPackets,
        successful: r.successfulPackets,
        collided: r.collidedPackets,
      };
    });
  }, [config]);

  const chartData = results.map((r) => ({
    algorithm: r.label,
    'PDR (%)': r.pdr,
    'Collision Rate (%)': r.collisionRate,
    'Throughput (kbps)': r.throughput,
  }));

  const radarData = results.map((r) => {
    // Normalize to 0-100 scale for radar
    const maxPdr = Math.max(...results.map((x) => x.pdr));
    const minColl = Math.min(...results.map((x) => x.collisionRate));
    const maxThroughput = Math.max(...results.map((x) => x.throughput));
    const minEnergy = Math.min(...results.map((x) => x.energyMJ));
    const minExec = Math.min(...results.map((x) => x.executionTimeMs));
    return {
      algorithm: r.label,
      PDR: (r.pdr / maxPdr) * 100,
      'Low Collisions': ((minColl / Math.max(r.collisionRate, 0.1)) * 100),
      Throughput: (r.throughput / maxThroughput) * 100,
      'Energy Efficiency': (minEnergy / Math.max(r.energyMJ, 1)) * 100,
      'Speed': (minExec / Math.max(r.executionTimeMs, 0.1)) * 100,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GitCompare}
        title="Algorithm Comparison"
        subtitle="Benchmarking Pure ALOHA, Fixed-Slot, and CADS scheduling"
      />

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {results.map((r) => {
          const info = algorithmInfo[r.algorithm];
          return (
            <div
              key={r.algorithm}
              className="bg-navy-850 rounded-xl border border-navy-700 p-5 hover:border-navy-600 transition-colors"
              style={{ borderTopColor: info.color, borderTopWidth: '2px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                <h3 className="text-white font-semibold">{r.label}</h3>
              </div>

              <div className="space-y-2.5 mb-4">
                <MetricRow label="PDR" value={`${r.pdr}%`} accent="text-accent-green" />
                <MetricRow label="Collision Rate" value={`${r.collisionRate}%`} accent="text-accent-red" />
                <MetricRow label="Avg Airtime" value={`${r.avgAirtimeMs} ms`} accent="text-accent-cyan" />
                <MetricRow label="Energy" value={`${(r.energyMJ / 1000).toFixed(2)} mJ`} accent="text-accent-amber" />
                <MetricRow label="Exec Time" value={`${r.executionTimeMs} ms`} accent="text-slate-300" />
              </div>

              <div className="border-t border-navy-700 pt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-accent-green">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">Strengths</span>
                </div>
                {info.strengths.map((s, i) => (
                  <div key={i} className="text-xs text-slate-400 pl-5">• {s}</div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-accent-amber pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-medium">Limitations</span>
                </div>
                {info.limitations.map((s, i) => (
                  <div key={i} className="text-xs text-slate-400 pl-5">• {s}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="PDR & Collision Rate" subtitle="Higher PDR, lower collisions = better" icon={GitCompare}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="algorithm" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="PDR (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collision Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Performance Radar" subtitle="Normalized multi-metric comparison" icon={Zap}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#243659" />
              <PolarAngleAxis dataKey="algorithm" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar name="PDR" dataKey="PDR" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
              <Radar name="Low Collisions" dataKey="Low Collisions" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              <Radar name="Throughput" dataKey="Throughput" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              <Radar name="Energy Eff." dataKey="Energy Efficiency" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
              <Radar name="Speed" dataKey="Speed" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.1} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Airtime & Energy comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Average Packet Airtime" subtitle="Time on air per packet (ms)" icon={Clock}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={results} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="#64748b" fontSize={11} unit=" ms" />
              <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Bar dataKey="avgAirtimeMs" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Airtime (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Energy Consumption" subtitle="Total network energy (mJ)" icon={Battery}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={results} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="#64748b" fontSize={11} unit=" mJ" />
              <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Bar dataKey="energyMJ" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Energy (µJ)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary table */}
      <Card title="Detailed Comparison Table" icon={GitCompare}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Metric</th>
                {results.map((r) => (
                  <th key={r.algorithm} className="text-right py-3 px-4 text-slate-300 font-semibold">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              <TableRow label="PDR (%)" values={results.map((r) => r.pdr.toFixed(1))} best={0} />
              <TableRow label="Collision Rate (%)" values={results.map((r) => r.collisionRate.toFixed(1))} best={0} lowerBetter />
              <TableRow label="Avg Airtime (ms)" values={results.map((r) => r.avgAirtimeMs.toFixed(1))} best={0} lowerBetter />
              <TableRow label="Energy (mJ)" values={results.map((r) => (r.energyMJ / 1000).toFixed(2))} best={0} lowerBetter />
              <TableRow label="Execution Time (ms)" values={results.map((r) => r.executionTimeMs.toFixed(2))} best={0} lowerBetter />
              <TableRow label="Throughput (kbps)" values={results.map((r) => r.throughput.toFixed(1))} best={0} />
              <TableRow label="Total Packets" values={results.map((r) => r.totalPackets.toString())} best={0} />
              <TableRow label="Successful" values={results.map((r) => r.successful.toString())} best={0} />
              <TableRow label="Collided" values={results.map((r) => r.collided.toString())} best={0} lowerBetter />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-mono font-semibold ${accent}`}>{value}</span>
    </div>
  );
}

function TableRow({ label, values, lowerBetter }: { label: string; values: string[]; best?: number; lowerBetter?: boolean }) {
  const numVals = values.map(Number);
  const bestVal = lowerBetter ? Math.min(...numVals) : Math.max(...numVals);
  return (
    <tr>
      <td className="py-2.5 px-4 text-slate-400">{label}</td>
      {values.map((v, i) => {
        const isBest = numVals[i] === bestVal && numVals.every((x) => !lowerBetter ? x <= bestVal : x >= bestVal);
        return (
          <td key={i} className={`text-right py-2.5 px-4 font-mono ${isBest ? 'text-accent-cyan font-semibold' : 'text-slate-300'}`}>
            {v}
          </td>
        );
      })}
    </tr>
  );
}
