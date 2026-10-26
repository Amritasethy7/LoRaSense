import { SlidersHorizontal, Play, RotateCcw, Radio, Zap } from 'lucide-react';
import { useApp } from '@/context';
import { Card, PageHeader } from '@/components/UI';
import type { Algorithm, SpreadingFactor, TrafficLoad } from '@/types';

const algorithms: { id: Algorithm; label: string; desc: string }[] = [
  { id: 'ALOHA', label: 'Pure ALOHA', desc: 'No coordination, transmit anytime' },
  { id: 'Fixed-Slot', label: 'Fixed-Slot Scheduling', desc: 'Deterministic time slots per node' },
  { id: 'CADS', label: 'Collision-Aware Dynamic Scheduling', desc: 'Adaptive channel & slot selection' },
];

const spreadingFactors: SpreadingFactor[] = [7, 8, 9, 10, 11, 12];
const trafficLoads: TrafficLoad[] = ['Low', 'Medium', 'High', 'Saturated'];

const sfInfo: Record<number, { range: string; airtime: string }> = {
  7: { range: '~500 m', airtime: '~56 ms' },
  8: { range: '~1 km', airtime: '~103 ms' },
  9: { range: '~1.5 km', airtime: '~206 ms' },
  10: { range: '~2 km', airtime: '~411 ms' },
  11: { range: '~3 km', airtime: '~823 ms' },
  12: { range: '~5 km', airtime: '~1646 ms' },
};

export default function SimulationSetup() {
  const { config, setConfig, runSim, resetSim, hasRun, result, setCurrentPage } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SlidersHorizontal}
        title="Simulation Setup"
        subtitle="Configure network parameters and scheduling algorithm"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Parameters */}
        <div className="xl:col-span-2 space-y-6">
          <Card title="Network Parameters" subtitle="IoT device and gateway configuration" icon={Radio}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Number of devices */}
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>IoT Devices</span>
                  <span className="font-mono text-accent-cyan">{config.numDevices}</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={1000}
                  step={10}
                  value={config.numDevices}
                  onChange={(e) => setConfig({ ...config, numDevices: Number(e.target.value) })}
                  className="w-full accent-accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>50</span><span>1000</span>
                </div>
              </div>

              {/* Gateways */}
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>Gateways</span>
                  <span className="font-mono text-accent-cyan">{config.numGateways}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={config.numGateways}
                  onChange={(e) => setConfig({ ...config, numGateways: Number(e.target.value) })}
                  className="w-full accent-accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>1</span><span>10</span>
                </div>
              </div>

              {/* Channels */}
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>Wireless Channels</span>
                  <span className="font-mono text-accent-cyan">{config.numChannels}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={16}
                  step={1}
                  value={config.numChannels}
                  onChange={(e) => setConfig({ ...config, numChannels: Number(e.target.value) })}
                  className="w-full accent-accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>1</span><span>16</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>Duration (seconds)</span>
                  <span className="font-mono text-accent-cyan">{config.durationSec}s</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={config.durationSec}
                  onChange={(e) => setConfig({ ...config, durationSec: Number(e.target.value) })}
                  className="w-full accent-accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>10s</span><span>300s</span>
                </div>
              </div>
            </div>

            {/* Traffic load */}
            <div className="mt-5">
              <label className="text-sm text-slate-300 mb-2 block">Traffic Load</label>
              <div className="grid grid-cols-4 gap-2">
                {trafficLoads.map((load) => (
                  <button
                    key={load}
                    onClick={() => setConfig({ ...config, trafficLoad: load })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      config.trafficLoad === load
                        ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                        : 'bg-navy-800 text-slate-400 border border-navy-700 hover:border-navy-600'
                    }`}
                  >
                    {load}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Spreading factor */}
          <Card title="Spreading Factor" subtitle="Higher SF = longer range, more airtime, more energy" icon={Zap}>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {spreadingFactors.map((sf) => (
                <button
                  key={sf}
                  onClick={() => setConfig({ ...config, spreadingFactor: sf })}
                  className={`p-3 rounded-lg text-center transition-all ${
                    config.spreadingFactor === sf
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40 glow-blue'
                      : 'bg-navy-800 text-slate-400 border border-navy-700 hover:border-navy-600'
                  }`}
                >
                  <div className="text-lg font-bold font-mono">SF{sf}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{sfInfo[sf].range}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 bg-navy-800 rounded-lg p-3 text-xs text-slate-400">
              <span className="text-slate-500">Estimated airtime at SF{config.spreadingFactor}: </span>
              <span className="font-mono text-accent-cyan">{sfInfo[config.spreadingFactor].airtime}</span>
              <span className="text-slate-500"> · Range: </span>
              <span className="font-mono text-accent-cyan">{sfInfo[config.spreadingFactor].range}</span>
            </div>
          </Card>

          {/* Algorithm selector */}
          <Card title="Scheduling Algorithm" subtitle="Select the MAC protocol to evaluate" icon={SlidersHorizontal}>
            <div className="space-y-2">
              {algorithms.map((algo) => (
                <button
                  key={algo.id}
                  onClick={() => setConfig({ ...config, algorithm: algo.id })}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    config.algorithm === algo.id
                      ? 'bg-accent-cyan/10 border-accent-cyan/40'
                      : 'bg-navy-800 border-navy-700 hover:border-navy-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-semibold ${config.algorithm === algo.id ? 'text-accent-cyan' : 'text-slate-300'}`}>
                        {algo.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{algo.desc}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${config.algorithm === algo.id ? 'border-accent-cyan bg-accent-cyan' : 'border-navy-600'}`} />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Action panel */}
        <div className="space-y-6">
          <Card title="Simulation Control" icon={Play}>
            <div className="space-y-3">
              <button
                onClick={runSim}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-semibold hover:opacity-90 transition-opacity glow-cyan"
              >
                <Play className="w-5 h-5" />
                Run Simulation
              </button>
              <button
                onClick={resetSim}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-navy-800 text-slate-300 font-medium border border-navy-700 hover:border-navy-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {hasRun && result && (
              <div className="mt-4 space-y-2 animate-fade-in">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Last Result</div>
                <div className="bg-navy-800 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">PDR</span><span className="font-mono text-accent-green">{result.pdr}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Collision Rate</span><span className="font-mono text-accent-red">{result.collisionRate}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Airtime</span><span className="font-mono text-accent-cyan">{result.avgAirtimeMs} ms</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Energy</span><span className="font-mono text-accent-amber">{(result.energyConsumptionMJ / 1000).toFixed(2)} mJ</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Throughput</span><span className="font-mono text-accent-purple">{result.throughput} kbps</span></div>
                </div>
                <button
                  onClick={() => setCurrentPage('topology')}
                  className="w-full text-sm text-accent-cyan hover:underline mt-2"
                >
                  View network topology →
                </button>
              </div>
            )}
          </Card>

          <Card title="Configuration Summary" icon={Radio}>
            <div className="space-y-2 text-sm">
              <Row label="Devices" value={`${config.numDevices}`} />
              <Row label="Gateways" value={`${config.numGateways}`} />
              <Row label="Channels" value={`${config.numChannels}`} />
              <Row label="Traffic" value={config.trafficLoad} />
              <Row label="Duration" value={`${config.durationSec}s`} />
              <Row label="Spreading Factor" value={`SF${config.spreadingFactor}`} />
              <Row label="Algorithm" value={config.algorithm} highlight />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono ${highlight ? 'text-accent-cyan' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}
