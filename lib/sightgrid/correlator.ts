import {
  CorrelationReason,
  CorrelationResult,
  SightGridEvent,
  SightGridIncident,
} from './types'

import {
  areZonesAdjacent,
  getTravelTimeRange,
} from './topology'

const CORRELATION_WINDOW_MS = 30_000
const CORRELATION_THRESHOLD = 0.65

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function temporalScore(
  differenceMs: number
): number {
  if (differenceMs > CORRELATION_WINDOW_MS) {
    return 0
  }

  return clamp(
    1 -
      differenceMs /
        CORRELATION_WINDOW_MS
  )
}

function semanticScore(
  previousEvent: SightGridEvent,
  newEvent: SightGridEvent
): number {
  const previousClass =
    previousEvent.observationClass

  const newClass =
    newEvent.observationClass

  if (!previousClass || !newClass) {
    return 0.6
  }

  if (
    previousClass === 'unknown' ||
    newClass === 'unknown'
  ) {
    return 0.6
  }

  if (previousClass === newClass) {
    return 1
  }

  /*
   * Generic motion can be compatible with a
   * more specific visual observation.
   */
  if (
    previousClass === 'motion' ||
    newClass === 'motion'
  ) {
    return 0.75
  }

  /*
   * A door event can corroborate movement into
   * an adjacent physical zone.
   */
  if (
    previousClass === 'door' ||
    newClass === 'door'
  ) {
    return 0.7
  }

  return 0.25
}

function travelScore(
  previousEvent: SightGridEvent,
  newEvent: SightGridEvent,
  differenceMs: number
): number {
  const range = getTravelTimeRange(
    previousEvent.zoneId,
    newEvent.zoneId
  )

  if (!range) {
    return 0
  }

  if (
    differenceMs >= range.minMs &&
    differenceMs <= range.maxMs
  ) {
    return 1
  }

  /*
   * Slightly outside the configured travel range
   * is possible, but receives reduced confidence.
   */
  const toleranceMs = 5_000

  if (
    differenceMs >=
      Math.max(0, range.minMs - toleranceMs) &&
    differenceMs <=
      range.maxMs + toleranceMs
  ) {
    return 0.5
  }

  return 0
}

export function evaluateCorrelation(
  previousEvent: SightGridEvent,
  newEvent: SightGridEvent
): CorrelationResult {
  const previousTime = new Date(
    previousEvent.timestamp
  ).getTime()

  const newTime = new Date(
    newEvent.timestamp
  ).getTime()

  const differenceMs = Math.abs(
    newTime - previousTime
  )

  const adjacent = areZonesAdjacent(
    previousEvent.zoneId,
    newEvent.zoneId
  )

  const timeScore =
    temporalScore(differenceMs)

  const spatialScore =
    adjacent ? 1 : 0

  const movementScore =
    adjacent
      ? travelScore(
          previousEvent,
          newEvent,
          differenceMs
        )
      : 0

  const observationScore =
    semanticScore(
      previousEvent,
      newEvent
    )

  /*
   * Weighted explainable score.
   *
   * Spatial topology has the greatest weight because
   * SightGrid's primary differentiator is reasoning
   * about physical relationships between devices.
   */
  const confidence = clamp(
    spatialScore * 0.35 +
      timeScore * 0.25 +
      movementScore * 0.25 +
      observationScore * 0.15
  )

  const reasons: CorrelationReason[] = [
    {
      label: 'Spatial adjacency',
      passed: adjacent,
      score: spatialScore,
      detail: adjacent
        ? 'Zones are physically adjacent.'
        : 'Zones are not directly adjacent.',
    },
    {
      label: 'Temporal proximity',
      passed: timeScore > 0,
      score: timeScore,
      detail:
        differenceMs <=
        CORRELATION_WINDOW_MS
          ? `Observations occurred ${(
              differenceMs / 1000
            ).toFixed(1)}s apart.`
          : 'Observations exceed the correlation window.',
    },
    {
      label: 'Travel-time plausibility',
      passed: movementScore >= 0.5,
      score: movementScore,
      detail:
        movementScore === 1
          ? 'Timing is consistent with configured travel time.'
          : movementScore === 0.5
            ? 'Timing is slightly outside the expected travel range.'
            : 'Timing is not consistent with configured travel time.',
    },
    {
      label: 'Observation compatibility',
      passed: observationScore >= 0.6,
      score: observationScore,
      detail:
        previousEvent.observationClass ===
        newEvent.observationClass
          ? `Both observations are classified as ${
              newEvent.observationClass ??
              'unknown'
            }.`
          : 'Observation types have partial compatibility.',
    },
  ]

  /*
   * We require adjacency in addition to the score.
   * This prevents two unrelated distant observations
   * from correlating merely because their timestamps
   * and semantic classes happen to match.
   */
  const correlated =
    adjacent &&
    timeScore > 0 &&
    confidence >=
      CORRELATION_THRESHOLD

  return {
    correlated,
    confidence,
    timeDifferenceMs: differenceMs,
    reasons,
  }
}

export function shouldCorrelate(
  previousEvent: SightGridEvent,
  newEvent: SightGridEvent
): boolean {
  return evaluateCorrelation(
    previousEvent,
    newEvent
  ).correlated
}

export function addEventToIncident(
  incident: SightGridIncident,
  newEvent: SightGridEvent
): SightGridIncident | null {
  const lastEvent =
    incident.events[
      incident.events.length - 1
    ]

  if (!lastEvent) {
    return null
  }

  const result = evaluateCorrelation(
    lastEvent,
    newEvent
  )

  if (!result.correlated) {
    return null
  }

  const history = [
    ...incident.correlationHistory,
    result,
  ]

  const averageConfidence =
    history.reduce(
      (sum, item) =>
        sum + item.confidence,
      0
    ) / history.length

  return {
    ...incident,
    updatedAt: newEvent.timestamp,
    status: 'requires_verification',
    events: [
      ...incident.events,
      newEvent,
    ],
    path: [
      ...incident.path,
      newEvent.zoneId,
    ],
    correlationConfidence:
      averageConfidence,
    correlationHistory: history,
  }
}

export function createIncident(
  event: SightGridEvent
): SightGridIncident {
  return {
    id: `incident-${event.id}`,
    startedAt: event.timestamp,
    updatedAt: event.timestamp,
    status: 'monitoring',
    events: [event],
    path: [event.zoneId],
    correlationConfidence: 1,
    correlationHistory: [],
  }
}