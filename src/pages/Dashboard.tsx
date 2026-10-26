import { useMemo } from 'react';
import {
  LayoutDashboard,
  Cpu,
  Target,
  AlertTriangle,
  Clock,
  Battery,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { useApp } from '@/context';
import { KPICard, Card, PageHeader } from '@/components/UI';
import { runSimulation } from '@/simulation/engine';
import type { SimResult } from '@/types';

const chartTextColor = '#64748b';

export default function Dashboard() {
  const { result, config, hasRun } = useApp();

  // Generate a default result if none has been run yet
  const displayResult: SimResult = useMemo(() => {
    if (result) return result;
    return runSimulation(config);
  }, [result, config]);

  // Run all three algorithms for comparison
  const comparisonData = useMemo(() => {
    const algos = ['ALOHA', 'Fixed-Slot', 'CADS'] as const;
    return algos.map((algo) => {
      const r = runSimulation({ ...config, algorithm: algo });
      return {
        algorithm: algo,
        PDR: r.pdr,
        Collisions: r.collisionRate,
        Airtime: r.avgAirtimeMs,
        Energy: r.energyConsumptionMJ / 1000,
        Throughput: r.throughput,
      };
    });
  }, [config]);

  const scalabilityData = useMemo(() => {
    // const devices = [50, 100, 200, 300, 500, 750, 1000];
    const devices = [50, 100, 200];
    return devices.map((n) => {
      const r = runSimulation({ ...config, numDevices: n, algorithm: 'CADS' });
      return { devices: n, PDR: r.pdr, collisions: r.collisionRate, throughput: r.throughput };
    });
  }, [config]);

  const pdrGauge = [{ name: 'PDR', value: displayResult.pdr, fill: '#06b6d4' }];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Network Dashboard"
        subtitle="Real-time overview of LoRaWAN simulation metrics"
      />

      {!hasRun && (
        <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-3 text-sm text-slate-300 animate-fade-in">
          Showing default simulation results. Go to <strong className="text-accent-cyan">Simulation Setup</strong> to configure and run your own scenario.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={Cpu} label="IoT Devices" value={displayResult.config.numDevices} accent="blue" />
        <KPICard
          icon={Target}
          label="Packet Delivery Ratio"
          value={displayResult.pdr.toFixed(1)}
          unit="%"
          accent="green"
          trend={displayResult.pdr > 80 ? 'good' : 'low'}
          trendUp={displayResult.pdr > 80}
        />
        <KPICard
          icon={AlertTriangle}
          label="Collision Rate"
          value={displayResult.collisionRate.toFixed(1)}
          unit="%"
          accent="red"
          trend={displayResult.collisionRate < 10 ? 'low' : 'high'}
          trendUp={displayResult.collisionRate < 10}
        />
        <KPICard icon={Clock} label="Avg Airtime" value={displayResult.avgAirtimeMs.toFixed(0)} unit="ms" accent="cyan" />
        <KPICard
          icon={Battery}
          label="Energy Consumption"
          value={(displayResult.energyConsumptionMJ / 1000).toFixed(2)}
          unit="mJ"
          accent="amber"
        />
        <KPICard icon={Zap} label="Throughput" value={displayResult.throughput.toFixed(1)} unit="kbps" accent="purple" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDR Gauge */}
        <Card title="Packet Delivery Ratio" subtitle="Current simulation" icon={Target}>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={pdrGauge} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: '#111d38' }} dataKey="value" cornerRadius={10} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#06b6d4" fontSize="28" fontWeight="700">
                {displayResult.pdr.toFixed(1)}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2 text-center">
            <div className="bg-navy-800 rounded-lg p-2">
              <div className="text-xs text-slate-500">Success</div>
              <div className="text-sm font-mono text-accent-green">{displayResult.successfulPackets}</div>
            </div>
            <div className="bg-navy-800 rounded-lg p-2">
              <div className="text-xs text-slate-500">Collided</div>
              <div className="text-sm font-mono text-accent-red">{displayResult.collidedPackets}</div>
            </div>
          </div>
        </Card>

        {/* Transmission timeseries */}
        <Card title="Transmission Timeline" subtitle="Success vs collision over time" icon={TrendingUp} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={displayResult.timeseries}>
              <defs>
                <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCollision" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={chartTextColor} fontSize={11} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: chartTextColor }} />
              <YAxis stroke={chartTextColor} fontSize={11} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="success" stroke="#10b981" fill="url(#gradSuccess)" strokeWidth={2} name="Successful" />
              <Area type="monotone" dataKey="collision" stroke="#ef4444" fill="url(#gradCollision)" strokeWidth={2} name="Collided" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scalability */}
        <Card title="Network Scalability" subtitle="PDR & collision rate vs device count" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={scalabilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="devices" stroke={chartTextColor} fontSize={11} label={{ value: 'Devices', position: 'insideBottom', offset: -5, fill: chartTextColor }} />
              <YAxis yAxisId="left" stroke={chartTextColor} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke={chartTextColor} fontSize={11} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="PDR" stroke="#06b6d4" strokeWidth={2} name="PDR (%)" dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="collisions" stroke="#ef4444" strokeWidth={2} name="Collision Rate (%)" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Algorithm comparison */}
        <Card title="Algorithm Comparison" subtitle="Baseline vs proposed (CADS)" icon={LayoutDashboard}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="algorithm" stroke={chartTextColor} fontSize={11} />
              <YAxis stroke={chartTextColor} fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="PDR" fill="#06b6d4" radius={[4, 4, 0, 0]} name="PDR (%)" />
              <Bar dataKey="Collisions" fill="#ef4444" radius={[4, 4, 0, 0]} name="Collision Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Throughput comparison */}
      <Card title="Throughput by Algorithm" subtitle="Network throughput comparison (kbps)" icon={Zap}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={comparisonData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" stroke={chartTextColor} fontSize={11} />
            <YAxis type="category" dataKey="algorithm" stroke={chartTextColor} fontSize={11} />
            <Tooltip />
            <Bar dataKey="Throughput" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Throughput (kbps)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
