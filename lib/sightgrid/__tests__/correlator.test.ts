/**
 * SightGrid correlator tests.
 *
 * All timestamps are deterministic ISO strings.
 * Zone topology used (from topology.ts):
 *   north-gate ↔ courtyard ↔ block-a
 *              ↔ block-b
 *
 * north-gate ↔ courtyard  travel range: 3 000 – 20 000 ms
 * courtyard  ↔ block-a    travel range: 3 000 – 18 000 ms
 * courtyard  ↔ block-b    travel range: 4 000 – 20 000 ms
 * north-gate and block-a are NOT adjacent.
 */

import { describe, it, expect } from 'vitest'
import {
  evaluateCorrelation,
  addEventToIncident,
  createIncident,
  resolveIncident,
} from '../correlator'
import type { SightGridEvent, SightGridIncident } from '../types'

// ─── helpers ────────────────────────────────────────────────────────────────

const BASE_TIME = new Date('2024-01-01T12:00:00.000Z').getTime()

function makeEvent(
  overrides: Partial<SightGridEvent> & { zoneId: string; offsetMs: number }
): SightGridEvent {
  const { offsetMs, ...rest } = overrides
  return {
    id: `evt-${offsetMs}-${rest.zoneId}`,
    source: 'simulated',
    deviceId: `device-${rest.zoneId}`,
    deviceName: `Device ${rest.zoneId}`,
    type: 'motion',
    observationClass: 'person',
    timestamp: new Date(BASE_TIME + offsetMs).toISOString(),
    ...rest,
  }
}

// ─── evaluateCorrelation ─────────────────────────────────────────────────────

describe('evaluateCorrelation', () => {
  // 1. Valid adjacent-zone correlation
  it('correlates adjacent-zone events inside the time and travel window', () => {
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const next = makeEvent({ zoneId: 'courtyard', offsetMs: 10_000 }) // 10 s, within 3–20 s

    const result = evaluateCorrelation(prev, next)

    expect(result.correlated).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.65)
    expect(result.timeDifferenceMs).toBe(10_000)

    const spatial = result.reasons.find(r => r.label === 'Spatial adjacency')
    expect(spatial?.passed).toBe(true)
  })

  // 2. Non-adjacent zones are rejected
  it('rejects events from non-adjacent zones', () => {
    // north-gate and block-a share no direct edge
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const next = makeEvent({ zoneId: 'block-a', offsetMs: 5_000 })

    const result = evaluateCorrelation(prev, next)

    expect(result.correlated).toBe(false)

    const spatial = result.reasons.find(r => r.label === 'Spatial adjacency')
    expect(spatial?.passed).toBe(false)
    expect(spatial?.score).toBe(0)
  })

  // 3. Events outside the 30 s correlation window are rejected
  it('rejects events that exceed the 30 s correlation window', () => {
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const next = makeEvent({ zoneId: 'courtyard', offsetMs: 31_000 }) // 31 s > 30 s window

    const result = evaluateCorrelation(prev, next)

    expect(result.correlated).toBe(false)

    const temporal = result.reasons.find(r => r.label === 'Temporal proximity')
    expect(temporal?.passed).toBe(false)
    expect(temporal?.score).toBe(0)
  })

  // 4. Travel-time implausible events are rejected
  it('rejects events where timing is implausible for the travel distance', () => {
    /*
     * north-gate → courtyard: maxMs = 20 000, tolerance = 5 000.
     * At 26 000 ms the event is above maxMs + tolerance (25 000 ms),
     * so travelScore = 0. Combined confidence drops below 0.65.
     *
     * Note: the tolerance lower-bound clamps to max(0, minMs - 5000) = 0,
     * so sub-minimum times cannot be rejected via travel score alone —
     * the above-maximum path is the reliable implausibility signal.
     */
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const next = makeEvent({ zoneId: 'courtyard', offsetMs: 26_000 }) // 26 s — above maxMs + tolerance

    const result = evaluateCorrelation(prev, next)

    expect(result.correlated).toBe(false)

    const travel = result.reasons.find(r => r.label === 'Travel-time plausibility')
    expect(travel?.score).toBe(0)
    expect(travel?.passed).toBe(false)
  })

  // 5a. Semantic compatibility: identical class boosts confidence
  it('gives higher confidence when observationClass matches exactly', () => {
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0, observationClass: 'person' })
    const next = makeEvent({ zoneId: 'courtyard', offsetMs: 10_000, observationClass: 'person' })
    const same = evaluateCorrelation(prev, next)

    const prevMismatch = makeEvent({ zoneId: 'north-gate', offsetMs: 0, observationClass: 'person' })
    const nextMismatch = makeEvent({ zoneId: 'courtyard', offsetMs: 10_000, observationClass: 'vehicle' })
    const mismatch = evaluateCorrelation(prevMismatch, nextMismatch)

    expect(same.confidence).toBeGreaterThan(mismatch.confidence)

    const obsSame = same.reasons.find(r => r.label === 'Observation compatibility')
    expect(obsSame?.score).toBe(1)

    const obsMismatch = mismatch.reasons.find(r => r.label === 'Observation compatibility')
    expect(obsMismatch?.score).toBe(0.25)
  })

  // 5b. motion class gives partial compatibility score of 0.75
  it('assigns 0.75 observation score when one class is motion', () => {
    const prev = makeEvent({ zoneId: 'north-gate', offsetMs: 0, observationClass: 'motion' })
    const next = makeEvent({ zoneId: 'courtyard', offsetMs: 10_000, observationClass: 'person' })

    const result = evaluateCorrelation(prev, next)

    const obs = result.reasons.find(r => r.label === 'Observation compatibility')
    expect(obs?.score).toBe(0.75)
  })
})

// ─── addEventToIncident ──────────────────────────────────────────────────────

describe('addEventToIncident', () => {
  // 6. Successfully appends a correlated event
  it('appends a valid correlated event to an incident', () => {
    const seedEvent = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const incident: SightGridIncident = createIncident(seedEvent)

    const newEvent = makeEvent({ zoneId: 'courtyard', offsetMs: 10_000 })
    const updated = addEventToIncident(incident, newEvent)

    expect(updated).not.toBeNull()
    expect(updated!.events).toHaveLength(2)
    expect(updated!.path).toEqual(['north-gate', 'courtyard'])
    expect(updated!.status).toBe('requires_verification')

    // correlationConfidence is the mean of the single CorrelationResult
    const expectedMean = updated!.correlationHistory[0].confidence
    expect(updated!.correlationConfidence).toBeCloseTo(expectedMean)
  })

  // 7. Rejects an unrelated event
  it('returns null when the new event does not correlate', () => {
    // north-gate → block-a: non-adjacent, will fail
    const seedEvent = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const incident: SightGridIncident = createIncident(seedEvent)

    const unrelatedEvent = makeEvent({ zoneId: 'block-a', offsetMs: 5_000 })
    const result = addEventToIncident(incident, unrelatedEvent)

    expect(result).toBeNull()
  })
})

// ─── resolveIncident ─────────────────────────────────────────────────────────

describe('resolveIncident', () => {
  // 8. Sets status to resolved
  it('changes incident status to resolved', () => {
    const seedEvent = makeEvent({ zoneId: 'north-gate', offsetMs: 0 })
    const incident: SightGridIncident = createIncident(seedEvent)

    const resolved = resolveIncident(incident)

    expect(resolved.status).toBe('resolved')
    expect(new Date(resolved.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(incident.startedAt).getTime()
    )
    // Original incident is not mutated
    expect(incident.status).toBe('monitoring')
  })
})
