export type Algorithm = 'ALOHA' | 'Fixed-Slot' | 'CADS';
export type SpreadingFactor = 7 | 8 | 9 | 10 | 11 | 12;
export type TrafficLoad = 'Low' | 'Medium' | 'High' | 'Saturated';

export interface SimConfig {
  numDevices: number;
  numGateways: number;
  numChannels: number;
  trafficLoad: TrafficLoad;
  durationSec: number;
  spreadingFactor: SpreadingFactor;
  algorithm: Algorithm;
}

export interface SimResult {
  config: SimConfig;
  pdr: number;
  collisionRate: number;
  avgAirtimeMs: number;
  energyConsumptionMJ: number;
  executionTimeMs: number;
  totalPackets: number;
  successfulPackets: number;
  collidedPackets: number;
  throughput: number;
  nodeEvents: NodeEvent[];
  timeseries: TimeSeriesPoint[];
}

export interface NodeEvent {
  deviceId: number;
  x: number;
  y: number;
  gatewayId: number;
  gx: number;
  gy: number;
  status: 'success' | 'collision' | 'idle';
  airtimeMs: number;
  startTimeMs: number;
}

export interface TimeSeriesPoint {
  time: number;
  success: number;
  collision: number;
}

export interface SweepPoint {
  xValue: number;
  algorithm: Algorithm;
  pdr: number;
  collisionRate: number;
  avgAirtimeMs: number;
  energyConsumptionMJ: number;
  executionTimeMs: number;
}
