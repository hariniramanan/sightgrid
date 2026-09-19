import { DetectionEvent } from '@/app/components/EventCard'
import { SightGridEvent, SightGridEventType } from './types'

interface RingDeviceMapping {
  zoneId: string
  deviceName: string
}

const ringDeviceMap: Record<string, RingDeviceMapping> = {
  // Real device mappings will be registered here.
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

export function normalizeRingEvent(
  event: DetectionEvent
): SightGridEvent | null {
  const type = mapEventType(event.event_type)

  if (!type || !event.device_id) {
    return null
  }

  const mapping = ringDeviceMap[event.device_id]

  return {
    id: event.event_id,
    source: 'ring',
    deviceId: event.device_id,
    deviceName: mapping?.deviceName ?? 'Ring Device',
    zoneId: mapping?.zoneId ?? 'north-gate',
    type,
    timestamp: event.timestamp,
    metadata: {
      confidence: event.confidence,
      boundingBox: event.bounding_box,
      originalEventType: event.event_type,
    },
  }
}