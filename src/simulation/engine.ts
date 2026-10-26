import type { Algorithm, SimConfig, SimResult, NodeEvent, TimeSeriesPoint, SweepPoint, SpreadingFactor, TrafficLoad } from '@/types';

// ============================================================================
// LoRa Physical Layer Model
// ============================================================================
// Airtime is computed using the Semtech SX1272 datasheet formula:
//   T_sym    = 2^SF / BW                         (seconds)
//   T_pream  = (4.25 + 8) * T_sym                (preamble = 8 symbols + 4.25 chip)
//   payloadSymbNb = 8 + max(ceil((8*PL - 4*SF + 28 + 16*CRC - 20*IH) / (4*(SF-DE))) * (CR+4), 0)
//   T_payload = payloadSymbNb * T_sym
//   T_air    = T_pream + T_payload
//
// Parameters fixed for this simulation (simplifying assumptions):
//   BW          = 125 kHz (EU868 default)
//   CR          = 4/5  (coding rate denominator → CR_exp = 1)
//   IH          = 0    (explicit header enabled — the normal LoRaWAN case)
//   CRC         = 1    (CRC enabled)
//   PL          = 20 bytes (typical sensor payload)
//   DE          = 1 when SF >= 11 (low-data-rate optimization), else 0
// ============================================================================

const BANDWIDTH_HZ = 125_000;
const CODING_RATE_EXP = 1; // 4/5 → (CR + 4) = 5
const IMPLICIT_HEADER = 0; // IH = 0 → explicit header
const CRC_ENABLED = 1;
const PAYLOAD_BYTES = 20;

export function computeAirtimeMs(sf: SpreadingFactor, payloadBytes: number = PAYLOAD_BYTES): number {
  const symbolDurationMs = (Math.pow(2, sf) / BANDWIDTH_HZ) * 1000;
  const de = sf >= 11 ? 1 : 0; // low-data-rate optimize
  const numerator = 8 * payloadBytes - 4 * sf + 28 + 16 * CRC_ENABLED - 20 * IMPLICIT_HEADER;
  const denominator = 4 * (sf - de);
  const payloadSymbNb = 8 + Math.max(Math.ceil(numerator / denominator) * (CODING_RATE_EXP + 4), 0);
  const preambleDurationMs = (4.25 + 8) * symbolDurationMs;
  const payloadDurationMs = payloadSymbNb * symbolDurationMs;
  return preambleDurationMs + payloadDurationMs;
}

// ============================================================================
// Energy Model
// ============================================================================
// E_tx = V * I_tx * T_air         (during transmission)
// E_rx = V * I_rx * T_listen      (during receive/listen between transmissions)
//
// Unit derivation:
//   V in volts, I in amperes, T in seconds → E in joules.
//   I_tx = 28 mA = 0.028 A,  I_rx = 1.6 mA = 0.0016 A
//   T in ms → divide by 1000 to get seconds.
//   E (J) = V * I(A) * T(s) = V * I(mA)/1000 * T(ms)/1000
//   E (µJ) = E(J) * 1e6 = V * I(mA) * T(ms) / 1000
//
// So: E_tx(µJ) = 3.3 * 28 * airtimeMs / 1000 = 0.0924 * airtimeMs
//     E_rx(µJ) = 3.3 * 1.6 * listenMs / 1000 = 0.00528 * listenMs
// ============================================================================

const SUPPLY_VOLTAGE = 3.3; // volts
const TX_CURRENT_MA = 28; // transmit current
const RX_CURRENT_MA = 1.6; // receive/listen current

export function computeEnergyMicroJoules(airtimeMs: number, listenMs: number): number {
  const txEnergy = (SUPPLY_VOLTAGE * TX_CURRENT_MA * airtimeMs) / 1000; // µJ
  const rxEnergy = (SUPPLY_VOLTAGE * RX_CURRENT_MA * listenMs) / 1000; // µJ
  return txEnergy + rxEnergy;
}

