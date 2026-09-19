import { DetectionEvent } from '@/app/components/EventCard'

import {
  ObservationClass,
  SightGridEvent,
  SightGridEventType,
} from './types'

interface RingDeviceMapping {
  zoneId: string
  deviceName: string
}

const ringDeviceMap: Record<
  string,
  RingDeviceMapping
> = {
  // Real Ring device → SightGrid zone mappings
  // will go here.
}

function mapEventType(
  eventType: string
): SightGridEventType | null {
  switch (eventType) {
    case 'motion_detected':
    case 'person_detected':
      return 'motion'

    case 'device_offline':
      return 'device_offline'

    default:
      return null
  }
}

function mapObservationClass(
  eventType: string
): ObservationClass {
  switch (eventType) {
    case 'person_detected':
      return 'person'

    case 'motion_detected':
      return 'motion'

    case 'device_offline':
      return 'unknown'

    default:
      return 'unknown'
  }
}

export function isSimulatedRingEvent(
  event: DetectionEvent
): boolean {
  if (
    event.metadata?.simulated === true
  ) {
    return true
  }

  if (
    event.device_id ===
      'test-device-123' ||
    event.device_id?.startsWith('test-')
  ) {
    return true
  }

  return false
}

export function normalizeRingEvent(
  event: DetectionEvent
): SightGridEvent | null {
  const type = mapEventType(
    event.event_type
  )

  if (!type || !event.device_id) {
    return null
  }

  const mapping =
    ringDeviceMap[event.device_id]

  const simulated =
    isSimulatedRingEvent(event)

  return {
    id: event.event_id,

    source: simulated
      ? 'simulated'
      : 'ring',

    deviceId: event.device_id,

    deviceName:
      mapping?.deviceName ??
      (simulated
        ? 'Test Ring Device'
        : 'Ring Device'),

    zoneId:
      mapping?.zoneId ??
      'north-gate',

    type,

    timestamp: event.timestamp,

    observationClass:
      mapObservationClass(
        event.event_type
      ),

    observationConfidence:
      event.confidence ?? undefined,

    metadata: {
      confidence:
        event.confidence,

      boundingBox:
        event.bounding_box,

      originalEventType:
        event.event_type,

      simulated,
    },
  }
}