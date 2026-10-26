
import { useMemo, useState, useRef } from 'react';
import {
  Network,
  Radio,
  CheckCircle,
  XCircle,
  Circle,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context';
import { Card, PageHeader } from '@/components/UI';
import { runSimulation } from '@/simulation/engine';
import type { NodeEvent } from '@/types';

const COLORS = {
  success: '#10b981',
  collision: '#ef4444',
  idle: '#64748b',
  gateway: '#06b6d4',
  node: '#3b82f6',
};

export default function Topology() {
  const { config, result, hasRun } = useApp();

  const [showCollisions, setShowCollisions] = useState(true);
  const [showSuccess, setShowSuccess] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const events: NodeEvent[] = useMemo(() => {
    if (result) return result.nodeEvents;
    return runSimulation(config).nodeEvents;
  }, [result, config]);

  const nodes = useMemo(() => {
    const map = new Map<
      number,
      { x: number; y: number; status: string }
    >();

    for (const e of events) {
      if (!map.has(e.deviceId)) {
        map.set(e.deviceId, {
          x: e.x,
          y: e.y,
          status: e.status,
        });
      }
    }

    return Array.from(map.entries()).slice(
      0,
      Math.min(config.numDevices, 150)
    );
  }, [events, config.numDevices]);

  const gateways = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();

    for (const e of events) {
      if (!map.has(e.gatewayId)) {
        map.set(e.gatewayId, { x: e.gx, y: e.gy });
      }
    }

    if (map.size === 0) {
      map.set(0, { x: 50, y: 31.25 });
    }

    return Array.from(map.entries());
  }, [events]);

  const links = useMemo(() => {
    return events
      .filter((e) => {
        if (e.status === 'success' && !showSuccess) return false;
        if (e.status === 'collision' && !showCollisions) return false;
        if (e.status === 'idle') return false;
        return true;
      })
      .slice(0, 80);
  }, [events, showSuccess, showCollisions]);

  const successCount = events.filter(
    (e) => e.status === 'success'
  ).length;

  const collisionCount = events.filter(
    (e) => e.status === 'collision'
  ).length;

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const changeZoom = (factor: number) => {
    setZoom((current) =>
      Math.max(0.5, Math.min(5, current * factor))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Network}
        title="Network Topology"
        subtitle="Visualize IoT sensor nodes, gateway links, and collision events"
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <Card
            title="LoRaWAN Topology Map"
            subtitle={`${nodes.length} sensor nodes · ${gateways.length} gateway(s)`}
            icon={Radio}
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowSuccess((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    showSuccess
                      ? 'bg-accent-green/20 text-accent-green border-accent-green/40'
                      : 'bg-navy-800 text-slate-500 border-navy-700'
                  }`}
                >
                  Success
                </button>

                <button
                  onClick={() => setShowCollisions((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    showCollisions
                      ? 'bg-accent-red/20 text-accent-red border-accent-red/40'
                      : 'bg-navy-800 text-slate-500 border-navy-700'
                  }`}
                >
                  Collisions
                </button>
              </div>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-xs text-slate-500">
                Drag to move · Scroll to zoom
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => changeZoom(1.25)}
                  title="Zoom in"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-navy-800 border border-navy-700 text-slate-300 hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  Zoom In
                </button>

                <button
                  onClick={() => changeZoom(0.8)}
                  title="Zoom out"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-navy-800 border border-navy-700 text-slate-300 hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  Zoom Out
                </button>

                <button
                  onClick={resetView}
                  title="Reset view"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-navy-800 border border-navy-700 text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-[16/10] bg-navy-950 rounded-lg overflow-hidden grid-bg border border-navy-700">
              <svg
                viewBox="0 0 100 62.5"
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                preserveAspectRatio="xMidYMid meet"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;

                  e.currentTarget.setPointerCapture(e.pointerId);

                  dragRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    panX: pan.x,
                    panY: pan.y,
                  };
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current) return;

                  const rect = e.currentTarget.getBoundingClientRect();

                  if (!rect.width || !rect.height) return;

                  setPan({
                    x:
                      dragRef.current.panX +
                      ((e.clientX - dragRef.current.x) /
                        rect.width) *
                        (100 / zoom),
                    y:
                      dragRef.current.panY +
                      ((e.clientY - dragRef.current.y) /
                        rect.height) *
                        (62.5 / zoom),
                  });
                }}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  changeZoom(e.deltaY < 0 ? 1.1 : 0.9);
                }}
              >
                <g
                  transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
                >
                  {/* Transmission links */}
                  {links.map((e, i) => (
                    <line
                      key={`link-${i}`}
                      x1={e.x}
                      y1={e.y}
                      x2={e.gx}
                      y2={e.gy}
                      stroke={
                        e.status === 'success'
                          ? COLORS.success
                          : COLORS.collision
                      }
                      strokeWidth={0.15}
                      strokeOpacity={0.4}
                      strokeDasharray={
                        e.status === 'collision' ? '0.5 0.5' : 'none'
                      }
                    />
                  ))}

                  {/* Gateway range circles */}
                  {gateways.map(([gid, pos]) => (
                    <circle
                      key={`range-${gid}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={20}
                      fill="none"
                      stroke={COLORS.gateway}
                      strokeWidth={0.15}
                      strokeOpacity={0.2}
                      strokeDasharray="1 1"
                    />
                  ))}

                  {/* Sensor nodes */}
                  {nodes.map(([deviceId, pos]) => (
                    <g key={`node-${deviceId}`}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={0.8}
                        fill={
                          pos.status === 'collision'
                            ? COLORS.collision
                            : pos.status === 'success'
                              ? COLORS.success
                              : COLORS.idle
                        }
                        opacity={0.8}
                      >
                        <animate
                          attributeName="r"
                          values="0.8;1.1;0.8"
                          dur="2s"
                          repeatCount="indefinite"
                          begin={`${deviceId * 0.05}s`}
                        />
                      </circle>
                    </g>
                  ))}

                  {/* Gateways and labels */}
                  {gateways.map(([gid, pos]) => (
                    <g key={`gw-${gid}`}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={2.5}
                        fill={COLORS.gateway}
                        opacity={0.3}
                      />

                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={1.8}
                        fill={COLORS.gateway}
                      />

                      <rect
                        x={pos.x - 1.5}
                        y={pos.y - 1.5}
                        width={3}
                        height={3}
                        rx={0.5}
                        fill="none"
                        stroke={COLORS.gateway}
                        strokeWidth={0.2}
                      />

                      <text
                        x={pos.x}
                        y={pos.y - 3.5}
                        textAnchor="middle"
                        fontSize={2}
                        fill={COLORS.gateway}
                        stroke="#0b1220"
                        strokeWidth={0.3}
                        paintOrder="stroke"
                      >
                        {`GW-${gid + 1}`}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>

              <div className="absolute bottom-2 right-2 rounded bg-navy-900/80 border border-navy-700 px-2 py-1 text-[10px] text-slate-400 pointer-events-none">
                {Math.round(zoom * 100)}%
              </div>
            </div>
          </Card>
        </div>

        {/* Legend and statistics */}
        <div className="space-y-6">
          <Card title="Legend" icon={Layers}>
            <div className="space-y-3">
              <LegendItem
                icon={Radio}
                color={COLORS.gateway}
                label="LoRaWAN Gateway"
                desc="Central receiver"
              />
              <LegendItem
                icon={Circle}
                color={COLORS.success}
                label="Successful TX"
                desc="Packet received"
              />
              <LegendItem
                icon={XCircle}
                color={COLORS.collision}
                label="Collision Event"
                desc="Packet lost"
              />
              <LegendItem
                icon={Circle}
                color={COLORS.idle}
                label="Idle Node"
                desc="No transmission"
              />
            </div>
          </Card>

          <Card title="Transmission Stats" icon={CheckCircle}>
            <div className="space-y-3">
              <div className="bg-navy-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                  <span className="text-xs text-slate-500">
                    Successful
                  </span>
                </div>
                <div className="text-xl font-mono font-bold text-accent-green">
                  {successCount}
                </div>
              </div>

              <div className="bg-navy-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-accent-red" />
                  <span className="text-xs text-slate-500">
                    Collided
                  </span>
                </div>
                <div className="text-xl font-mono font-bold text-accent-red">
                  {collisionCount}
                </div>
              </div>

              <div className="bg-navy-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-4 h-4 text-accent-cyan" />
                  <span className="text-xs text-slate-500">
                    Total Shown
                  </span>
                </div>
                <div className="text-xl font-mono font-bold text-accent-cyan">
                  {events.length}
                </div>
              </div>
            </div>
          </Card>

          {!hasRun && (
            <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-3 text-xs text-slate-400">
              Showing default topology. Run a simulation in{' '}
              <strong className="text-accent-cyan">
                Simulation Setup
              </strong>{' '}
              for custom results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  icon: Icon,
  color,
  label,
  desc,
}: {
  icon: typeof Radio;
  color: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: `${color}20`,
          border: `1px solid ${color}40`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div>
        <div className="text-sm text-slate-300">{label}</div>
        <div className="text-[10px] text-slate-600">{desc}</div>
      </div>
    </div>
  );
}
