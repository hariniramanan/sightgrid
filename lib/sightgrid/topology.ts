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
    adjacentZones: ['north-gate', 'block-a', 'block-b'],
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

export function getZone(zoneId: string): SightGridZone | undefined {
  return demoTopology.find(zone => zone.id === zoneId)
}

export function areZonesAdjacent(
  firstZoneId: string,
  secondZoneId: string
): boolean {
  if (firstZoneId === secondZoneId) {
    return true
  }

  const firstZone = getZone(firstZoneId)

  return firstZone?.adjacentZones.includes(secondZoneId) ?? false
}