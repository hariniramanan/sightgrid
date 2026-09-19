import { SightGridZone } from './types'

export const demoTopology: SightGridZone[] = [
  {
    id: 'north-gate',
    name: 'North Gate',
    adjacentZones: ['courtyard'],
  },
  {
    id: 'courtyard',
    name: 'Courtyard',
    adjacentZones: [
      'north-gate',
      'block-a',
      'block-b',
    ],
  },
  {
    id: 'block-a',
    name: 'Block A',
    adjacentZones: ['courtyard'],
  },
  {
    id: 'block-b',
    name: 'Block B',
    adjacentZones: ['courtyard'],
  },
]

/*
 * Expected traversal ranges between connected zones.
 *
 * These are demo-site configuration values, not claims
 * about a real property.
 */
const travelTimeRanges: Record<
  string,
  { minMs: number; maxMs: number }
> = {
  'north-gate:courtyard': {
    minMs: 3_000,
    maxMs: 20_000,
  },

  'courtyard:north-gate': {
    minMs: 3_000,
    maxMs: 20_000,
  },

  'courtyard:block-a': {
    minMs: 3_000,
    maxMs: 18_000,
  },

  'block-a:courtyard': {
    minMs: 3_000,
    maxMs: 18_000,
  },

  'courtyard:block-b': {
    minMs: 4_000,
    maxMs: 20_000,
  },

  'block-b:courtyard': {
    minMs: 4_000,
    maxMs: 20_000,
  },
}

export function getZone(
  zoneId: string
): SightGridZone | undefined {
  return demoTopology.find(
    zone => zone.id === zoneId
  )
}

export function areZonesAdjacent(
  firstZoneId: string,
  secondZoneId: string
): boolean {
  if (firstZoneId === secondZoneId) {
    return true
  }

  const firstZone = getZone(firstZoneId)

  return (
    firstZone?.adjacentZones.includes(
      secondZoneId
    ) ?? false
  )
}

export function getTravelTimeRange(
  firstZoneId: string,
  secondZoneId: string
):
  | { minMs: number; maxMs: number }
  | undefined {
  if (firstZoneId === secondZoneId) {
    return {
      minMs: 0,
      maxMs: 30_000,
    }
  }

  return travelTimeRanges[
    `${firstZoneId}:${secondZoneId}`
  ]
}