// ============================================================================
// Traffic Model
// ============================================================================
// Each device generates packets following a Poisson-like process.
// The offered load (packets/sec/device) is determined by the traffic setting:
//   Low      → 0.2  (1 packet every ~5 s)
//   Medium   → 0.5  (1 packet every ~2 s)
//   High     → 1.0  (1 packet per second)
//   Saturated → 2.0 (2 packets per second)
//
// Simplifying assumption: all devices have the same average rate.
// ============================================================================

const trafficPacketsPerDevice: Record<TrafficLoad, number> = {
  Low: 0.2,
  Medium: 0.5,
  High: 1.0,
  Saturated: 2.0,
};

// ============================================================================
// Deterministic PRNG (mulberry32) for reproducible simulations
// ============================================================================

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashConfig(config: SimConfig): number {
  const s = `${config.numDevices}-${config.numGateways}-${config.numChannels}-${config.trafficLoad}-${config.durationSec}-${config.spreadingFactor}-${config.algorithm}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ============================================================================
// Transmission Record — internal type for the simulation loop
// ============================================================================

interface Transmission {
  deviceId: number;
  gatewayId: number;
  channel: number;
  startMs: number;
  endMs: number;
  packetIndex: number;
}

// ============================================================================
// Collision Detection
// ============================================================================
// Two transmissions collide if they are on the same channel AND their
// time intervals [start, end) overlap, AND they target the same gateway.
//
// Simplifying assumption: we do not model capture effect (where a stronger
// signal can survive overlap). Any overlap on the same channel+gateway
// is a collision for all involved packets.
//
// Gateway independence: packets to different gateways on the same channel
// do not collide (the gateways are spatially separated receivers). This is
// a simplification — in reality near-by gateways can still interfere, but
// for a MAC-level study we treat each gateway as an independent receiver.
// ============================================================================

/**
 * Given a new transmission and a list of already-processed transmissions,
 * determine whether the new transmission collides with any existing one.
 * Returns true if a collision is detected. Also marks the colliding
 * existing transmissions as collided (since collisions affect all parties).
 */
function checkCollision(
  tx: Transmission,
  existing: Transmission[],
  collidedSet: Set<number>,
): boolean {
  let hasCollision = false;
  for (const other of existing) {
    if (other.endMs <= tx.startMs || other.startMs >= tx.endMs) continue; // no time overlap
    if (other.channel !== tx.channel) continue; // different channel
    if (other.gatewayId !== tx.gatewayId) continue; // different gateway
    // Overlap on same channel + same gateway → collision for both
    hasCollision = true;
    collidedSet.add(other.packetIndex);
  }
  if (hasCollision) {
    collidedSet.add(tx.packetIndex);
  }
  return hasCollision;
}

// ============================================================================
// Scheduling Algorithms
// ============================================================================
// All three algorithms receive the SAME set of packet generation events
// (same device, same start time, same channel preferences from the PRNG).
// The difference is how each algorithm assigns a channel and/or adjusts
// the start time:
//
// 1. Pure ALOHA:
//    - Each device transmits immediately when it has a packet.
//    - Channel is selected randomly (uniform across available channels).
//    - No coordination → collisions happen when transmissions overlap.
//
// 2. Fixed-Slot Scheduling:
//    - Time is divided into fixed slots of length = airtimeMs.
//    - Each device is assigned a deterministic slot index:
//        slotIndex = (deviceId * numChannels + channelId) mod totalSlotsPerFrame
//      where totalSlotsPerFrame = floor(durationMs / airtimeMs).
//    - The device transmits at the nearest available slot ≥ its generated time.
//    - If two devices map to the same slot + channel, they collide.
//    - No artificial sync-failure probability is added.
//
// 3. Collision-Aware Dynamic Scheduling (CADS):
//    - Before transmitting, the device senses which channels are currently
//      occupied (i.e., which channels have an active transmission whose
//      interval overlaps the would-be start time).
//    - It defers its transmission to the earliest time when at least one
//      channel is free, then picks the least-recently-used free channel.
//    - If ALL channels are occupied for the entire remaining simulation,
//      it transmits anyway (forced collision — no artificial avoidance).
//    - This models a simple listen-before-talk with channel selection.
// ============================================================================

/**
 * Schedule a single packet under the given algorithm.
 * Returns the channel and adjusted start time for the transmission.
 */
function schedulePacket(
  algorithm: Algorithm,
  deviceId: number,
  rawStartMs: number,
  channelHint: number,
  numChannels: number,
  airtimeMs: number,
  durationMs: number,
  activeTransmissions: Transmission[],
): { channel: number; startMs: number } {
  if (algorithm === 'ALOHA') {
    // Transmit immediately on a randomly chosen channel
    return { channel: channelHint, startMs: rawStartMs };
  }

  if (algorithm === 'Fixed-Slot') {
    // Align to the nearest slot boundary >= rawStartMs
    const slotLen = airtimeMs;
    const totalSlots = Math.max(1, Math.floor(durationMs / slotLen));
    const slotIndex = (deviceId * numChannels + channelHint) % totalSlots;
    const slotStartMs = slotIndex * slotLen;
    // If the slot has already passed, push to the next frame
    let alignedStart = slotStartMs;
    while (alignedStart < rawStartMs) {
      alignedStart += totalSlots * slotLen;
    }
    // Don't exceed simulation duration
    if (alignedStart + airtimeMs > durationMs) {
      alignedStart = rawStartMs; // fall back to immediate if no slot fits
    }
    return { channel: channelHint, startMs: alignedStart };
  }

  // CADS: listen-before-talk with channel selection
  // Find the earliest start time where at least one channel is free
  let startMs = rawStartMs;
  // Check at most a bounded number of candidate times (don't loop forever)
  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const endMs = startMs + airtimeMs;
    const occupiedChannels = new Set<number>();
    for (const tx of activeTransmissions) {
      if (tx.endMs <= startMs || tx.startMs >= endMs) continue;
      if (tx.gatewayId !== deviceId) continue; // gateway check done elsewhere; here we just check channel occupancy
      occupiedChannels.add(tx.channel);
    }
    const freeChannels: number[] = [];
    for (let c = 0; c < numChannels; c++) {
      if (!occupiedChannels.has(c)) freeChannels.push(c);
    }
    if (freeChannels.length > 0) {
      // Pick the lowest-numbered free channel (deterministic)
      return { channel: freeChannels[0], startMs };
    }
    // All channels busy — defer to the earliest end time of active transmissions
    let earliestEnd = Infinity;
    for (const tx of activeTransmissions) {
      if (tx.endMs > startMs && tx.endMs < earliestEnd) {
        earliestEnd = tx.endMs;
      }
    }
    if (earliestEnd === Infinity || earliestEnd + airtimeMs > durationMs) {
      // No way to avoid collision — transmit now on channelHint (forced collision)
      return { channel: channelHint, startMs };
    }
    startMs = earliestEnd;
  }
  // Exhausted attempts — transmit now (may collide)
  return { channel: channelHint, startMs };
}

// ============================================================================
// Main Simulation
// ============================================================================

export function runSimulation(config: SimConfig): SimResult {
  const t0 = performance.now();

  // --- Input validation ---
  const numDevices = Math.max(0, Math.floor(config.numDevices));
  const numGateways = Math.max(1, Math.floor(config.numGateways));
  const numChannels = Math.max(1, Math.floor(config.numChannels));
  const durationSec = Math.max(0, config.durationSec);
  const durationMs = durationSec * 1000;

  const airtimeMs = computeAirtimeMs(config.spreadingFactor);
  const packetsPerDevicePerSec = trafficPacketsPerDevice[config.trafficLoad];
  const totalPackets = Math.round(numDevices * packetsPerDevicePerSec * durationSec);

  // Early exit for degenerate configs
  if (totalPackets <= 0 || numDevices <= 0 || durationSec <= 0) {
    return {
      config,
      pdr: 0,
      collisionRate: 0,
      avgAirtimeMs: Math.round(airtimeMs * 100) / 100,
      energyConsumptionMJ: 0,
      executionTimeMs: Math.round((performance.now() - t0) * 100) / 100,
      totalPackets: 0,
      successfulPackets: 0,
      collidedPackets: 0,
      throughput: 0,
      nodeEvents: [],
      timeseries: [],
    };
  }

  const rng = mulberry32(hashConfig(config));

  // --- Generate node and gateway positions for topology visualization ---
  const gatewayPositions = Array.from({ length: numGateways }, (_, i) => {
    const angle = (i / numGateways) * Math.PI * 2;
    return { x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) };
  });

  const nodePositions = Array.from({ length: numDevices }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    const radius = 10 + rng() * 40;
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  });

  // --- Generate packet events ---
  // Each packet has: deviceId, rawStartMs (when the device wants to send),
  // channelHint (random channel preference), gatewayId (random target).
  interface PacketEvent {
    packetIndex: number;
    deviceId: number;
    gatewayId: number;
    channelHint: number;
    rawStartMs: number;
  }

  const packets: PacketEvent[] = [];
  for (let p = 0; p < totalPackets; p++) {
    const deviceId = Math.floor(rng() * numDevices);
    const gatewayId = Math.floor(rng() * numGateways);
    const channelHint = Math.floor(rng() * numChannels);
    // Uniformly distribute start times across the simulation duration
    const rawStartMs = rng() * durationMs;
    packets.push({ packetIndex: p, deviceId, gatewayId, channelHint, rawStartMs });
  }

  // Sort packets by raw start time so the scheduler processes them in order
  packets.sort((a, b) => a.rawStartMs - b.rawStartMs);

  // --- Run the scheduling algorithm ---
  const transmissions: Transmission[] = [];
  const collidedSet = new Set<number>();

  for (const pkt of packets) {
    const { channel, startMs } = schedulePacket(
      config.algorithm,
      pkt.deviceId,
      pkt.rawStartMs,
      pkt.channelHint,
      numChannels,
      airtimeMs,
      durationMs,
      transmissions,
    );

    // Clamp start time so the packet doesn't extend beyond simulation duration
    const actualStart = Math.min(startMs, Math.max(0, durationMs - airtimeMs));
    const endMs = actualStart + airtimeMs;

    const tx: Transmission = {
      deviceId: pkt.deviceId,
      gatewayId: pkt.gatewayId,
      channel,
      startMs: actualStart,
      endMs,
      packetIndex: pkt.packetIndex,
    };

    // Check for collision against all existing transmissions
    checkCollision(tx, transmissions, collidedSet);
    transmissions.push(tx);
  }

  // --- Tally results ---
  const successful = totalPackets - collidedSet.size;
  const collided = collidedSet.size;

  // --- Build timeseries (per-second aggregation of actual outcomes) ---
  const numTimeBuckets = Math.min(Math.ceil(durationSec), 120);
  const bucketSizeMs = durationMs / numTimeBuckets;
  const timeseries: TimeSeriesPoint[] = [];
  for (let b = 0; b < numTimeBuckets; b++) {
    const bucketStart = b * bucketSizeMs;
    const bucketEnd = (b + 1) * bucketSizeMs;
    let s = 0;
    let c = 0;
    for (const tx of transmissions) {
      if (tx.startMs >= bucketStart && tx.startMs < bucketEnd) {
        if (collidedSet.has(tx.packetIndex)) {
          c++;
        } else {
          s++;
        }
      }
    }
    timeseries.push({ time: b + 1, success: s, collision: c });
  }

  // --- Build node events for topology visualization (sample up to 200) ---
  const events: NodeEvent[] = [];
  const sampleStep = Math.max(1, Math.floor(transmissions.length / 200));
  for (let i = 0; i < transmissions.length && events.length < 200; i += sampleStep) {
    const tx = transmissions[i];
    const np = nodePositions[tx.deviceId] || { x: 50, y: 50 };
    const gp = gatewayPositions[tx.gatewayId] || { x: 50, y: 50 };
    events.push({
      deviceId: tx.deviceId,
      x: np.x,
      y: np.y,
      gatewayId: tx.gatewayId,
      gx: gp.x,
      gy: gp.y,
      status: collidedSet.has(tx.packetIndex) ? 'collision' : 'success',
      airtimeMs,
      startTimeMs: tx.startMs,
    });
  }

  // --- Compute metrics ---
  const pdr = totalPackets > 0 ? (successful / totalPackets) * 100 : 0;
  const collisionRate = totalPackets > 0 ? (collided / totalPackets) * 100 : 0;

  // Energy: each packet costs TX energy (airtime) + RX listening energy.
  // Listening time per device = total duration / packets sent by that device.
  // Average packets per device = totalPackets / numDevices.
  const avgPacketsPerDevice = totalPackets / numDevices;
  const avgListenMsPerPacket = avgPacketsPerDevice > 0 ? durationMs / avgPacketsPerDevice : 0;
  const energyPerPacket = computeEnergyMicroJoules(airtimeMs, avgListenMsPerPacket);
  // Total energy = energy per packet × total packets (all attempted transmissions consume energy,
  // including collided ones, since the radio was active regardless of outcome)
  const totalEnergyMicroJoules = energyPerPacket * totalPackets;

  // Throughput: successfully delivered bits per second, in kbps
  //   bits = successfulPackets * payloadBytes * 8
  //   kbps = bits / durationSec / 1000
  const throughput = durationSec > 0 ? (successful * PAYLOAD_BYTES * 8) / (durationSec * 1000) : 0;

  const t1 = performance.now();
  const execTime = t1 - t0; // actual local runtime, no artificial scaling

  return {
    config,
    pdr: Math.round(pdr * 100) / 100,
    collisionRate: Math.round(collisionRate * 100) / 100,
    avgAirtimeMs: Math.round(airtimeMs * 100) / 100,
    energyConsumptionMJ: Math.round(totalEnergyMicroJoules * 100) / 100, // stored in µJ (field name kept for compat)
    executionTimeMs: Math.round(execTime * 100) / 100,
    totalPackets,
    successfulPackets: successful,
    collidedPackets: collided,
    throughput: Math.round(throughput * 100) / 100,
    nodeEvents: events,
    timeseries,
  };
}

// ============================================================================
// Sweep — runs simulations across a range of one variable
// ============================================================================

export function runSweep(
  baseConfig: SimConfig,
  variable: 'numDevices' | 'trafficLoad' | 'spreadingFactor',
  values: number[],
  algorithms: Algorithm[],
): SweepPoint[] {
  const results: SweepPoint[] = [];
  for (const algo of algorithms) {
    for (const v of values) {
      const cfg: SimConfig = { ...baseConfig, algorithm: algo };
      if (variable === 'numDevices') cfg.numDevices = v;
      if (variable === 'trafficLoad') {
        const loads: TrafficLoad[] = ['Low', 'Medium', 'High', 'Saturated'];
        cfg.trafficLoad = loads[Math.min(Math.floor(v), 3)];
      }
      if (variable === 'spreadingFactor') cfg.spreadingFactor = v as SpreadingFactor;
      const res = runSimulation(cfg);
      results.push({
        xValue: v,
        algorithm: algo,
        pdr: res.pdr,
        collisionRate: res.collisionRate,
        avgAirtimeMs: res.avgAirtimeMs,
        energyConsumptionMJ: res.energyConsumptionMJ,
        executionTimeMs: res.executionTimeMs,
      });
    }
  }
  return results;
}
