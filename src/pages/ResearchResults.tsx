import { useMemo, useState } from 'react';
import { BarChart3, Download, Table, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useApp } from '@/context';
import { Card, PageHeader } from '@/components/UI';
import { runSweep } from '@/simulation/engine';
import type { Algorithm, SweepPoint } from '@/types';

const algoColors: Record<Algorithm, string> = {
  ALOHA: '#ef4444',
  'Fixed-Slot': '#f59e0b',
  CADS: '#06b6d4',
};

const algoLabels: Record<Algorithm, string> = {
  ALOHA: 'Pure ALOHA',
  'Fixed-Slot': 'Fixed-Slot',
  CADS: 'CADS',
};

export default function ResearchResults() {
  const { config } = useApp();
  const [activeTab, setActiveTab] = useState<'charts' | 'table'>('charts');

  // Sweep data
  const deviceSweep = useMemo(() => {
    const devices = [50, 100, 200, 300, 500, 750, 1000];
    return runSweep(config, 'numDevices', devices, ['ALOHA', 'Fixed-Slot', 'CADS']);
  }, [config]);

  const trafficSweep = useMemo(() => {
    return runSweep(config, 'trafficLoad', [0, 1, 2, 3], ['ALOHA', 'Fixed-Slot', 'CADS']);
  }, [config]);

  const sfSweep = useMemo(() => {
    return runSweep(config, 'spreadingFactor', [7, 8, 9, 10, 11, 12], ['ALOHA', 'Fixed-Slot', 'CADS']);
  }, [config]);

  // Transform for charts
  const pdrVsDevices = transformSweep(deviceSweep, 'pdr');
  const collisionVsTraffic = transformSweep(trafficSweep, 'collisionRate', ['Low', 'Medium', 'High', 'Saturated']);
  const airtimeVsSF = transformSweep(sfSweep, 'avgAirtimeMs');
  const energyVsDevices = transformSweep(deviceSweep, 'energyConsumptionMJ');

  // Scalability comparison (throughput)
  const scalabilityData = useMemo(() => {
    const devices = [50, 100, 200, 300, 500, 750, 1000];
    const algos: Algorithm[] = ['ALOHA', 'Fixed-Slot', 'CADS'];
    return devices.map((n) => {
      const row: Record<string, number> = { devices: n };
      for (const a of algos) {
        const pt = deviceSweep.find((p) => p.xValue === n && p.algorithm === a);
        row[algoLabels[a]] = pt ? pt.pdr : 0;
      }
      return row;
    });
  }, [deviceSweep]);

  const csvData = useMemo(() => buildCSV(deviceSweep, trafficSweep, sfSweep), [deviceSweep, trafficSweep, sfSweep]);

  const downloadCSV = () => {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorasense_research_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Table data
  const allResults = [...deviceSweep, ...trafficSweep, ...sfSweep];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Research Results"
        subtitle="Parametric sweep analysis across all scheduling algorithms"
      />

      {/* Export bar */}
      <div className="flex items-center justify-between bg-navy-850 rounded-xl border border-navy-700 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'charts' ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40' : 'bg-navy-800 text-slate-400 border border-navy-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Charts
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'table' ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40' : 'bg-navy-800 text-slate-400 border border-navy-700'
            }`}
          >
            <Table className="w-4 h-4" /> Data Table
          </button>
        </div>
        <button
          onClick={downloadCSV}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-accent-cyan to-accent-blue text-white flex items-center gap-2 hover:opacity-90 transition-opacity glow-cyan"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {activeTab === 'charts' ? (
        <div className="space-y-6">
          {/* PDR vs devices */}
          <Card title="PDR vs Number of Devices" subtitle="How PDR degrades as network grows" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pdrVsDevices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="xValue" stroke="#64748b" fontSize={11} label={{ value: 'Number of Devices', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                <YAxis stroke="#64748b" fontSize={11} label={{ value: 'PDR (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip labelFormatter={(v) => `${v} devices`} />
                <Legend />
                {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                  <Line key={a} type="monotone" dataKey={algoLabels[a]} stroke={algoColors[a]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Collision vs traffic */}
            <Card title="Collision Rate vs Traffic Load" subtitle="Impact of traffic intensity" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={collisionVsTraffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="xValue" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip />
                  <Legend />
                  {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                    <Bar key={a} dataKey={algoLabels[a]} fill={algoColors[a]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Airtime vs SF */}
            <Card title="Airtime vs Spreading Factor" subtitle="Time-on-air increases with SF" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={airtimeVsSF}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="xValue" stroke="#64748b" fontSize={11} label={{ value: 'SF', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" ms" />
                  <Tooltip labelFormatter={(v) => `SF${v}`} />
                  <Legend />
                  {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                    <Line key={a} type="monotone" dataKey={algoLabels[a]} stroke={algoColors[a]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Energy vs devices */}
            <Card title="Energy Consumption vs Devices" subtitle="Total network energy" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={energyVsDevices}>
                  <defs>
                    {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                      <linearGradient key={a} id={`grad-${a}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={algoColors[a]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={algoColors[a]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="xValue" stroke="#64748b" fontSize={11} label={{ value: 'Devices', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" mJ" />
                  <Tooltip />
                  <Legend />
                  {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                    <Area key={a} type="monotone" dataKey={algoLabels[a]} stroke={algoColors[a]} fill={`url(#grad-${a})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Scalability comparison */}
            <Card title="Scalability Comparison" subtitle="PDR retention as network scales" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={scalabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="devices" stroke="#64748b" fontSize={11} label={{ value: 'Devices', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip />
                  <Legend />
                  {(['ALOHA', 'Fixed-Slot', 'CADS'] as Algorithm[]).map((a) => (
                    <Line key={a} type="monotone" dataKey={algoLabels[a]} stroke={algoColors[a]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      ) : (
        <Card title="Complete Results Table" subtitle="All sweep data points" icon={Table}>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy-850 z-10">
                <tr className="border-b border-navy-700">
                  <th className="text-left py-3 px-3 text-slate-400 font-medium">Sweep Variable</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">Value</th>
                  <th className="text-left py-3 px-3 text-slate-400 font-medium">Algorithm</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">PDR (%)</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">Collision (%)</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">Airtime (ms)</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">Energy (µJ)</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium">Exec (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {allResults.map((r, i) => {
                  const sweepType = i < deviceSweep.length ? 'Devices' : i < deviceSweep.length + trafficSweep.length ? 'Traffic' : 'SF';
                  return (
                    <tr key={i} className="hover:bg-navy-800/50">
                      <td className="py-2 px-3 text-slate-400">{sweepType}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{r.xValue}</td>
                      <td className="py-2 px-3" style={{ color: algoColors[r.algorithm] }}>{algoLabels[r.algorithm]}</td>
                      <td className="py-2 px-3 text-right font-mono text-accent-green">{r.pdr.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono text-accent-red">{r.collisionRate.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono text-accent-cyan">{r.avgAirtimeMs.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono text-accent-amber">{r.energyConsumptionMJ.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{r.executionTimeMs.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function transformSweep(sweep: SweepPoint[], metric: keyof SweepPoint, xLabels?: string[]): Record<string, number | string>[] {
  const xValues = [...new Set(sweep.map((p) => p.xValue))];
  return xValues.map((x, xi) => {
    const row: Record<string, number | string> = { xValue: xLabels ? xLabels[xi] : x };
    for (const p of sweep) {
      if (p.xValue === x) {
        row[algoLabels[p.algorithm]] = p[metric] as number;
      }
    }
    return row;
  });
}

function buildCSV(...sweeps: SweepPoint[][]): string {
  const headers = ['Sweep Type', 'X Value', 'Algorithm', 'PDR (%)', 'Collision Rate (%)', 'Avg Airtime (ms)', 'Energy (µJ)', 'Exec Time (ms)'];
  const rows: string[] = [headers.join(',')];
  const types = ['Devices', 'Traffic Load', 'Spreading Factor'];
  sweeps.forEach((sweep, si) => {
    for (const r of sweep) {
      rows.push([
        types[si],
        r.xValue,
        algoLabels[r.algorithm],
        r.pdr.toFixed(2),
        r.collisionRate.toFixed(2),
        r.avgAirtimeMs.toFixed(2),
        r.energyConsumptionMJ.toFixed(2),
        r.executionTimeMs.toFixed(2),
      ].join(','));
    }
  });
  return rows.join('\n');
}
