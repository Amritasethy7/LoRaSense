import {
  Info,
  Target,
  ListChecks,
  FlaskConical,
  Cpu,
  Gauge,
  Lightbulb,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/UI';

export default function AboutProject() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Info}
        title="About the Project"
        subtitle="Research overview: Collision-Aware MAC Scheduling for LoRaWAN-Based IoT Networks"
      />

      {/* Problem statement */}
      <Card title="Problem Statement" icon={Target}>
        <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
          <p>
            LoRaWAN is a widely adopted low-power wide-area network (LPWAN) protocol designed for IoT applications
            requiring long-range communication and minimal energy consumption. However, as the number of connected
            devices increases, the default <strong className="text-slate-300">Pure ALOHA</strong> medium access control
            (MAC) protocol leads to a high rate of packet collisions, degrading the Packet Delivery Ratio (PDR) and
            wasting scarce energy resources.
          </p>
          <p>
            The core challenge lies in scheduling uplink transmissions from thousands of energy-constrained sensor
            nodes across a limited number of gateways and wireless channels, without introducing excessive overhead or
            requiring tight time synchronization. Existing approaches like fixed-slot scheduling reduce collisions but
            lack the adaptability needed for dynamic, heterogeneous IoT traffic.
          </p>
        </div>
      </Card>

      {/* Objectives */}
      <Card title="Research Objectives" icon={ListChecks}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Analyze collision behavior in LoRaWAN under varying device densities and traffic loads',
            'Design a Collision-Aware Dynamic Scheduling (CADS) algorithm that adapts to real-time network conditions',
            'Model LoRa physical layer parameters (spreading factor, airtime, energy) for accurate simulation',
            'Compare CADS against Pure ALOHA and Fixed-Slot Scheduling across multiple performance metrics',
            'Evaluate network scalability from 50 to 1000 IoT devices',
            'Quantify improvements in PDR, collision rate, energy consumption, and throughput',
          ].map((obj, i) => (
            <div key={i} className="flex items-start gap-3 bg-navy-800 rounded-lg p-3">
              <CheckCircle className="w-4 h-4 text-accent-green mt-0.5 shrink-0" />
              <span className="text-sm text-slate-400">{obj}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Methodology */}
      <Card title="Research Methodology" icon={FlaskConical}>
        <div className="space-y-4">
          <Step num={1} title="Physical Layer Modeling" desc="LoRa airtime is computed using the Semtech SX1272 formula: T_air = T_preamble + T_payload, where T_sym = 2^SF / BW. Energy is modeled as E = V × I_TX × T_air + V × I_RX × T_listen." />
          <Step num={2} title="Traffic Generation" desc="Each IoT device generates packets according to the selected traffic load (Low to Saturated). Packets are distributed across channels and time slots using a deterministic PRNG for reproducibility." />
          <Step num={3} title="Collision Modeling" desc="A collision occurs when two or more nodes transmit on the same channel during overlapping time windows. The model tracks per-slot, per-channel occupancy to detect collisions." />
          <Step num={4} title="Algorithm Implementation" desc="Three MAC protocols are implemented: Pure ALOHA (uncoordinated), Fixed-Slot (deterministic slot assignment), and CADS (adaptive channel/slot selection with collision awareness)." />
          <Step num={5} title="Parametric Evaluation" desc="Sweeps are performed across device count (50–1000), traffic load, and spreading factor (SF7–SF12) to evaluate each algorithm under diverse conditions." />
        </div>
      </Card>

      {/* Proposed algorithm */}
      <Card title="Proposed Algorithm: CADS" icon={Cpu}>
        <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
          <p>
            <strong className="text-accent-cyan">Collision-Aware Dynamic Scheduling (CADS)</strong> is the proposed
            MAC protocol designed to minimize packet collisions in dense LoRaWAN deployments. Unlike Pure ALOHA, which
            allows uncoordinated access, and Fixed-Slot, which assigns rigid time slots, CADS dynamically selects the
            least-loaded channel and time slot for each transmission.
          </p>
          <div className="bg-navy-800 rounded-lg p-4 font-mono text-xs text-slate-400 leading-relaxed">
            <div className="text-accent-cyan mb-2">// CADS Algorithm Pseudocode</div>
            <div>for each packet to transmit:</div>
            <div className="pl-4">scan channel load across all channels</div>
            <div className="pl-4">select channel_c with minimum occupancy</div>
            <div className="pl-4">select time_slot_s with minimum queue length</div>
            <div className="pl-4">if collision_detected(c, s):</div>
            <div className="pl-8">reassign to next least-loaded (c', s')</div>
            <div className="pl-4">transmit on (c, s) or (c', s')</div>
            <div className="pl-4">update channel occupancy table</div>
          </div>
          <p>
            By maintaining a real-time view of channel utilization, CADS achieves significantly higher PDR and lower
            collision rates, especially as device density and traffic load increase. The trade-off is slightly higher
            computational complexity and execution time, which is acceptable given the energy savings from avoided
            retransmissions.
          </p>
        </div>
      </Card>

      {/* Performance metrics */}
      <Card title="Performance Metrics" icon={Gauge}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Packet Delivery Ratio (PDR)', desc: 'Percentage of packets successfully received at the gateway', unit: '%' },
            { name: 'Collision Rate', desc: 'Fraction of transmitted packets that experience collisions', unit: '%' },
            { name: 'Average Packet Airtime', desc: 'Time a packet occupies the channel during transmission', unit: 'ms' },
            { name: 'Energy Consumption', desc: 'Total energy consumed by all devices for transmission and listening', unit: 'mJ' },
            { name: 'Network Throughput', desc: 'Successfully delivered data rate at the gateway', unit: 'kbps' },
            { name: 'Execution Time', desc: 'Computational time required by the scheduling algorithm', unit: 'ms' },
          ].map((m) => (
            <div key={m.name} className="bg-navy-800 rounded-lg p-4 border border-navy-700">
              <div className="text-sm font-semibold text-slate-200 mb-1">{m.name}</div>
              <div className="text-xs text-slate-500 mb-2">{m.desc}</div>
              <div className="text-xs font-mono text-accent-cyan">Unit: {m.unit}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Expected contribution */}
      <Card title="Expected Research Contribution" icon={Lightbulb}>
        <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-accent-cyan mt-0.5 shrink-0" />
            <p>
              A novel collision-aware MAC scheduling algorithm that demonstrably outperforms baseline approaches
              (Pure ALOHA and Fixed-Slot) in dense LoRaWAN scenarios, with PDR improvements of 15–40% under high
              traffic load.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-accent-cyan mt-0.5 shrink-0" />
            <p>
              A comprehensive simulation framework that models LoRa physical-layer parameters (airtime, energy, SF)
              alongside MAC-layer collision dynamics, enabling reproducible evaluation of scheduling protocols.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-accent-cyan mt-0.5 shrink-0" />
            <p>
              Quantitative evidence that adaptive, channel-aware scheduling is critical for LoRaWAN scalability beyond
              a few hundred devices, providing a foundation for future work on multi-gateway coordination and
              learning-based scheduling.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-mono font-bold text-sm shrink-0">
        {num}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-200 mb-1">{title}</div>
        <div className="text-sm text-slate-400 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
