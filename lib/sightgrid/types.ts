export type EventSource = 'ring' | 'simulated'

export type SightGridEventType =
  | 'motion'
  | 'door_open'
  | 'door_closed'
  | 'environment'
  | 'device_offline'

export type ObservationClass =
  | 'person'
  | 'vehicle'
  | 'motion'
  | 'door'
  | 'environment'
  | 'unknown'

export type SensorKind =
  | 'camera'
  | 'contact_sensor'
  | 'environmental_sensor'

export interface SightGridZone {
  id: string
  name: string
  adjacentZones: string[]
}

export interface SightGridEvent {
  id: string
  source: EventSource
  deviceId: string
  deviceName: string
  zoneId: string
  type: SightGridEventType
  timestamp: string
  sensorKind?: SensorKind
  observationClass?: ObservationClass
  observationConfidence?: number
  metadata?: Record<string, unknown>
}

export type IncidentStatus =
  | 'monitoring'
  | 'requires_verification'
  | 'resolved'

export interface CorrelationReason {
  label: string
  passed: boolean
  score: number
  detail: string
}

export interface CorrelationResult {
  correlated: boolean
  confidence: number
  timeDifferenceMs: number
  reasons: CorrelationReason[]
}

export interface SightGridIncident {
  id: string
  startedAt: string
  updatedAt: string
  status: IncidentStatus
  events: SightGridEvent[]
  path: string[]
  correlationConfidence: number
  correlationHistory: CorrelationResult[]
}