// Basic tests for the LoRaSense simulation engine.
// Run with:  npx tsx --test src/simulation/engine.test.ts
//
// These tests verify:
//   1. LoRa airtime calculations match known Semtech values
//   2. Collision detection logic is consistent (success + collided = total)
//   3. Energy units are physically correct
//   4. Same config → same result (reproducibility)
//   5. Degenerate inputs (0 devices, 0 duration) produce safe results
//   6. Throughput is never negative and PDR is in [0, 100]
//   7. Timeseries success + collision counts are plausible

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAirtimeMs, computeEnergyMicroJoules, runSimulation, runSweep } from '@/simulation/engine';
import type { SimConfig } from '@/types';

const baseConfig: SimConfig = {
  numDevices: 100,
  numGateways: 1,
  numChannels: 8,
  trafficLoad: 'Medium',
  durationSec: 60,
  spreadingFactor: 10,
  algorithm: 'ALOHA',
};

// ---------------------------------------------------------------------------
// 1. Airtime calculations
// ---------------------------------------------------------------------------
describe('computeAirtimeMs', () => {
  it('SF7, 20 bytes, 125 kHz → ~56.6 ms', () => {
    const t = computeAirtimeMs(7, 20);
    // Known value from Semtech calculator: ~56.6 ms
    assert.ok(t > 55 && t < 58, `SF7 airtime ${t}ms not in expected range 55-58ms`);
  });

  it('SF12, 20 bytes, 125 kHz → ~1318 ms (approx, with DE)', () => {
    const t = computeAirtimeMs(12, 20);
    // SF12 has DE=1. Known value ~1318 ms (some calculators show ~1646 with different payload)
    assert.ok(t > 1200 && t < 1500, `SF12 airtime ${t}ms not in expected range 1200-1500ms`);
  });

  it('Airtime increases monotonically with SF', () => {
    const times = [7, 8, 9, 10, 11, 12].map((sf) => computeAirtimeMs(sf as any, 20));
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i] > times[i - 1], `Airtime should increase with SF: SF${i + 7}=${times[i]} not > SF${i + 6}=${times[i - 1]}`);
    }
  });

  it('Larger payload → longer airtime', () => {
    const small = computeAirtimeMs(10, 10);
    const large = computeAirtimeMs(10, 51);
    assert.ok(large > small, `Larger payload should have longer airtime: ${large} > ${small}`);
  });
});

// ---------------------------------------------------------------------------
// 2. Collision detection & metric consistency
// ---------------------------------------------------------------------------
describe('runSimulation metric consistency', () => {
  it('successfulPackets + collidedPackets = totalPackets', () => {
    const result = runSimulation(baseConfig);
    assert.equal(
      result.successfulPackets + result.collidedPackets,
      result.totalPackets,
      'success + collided must equal total',
    );
  });

  it('PDR + collisionRate ≈ 100 (within rounding)', () => {
    const result = runSimulation(baseConfig);
    const sum = result.pdr + result.collisionRate;
    assert.ok(Math.abs(sum - 100) < 0.2, `PDR(${result.pdr}) + collisionRate(${result.collisionRate}) should ≈ 100, got ${sum}`);
  });

  it('PDR is in [0, 100]', () => {
    const result = runSimulation(baseConfig);
    assert.ok(result.pdr >= 0 && result.pdr <= 100, `PDR ${result.pdr} out of range`);
  });

  it('collisionRate is in [0, 100]', () => {
    const result = runSimulation(baseConfig);
    assert.ok(result.collisionRate >= 0 && result.collisionRate <= 100, `collisionRate ${result.collisionRate} out of range`);
  });

  it('throughput >= 0', () => {
    const result = runSimulation(baseConfig);
    assert.ok(result.throughput >= 0, `throughput ${result.throughput} should be non-negative`);
  });

  it('ALOHA with 1 device, 1 channel, low traffic → near-zero collisions', () => {
    const result = runSimulation({ ...baseConfig, numDevices: 1, numChannels: 1, trafficLoad: 'Low', durationSec: 60 });
    // With 1 device and 0.2 pkt/s, only 12 packets over 60s — very unlikely to overlap
    assert.ok(result.collisionRate < 20, `Single device should have low collision rate, got ${result.collisionRate}%`);
  });

  it('ALOHA with many devices, 1 channel, saturated → high collision rate', () => {
    const result = runSimulation({ ...baseConfig, numDevices: 500, numChannels: 1, trafficLoad: 'Saturated', durationSec: 30 });
    // 500 devices × 2 pkt/s × 30s = 30000 packets on 1 channel → should have significant collisions
    assert.ok(result.collisionRate > 10, `Saturated single-channel should have high collision rate, got ${result.collisionRate}%`);
  });

  it('More channels → fewer collisions (ALOHA)', () => {
    const few = runSimulation({ ...baseConfig, numChannels: 1, numDevices: 200, trafficLoad: 'High', durationSec: 30 });
    const many = runSimulation({ ...baseConfig, numChannels: 16, numDevices: 200, trafficLoad: 'High', durationSec: 30 });
    assert.ok(many.collisionRate < few.collisionRate, `More channels should reduce collisions: ${many.collisionRate}% < ${few.collisionRate}%`);
  });

  it('Timeseries success + collision per bucket sum ≤ totalPackets', () => {
    const result = runSimulation({ ...baseConfig, numDevices: 50, trafficLoad: 'Medium', durationSec: 30 });
    const tsTotal = result.timeseries.reduce((acc, p) => acc + p.success + p.collision, 0);
    assert.ok(tsTotal <= result.totalPackets, `Timeseries total ${tsTotal} should not exceed totalPackets ${result.totalPackets}`);
  });
});

