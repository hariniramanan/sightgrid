'use client'

import { useEffect, useRef, useState } from 'react'

import { DetectionEvent } from './EventCard'

import { normalizeRingEvent } from '@/lib/sightgrid/ringAdapter'

import {

  CorrelationResult,

  SightGridEvent,

  SightGridIncident,

} from '@/lib/sightgrid/types'

import {

  addEventToIncident,

  createIncident,

  evaluateCorrelation,

  resolveIncident,

} from '@/lib/sightgrid/correlator'

const wait = (ms: number) =>

  new Promise(resolve => setTimeout(resolve, ms))

interface SightGridDemoProps {

  ringEvents: DetectionEvent[]

  onActiveZonesChange?: (zones: string[]) => void

  onDoorStateChange?: (open: boolean) => void

}

interface RejectedObservation {

  event: SightGridEvent

  result: CorrelationResult

}

export function SightGridDemo({

  ringEvents,

  onActiveZonesChange,

  onDoorStateChange,

}: SightGridDemoProps) {

  const [incident, setIncident] =

    useState<SightGridIncident | null>(null)

  const [running, setRunning] =

    useState(false)

  const [rejectedObservation, setRejectedObservation] =

    useState<RejectedObservation | null>(null)

  const processedEventIds =

    useRef<Set<string>>(new Set())

  const normalizedRingEvents = ringEvents

    .map(normalizeRingEvent)

    .filter(

      (event): event is SightGridEvent =>

        event !== null

    )

  const zoneName = (zoneId: string) => {

    const names: Record<string, string> = {

      'north-gate': 'North Gate',

      courtyard: 'Courtyard',

      'block-a': 'Block A',

      'block-b': 'Block B',

    }

    return names[zoneId] ?? zoneId

  }

  const eventLabel = (event: SightGridEvent) => {

    if (event.type === 'door_open') {

      return 'Door opened'

    }

    if (event.type === 'door_closed') {

      return 'Door closed'

    }

    if (event.observationClass === 'person') {

      return 'Person observed'

    }

    return 'Motion observed'

  }

  const sourceLabel = (event: SightGridEvent) => {

    if (event.source === 'ring') {

      return 'RING EVENT'

    }

    if (event.metadata?.simulated === true) {

      return 'SIMULATED WEBHOOK'

    }

    if (event.sensorKind === 'contact_sensor') {

      return 'SIMULATED SENSOR'

    }

    return 'SIMULATED DEVICE'

  }

  const sourceClass = (event: SightGridEvent) => {

    if (event.source === 'ring') {

      return 'text-[#1282A2]'

    }

    return 'text-[#63372C]'

  }

  const publishIncident = (

    nextIncident: SightGridIncident

  ) => {

    setIncident(nextIncident)

    onActiveZonesChange?.(

      Array.from(new Set(nextIncident.path))

    )

  }

  useEffect(() => {

    const latestEvent = normalizedRingEvents[0]

    if (!latestEvent) return

    if (

      processedEventIds.current.has(latestEvent.id)

    ) {

      return

    }

    processedEventIds.current.add(latestEvent.id)

    setRejectedObservation(null)

    onDoorStateChange?.(false)

    publishIncident(

      createIncident(latestEvent)

    )

  }, [ringEvents])

  const resetScenario = () => {

    setIncident(null)

    setRejectedObservation(null)

    setRunning(false)

    onActiveZonesChange?.([])

    onDoorStateChange?.(false)

  }

  const handleResolve = () => {

    if (!incident) return

    const resolved =

      resolveIncident(incident)

    setIncident(resolved)

    onActiveZonesChange?.([])

    onDoorStateChange?.(false)

  }

  const runDemo = async () => {

    if (running) return

    setRunning(true)

    setRejectedObservation(null)

    onActiveZonesChange?.([])

    onDoorStateChange?.(false)

    const start = Date.now()

    let current: SightGridIncident

    const latestRingMotion =

      normalizedRingEvents.find(

        event => event.type === 'motion'

      )

    if (latestRingMotion) {

      current = createIncident({

        ...latestRingMotion,

        sensorKind:

          latestRingMotion.sensorKind ??

          'camera',

      })

    } else {

      const northGate: SightGridEvent = {

        id: `demo-north-${start}`,

        source: 'simulated',

        deviceId: 'camera-north',

        deviceName: 'Camera 01',

        zoneId: 'north-gate',

        type: 'motion',

        sensorKind: 'camera',

        observationClass: 'person',

        observationConfidence: 0.9,

        timestamp: new Date(start).toISOString(),

      }

      current = createIncident(northGate)

    }

    publishIncident(current)

    const firstTimestamp =

      new Date(

        current.events[0].timestamp

      ).getTime()

    /*

     * Judge scenario:

     *

     * North Gate camera

     *      ↓ 12 seconds

     * Courtyard camera

     *      ↓ 9 seconds

     * Block A camera

     *      ↓ 8 seconds

     * Block B contact sensor

     */

    const courtyard: SightGridEvent = {

      id: `demo-courtyard-${start}`,

      source: 'simulated',

      deviceId: 'camera-courtyard',

      deviceName: 'Camera 02',

      zoneId: 'courtyard',

      type: 'motion',

      sensorKind: 'camera',

      observationClass: 'person',

      observationConfidence: 0.92,

      timestamp: new Date(

        firstTimestamp + 12_000

      ).toISOString(),

    }

    const blockA: SightGridEvent = {

      id: `demo-block-a-${start}`,

      source: 'simulated',

      deviceId: 'camera-block-a',

      deviceName: 'Camera 03',

      zoneId: 'block-a',

      type: 'motion',

      sensorKind: 'camera',

      observationClass: 'person',

      observationConfidence: 0.89,

      timestamp: new Date(

        firstTimestamp + 21_000

      ).toISOString(),

    }

    /*

     * Block A is adjacent to Courtyard, while

     * Block B is also adjacent to Courtyard.

     *

     * To demonstrate sensor fusion without

     * violating the topology, the door event

     * follows a return observation through

     * Courtyard.

     */

    const courtyardReturn: SightGridEvent = {

      id: `demo-courtyard-return-${start}`,

      source: 'simulated',

      deviceId: 'camera-courtyard',

      deviceName: 'Camera 02',

      zoneId: 'courtyard',

      type: 'motion',

      sensorKind: 'camera',

      observationClass: 'person',

      observationConfidence: 0.9,

      timestamp: new Date(

        firstTimestamp + 27_000

      ).toISOString(),

    }

    const blockBDoor: SightGridEvent = {

      id: `demo-door-${start}`,

      source: 'simulated',

      deviceId: 'contact-block-b',

      deviceName: 'Contact Sensor 01',

      zoneId: 'block-b',

      type: 'door_open',

      sensorKind: 'contact_sensor',

      observationClass: 'door',

      observationConfidence: 0.99,

      timestamp: new Date(

        firstTimestamp + 30_000

      ).toISOString(),

    }

    await wait(900)

    const second =

      addEventToIncident(

        current,

        courtyard

      )

    if (second) {

      current = second

      publishIncident(current)

    }

    await wait(900)

    const third =

      addEventToIncident(

        current,

        blockA

      )

    if (third) {

      current = third

      publishIncident(current)

    }

    await wait(900)

    const fourth =

      addEventToIncident(

        current,

        courtyardReturn

      )

    if (fourth) {

      current = fourth

      publishIncident(current)

    }

    await wait(900)

    const fifth =

      addEventToIncident(

        current,

        blockBDoor

      )

    if (fifth) {

      current = fifth

      publishIncident(current)

      onDoorStateChange?.(true)

    }

    /*

     * Negative-control observation.

     *

     * Block B → North Gate is not a direct

     * topology edge, so this observation

     * should be rejected.

     */

    await wait(700)

    const unrelatedEvent: SightGridEvent = {

      id: `demo-rejected-${start}`,

      source: 'simulated',

      deviceId: 'camera-north-secondary',

      deviceName: 'Camera 04',

      zoneId: 'north-gate',

      type: 'motion',

      sensorKind: 'camera',

      observationClass: 'vehicle',

      observationConfidence: 0.87,

      timestamp: new Date(

        firstTimestamp + 31_000

      ).toISOString(),

    }

    const lastEvent =

      current.events[

        current.events.length - 1

      ]

    const rejectionResult =

      evaluateCorrelation(

        lastEvent,

        unrelatedEvent

      )

    if (!rejectionResult.correlated) {

      setRejectedObservation({

        event: unrelatedEvent,

        result: rejectionResult,

      })

    }

    setRunning(false)

  }

  const confidencePercent =

    incident &&

    incident.correlationHistory.length > 0

      ? Math.round(

          incident.correlationConfidence * 100

        )

      : null

  const latestCorrelation =

    incident?.correlationHistory[

      incident.correlationHistory.length - 1

    ]

  const uniqueZones =

    incident

      ? Array.from(new Set(incident.path))

      : []

  return (
    <aside className="w-[390px] shrink-0 border-l border-[#011D4D]/15 bg-[#FAF8F6] text-[#011D4D] flex flex-col min-h-0">
      <div className="border-b border-[#011D4D]/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1282A2]">Incident intelligence</p><h2 className="mt-1 text-[18px] font-semibold tracking-tight">Active Incident</h2></div>
          {incident ? <span className={`rounded border px-2 py-1 text-[7px] font-semibold uppercase tracking-wider ${incident.status === 'resolved' ? 'border-[#1282A2]/30 bg-[#1282A2]/10 text-[#1282A2]' : incident.status === 'requires_verification' ? 'border-[#63372C]/30 bg-[#63372C]/10 text-[#63372C]' : 'border-[#034078]/30 bg-[#034078]/10 text-[#034078]'}`}>{incident.status.replaceAll('_', ' ').toUpperCase()}</span> : <span className="rounded border border-[#011D4D]/15 px-2 py-1 text-[7px] font-semibold uppercase tracking-wider text-[#6F747B]">Idle</span>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {!incident ? (
          <div className="flex h-full min-h-[260px] items-center justify-center"><div className="max-w-[240px] text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#011D4D]/15 text-[#011D4D]/35">◇</div><p className="mt-3 text-[12px] font-medium">No active incident</p><p className="mt-2 text-[10px] leading-5 text-[#6F747B]">SightGrid correlates observations across cameras and physical sensors.</p></div></div>
        ) : (
          <>
            <section className="mb-4 rounded-lg border border-[#011D4D]/15 bg-[#F4F1EE] p-4">
              <div className="flex items-center justify-between"><span className="text-[8px] font-semibold uppercase tracking-wider text-[#6F747B]">Incident path</span><span className="text-[8px] font-medium text-[#034078]">{incident.events.length} observations</span></div>
              <p className="mt-2 text-[12px] font-semibold leading-5">{incident.path.map(zoneName).join(' → ')}</p>
              <p className="mt-1 text-[8px] text-[#6F747B]">{uniqueZones.length} physical zones · {incident.events.filter(event => event.sensorKind === 'contact_sensor').length} sensor observation</p>
              {confidencePercent !== null && <div className="mt-4"><div className="flex items-center justify-between"><span className="text-[8px] font-semibold uppercase tracking-wider text-[#6F747B]">Correlation confidence</span><span className="text-[15px] font-semibold text-[#034078]">{confidencePercent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#011D4D]/10"><div className="h-full bg-[#034078] transition-all duration-500" style={{ width: `${confidencePercent}%` }} /></div></div>}
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#6F747B]">Observation timeline</p><span className="text-[8px] text-[#6F747B]">Human verification required</span></div>
              <div>{incident.events.map((event, index) => <div key={event.id}><div className={`rounded-lg border p-3 ${event.sensorKind === 'contact_sensor' ? 'border-[#63372C]/35 bg-[#63372C]/[0.05]' : 'border-[#011D4D]/15 bg-white'}`}><div className="flex justify-between gap-3"><div><p className="text-[11px] font-semibold">{zoneName(event.zoneId)}</p><p className="mt-1 text-[9px] text-[#6F747B]">{event.deviceName}</p></div><span className="whitespace-nowrap text-[8px] text-[#6F747B]">{new Date(event.timestamp).toLocaleTimeString()}</span></div><div className="mt-3 flex items-end justify-between gap-2"><div><span className={`text-[8px] font-semibold uppercase tracking-wider ${event.type === 'door_open' ? 'text-[#63372C]' : 'text-[#034078]'}`}>{eventLabel(event)}</span>{event.observationConfidence !== undefined && <p className="mt-1 text-[8px] text-[#6F747B]">Observation confidence: {Math.round(event.observationConfidence * 100)}%</p>}</div><span className={`text-right text-[7px] font-semibold uppercase tracking-wider ${sourceClass(event)}`}>{sourceLabel(event)}</span></div></div>{index < incident.events.length - 1 && <div className="ml-5 flex h-6 items-center border-l border-[#034078]/30"><span className="ml-3 text-[7px] text-[#6F747B]">correlated</span></div>}</div>)}</div>
            </section>
            {latestCorrelation && <section className="mt-4 rounded-lg border border-[#034078]/25 bg-[#034078]/[0.04] p-4"><div className="flex items-center justify-between"><p className="text-[8px] font-semibold uppercase tracking-wider text-[#034078]">Why correlated?</p><span className="text-[7px] font-semibold uppercase text-[#1282A2]">Correlated</span></div><div className="mt-3 space-y-2.5">{latestCorrelation.reasons.map(reason => <div key={reason.label} className="flex gap-2"><span className={reason.passed ? 'text-[#1282A2]' : 'text-[#63372C]'}>{reason.passed ? '✓' : '×'}</span><div><p className="text-[9px] font-medium">{reason.label}</p><p className="mt-0.5 text-[8px] leading-4 text-[#6F747B]">{reason.detail}</p></div></div>)}</div></section>}
            {rejectedObservation && <section className="mt-4 rounded-lg border border-[#63372C]/35 bg-[#63372C]/[0.05] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-semibold uppercase tracking-wider text-[#63372C]">Negative control rejected</p><p className="mt-1 text-[8px] text-[#6F747B]">{rejectedObservation.event.deviceName} · {zoneName(rejectedObservation.event.zoneId)}</p></div><span className="whitespace-nowrap rounded border border-[#63372C]/30 px-2 py-1 text-[7px] font-semibold uppercase text-[#63372C]">Not correlated</span></div><div className="mt-3 space-y-2">{rejectedObservation.result.reasons.map(reason => <div key={reason.label} className="flex gap-2"><span className={reason.passed ? 'text-[#1282A2]' : 'text-[#63372C]'}>{reason.passed ? '✓' : '×'}</span><div><p className="text-[9px] font-medium">{reason.label}</p><p className="mt-0.5 text-[8px] leading-4 text-[#6F747B]">{reason.detail}</p></div></div>)}</div></section>}
            {incident.status === 'resolved' && <section className="mt-4 rounded-lg border border-[#1282A2]/30 bg-[#1282A2]/[0.05] p-4"><p className="text-[8px] font-semibold uppercase tracking-wider text-[#1282A2]">Incident resolved</p><p className="mt-2 text-[9px] leading-4 text-[#6F747B]">Human review completed. Active topology highlighting has been cleared.</p></section>}
          </>
        )}
      </div>
      <div className="border-t border-[#011D4D]/10 p-5">
        <div className="mb-3 flex justify-between"><span className="text-[8px] font-semibold uppercase tracking-wider text-[#6F747B]">Judge demo</span><span className="text-[8px] text-[#6F747B]">deterministic scenario</span></div>
        {!incident || incident.status === 'resolved' ? <button onClick={runDemo} disabled={running} className="w-full rounded-md bg-[#011D4D] py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#034078] disabled:opacity-50">{running ? 'Running scenario...' : 'Run Judge Scenario'}</button> : <div className="grid grid-cols-2 gap-2"><button onClick={handleResolve} disabled={running} className="rounded-md bg-[#1282A2] py-2.5 text-[10px] font-semibold text-white hover:bg-[#034078] disabled:opacity-50">Resolve Incident</button><button onClick={resetScenario} disabled={running} className="rounded-md border border-[#011D4D]/20 py-2.5 text-[10px] font-medium text-[#011D4D] hover:bg-[#E4DFDA] disabled:opacity-50">Reset</button></div>}
        {incident?.status === 'resolved' && <button onClick={resetScenario} className="mt-2 w-full rounded-md border border-[#011D4D]/20 py-2 text-[10px] text-[#6F747B] hover:bg-[#E4DFDA]">Clear Incident</button>}
        <p className="mt-3 text-center text-[8px] leading-4 text-[#6F747B]">Ring API integration uses the Developers Playground. Additional scenario devices are explicitly simulated.</p>
      </div>
    </aside>
  )
}
