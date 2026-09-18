import { SightGridEvent, SightGridIncident } from './types'
import { areZonesAdjacent } from './topology'

const CORRELATION_WINDOW_MS = 30_000

export function shouldCorrelate(
  previousEvent: SightGridEvent,
  newEvent: SightGridEvent
): boolean {
  const previousTime = new Date(previousEvent.timestamp).getTime()
  const newTime = new Date(newEvent.timestamp).getTime()

  const timeDifference = Math.abs(newTime - previousTime)

  if (timeDifference > CORRELATION_WINDOW_MS) {
    return false
  }

  return areZonesAdjacent(previousEvent.zoneId, newEvent.zoneId)
}

export function addEventToIncident(
  incident: SightGridIncident,
  newEvent: SightGridEvent
): SightGridIncident | null {
  const lastEvent = incident.events[incident.events.length - 1]

  if (!lastEvent || !shouldCorrelate(lastEvent, newEvent)) {
    return null
  }

  return {
    ...incident,
    updatedAt: newEvent.timestamp,
    status: 'requires_verification',
    events: [...incident.events, newEvent],
    path: [...incident.path, newEvent.zoneId],
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
  }
}