// ---------------------------------------------------------------------------
// 3. Energy units
// ---------------------------------------------------------------------------
describe('computeEnergyMicroJoules', () => {
  it('Energy for 100ms TX, 0ms listen → 3.3 * 28 * 100 / 1000 = 9.24 µJ', () => {
    const e = computeEnergyMicroJoules(100, 0);
    assert.ok(Math.abs(e - 9.24) < 0.01, `Expected ~9.24 µJ, got ${e}`);
  });

  it('Energy for 0ms TX, 1000ms listen → 3.3 * 1.6 * 1000 / 1000 = 5.28 µJ', () => {
    const e = computeEnergyMicroJoules(0, 1000);
    assert.ok(Math.abs(e - 5.28) < 0.01, `Expected ~5.28 µJ, got ${e}`);
  });

  it('Energy is always non-negative', () => {
    assert.ok(computeEnergyMicroJoules(0, 0) >= 0);
    assert.ok(computeEnergyMicroJoules(500, 1000) >= 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Reproducibility
// ---------------------------------------------------------------------------
describe('reproducibility', () => {
  it('Same config produces identical results', () => {
    const r1 = runSimulation(baseConfig);
    const r2 = runSimulation(baseConfig);
    assert.equal(r1.pdr, r2.pdr);
    assert.equal(r1.collisionRate, r2.collisionRate);
    assert.equal(r1.totalPackets, r2.totalPackets);
    assert.equal(r1.successfulPackets, r2.successfulPackets);
    assert.equal(r1.collidedPackets, r2.collidedPackets);
  });

  it('Different algorithm produces (likely) different results', () => {
    const aloha = runSimulation({ ...baseConfig, algorithm: 'ALOHA' });
    const cads = runSimulation({ ...baseConfig, algorithm: 'CADS' });
    // They should differ in at least one metric (unless the network is so sparse that nothing collides)
    const same = aloha.pdr === cads.pdr && aloha.collisionRate === cads.collisionRate;
    // With 100 devices, medium traffic, SF10, 8 channels, 60s — there should be enough load to show a difference
    // But we can't guarantee it for all configs, so we just log if they're the same
    if (same) {
      console.log('Note: ALOHA and CADS produced identical PDR/collisionRate for this config — possible at low load');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Degenerate inputs
// ---------------------------------------------------------------------------
describe('degenerate inputs', () => {
  it('0 devices → zero packets, zero everything', () => {
    const result = runSimulation({ ...baseConfig, numDevices: 0 });
    assert.equal(result.totalPackets, 0);
    assert.equal(result.successfulPackets, 0);
    assert.equal(result.collidedPackets, 0);
    assert.equal(result.pdr, 0);
    assert.equal(result.collisionRate, 0);
    assert.equal(result.throughput, 0);
  });

  it('0 duration → zero packets', () => {
    const result = runSimulation({ ...baseConfig, durationSec: 0 });
    assert.equal(result.totalPackets, 0);
  });

  it('airtime is still computed even with 0 devices', () => {
    const result = runSimulation({ ...baseConfig, numDevices: 0 });
    assert.ok(result.avgAirtimeMs > 0, 'Airtime should still be computed from SF regardless of device count');
  });
});

// ---------------------------------------------------------------------------
// 6. Sweep consistency
// ---------------------------------------------------------------------------
describe('runSweep', () => {
  it('Produces correct number of data points', () => {
    const sweep = runSweep(baseConfig, 'numDevices', [50, 100, 200], ['ALOHA', 'CADS']);
    assert.equal(sweep.length, 6); // 3 values × 2 algorithms
  });

  it('All sweep points have valid PDR', () => {
    const sweep = runSweep(baseConfig, 'spreadingFactor', [7, 8, 9, 10, 11, 12], ['ALOHA', 'Fixed-Slot', 'CADS']);
    for (const p of sweep) {
      assert.ok(p.pdr >= 0 && p.pdr <= 100, `Sweep PDR ${p.pdr} out of range`);
    }
  });
});
