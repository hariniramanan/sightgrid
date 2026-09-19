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
      return 'text-green-400'
    }

    return 'text-amber-400'
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
    <aside className="w-[370px] shrink-0 border-l border-slate-700 bg-dash-panel flex flex-col min-h-0">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-dash-cyan">
              Incident Intelligence
            </p>

            <h2 className="text-lg font-semibold text-white mt-1">
              Active Incident
            </h2>
          </div>

          {incident ? (
            <span
              className={`text-[9px] px-2 py-1 rounded-full border ${
                incident.status === 'resolved'
                  ? 'bg-green-950 text-green-300 border-green-800'
                  : incident.status ===
                      'requires_verification'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
              }`}
            >
              {incident.status
                .replaceAll('_', ' ')
                .toUpperCase()}
            </span>
          ) : (
            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-600 text-slate-400">
              IDLE
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!incident ? (
          <div className="h-full min-h-[250px] flex items-center justify-center">
            <div className="text-center max-w-[240px]">
              <div className="w-12 h-12 mx-auto rounded-full border border-slate-700 flex items-center justify-center text-slate-500 text-xl">
                ◇
              </div>

              <p className="text-sm text-slate-300 mt-3">
                No active incident
              </p>

              <p className="text-xs text-slate-500 mt-1 leading-5">
                SightGrid correlates observations
                across cameras and physical sensors.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  Incident path
                </span>

                <span className="text-[10px] text-dash-cyan">
                  {incident.events.length}{' '}
                  observations
                </span>
              </div>

              <p className="text-sm text-white mt-2 leading-6">
                {incident.path
                  .map(zoneName)
                  .join(' → ')}
              </p>

              <p className="text-[9px] text-slate-500 mt-1">
                {uniqueZones.length} physical zones ·{' '}
                {
                  incident.events.filter(
                    event =>
                      event.sensorKind ===
                      'contact_sensor'
                  ).length
                }{' '}
                sensor observation
              </p>

              {confidencePercent !== null && (
                <div className="mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Correlation confidence
                    </span>

                    <span className="text-sm font-semibold text-cyan-300">
                      {confidencePercent}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-500"
                      style={{
                        width: `${confidencePercent}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-0">
              {incident.events.map(
                (event, index) => (
                  <div key={event.id}>
                    <div
                      className={`relative rounded-xl border p-3 ${
                        event.sensorKind ===
                        'contact_sensor'
                          ? 'border-purple-800 bg-purple-950/20'
                          : 'border-slate-700 bg-dash-card'
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {zoneName(
                              event.zoneId
                            )}
                          </p>

                          <p className="text-[11px] text-slate-400 mt-1">
                            {event.deviceName}
                          </p>
                        </div>

                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(
                            event.timestamp
                          ).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-end justify-between mt-3 gap-2">
                        <div>
                          <span
                            className={`text-[10px] uppercase tracking-wider ${
                              event.type ===
                              'door_open'
                                ? 'text-purple-300'
                                : 'text-dash-cyan'
                            }`}
                          >
                            ● {eventLabel(event)}
                          </span>

                          {event.observationConfidence !==
                            undefined && (
                            <p className="text-[9px] text-slate-500 mt-1">
                              Observation confidence:{' '}
                              {Math.round(
                                event.observationConfidence *
                                  100
                              )}
                              %
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-[9px] uppercase text-right ${sourceClass(
                            event
                          )}`}
                        >
                          {sourceLabel(event)}
                        </span>
                      </div>
                    </div>

                    {index <
                      incident.events.length -
                        1 && (
                      <div className="h-7 ml-6 border-l border-dashed border-cyan-800 flex items-center">
                        <span className="text-[9px] text-slate-500 ml-3">
                          correlated by SightGrid
                        </span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {latestCorrelation && (
              <div className="mt-4 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase tracking-wider text-dash-cyan">
                    Why correlated?
                  </p>

                  <span className="text-[9px] text-green-400">
                    CORRELATED
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {latestCorrelation.reasons.map(
                    reason => (
                      <div
                        key={reason.label}
                        className="flex gap-2"
                      >
                        <span
                          className={
                            reason.passed
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {reason.passed
                            ? '✓'
                            : '×'}
                        </span>

                        <div>
                          <p className="text-[10px] text-slate-300">
                            {reason.label}
                          </p>

                          <p className="text-[9px] text-slate-500 leading-4">
                            {reason.detail}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {rejectedObservation && (
              <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 p-3">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-300">
                      Negative control rejected
                    </p>

                    <p className="text-[9px] text-slate-500 mt-1">
                      {
                        rejectedObservation
                          .event.deviceName
                      }{' '}
                      ·{' '}
                      {zoneName(
                        rejectedObservation
                          .event.zoneId
                      )}
                    </p>
                  </div>

                  <span className="text-[9px] px-2 py-1 rounded border border-red-800 text-red-300 whitespace-nowrap">
                    NOT CORRELATED
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {rejectedObservation.result.reasons.map(
                    reason => (
                      <div
                        key={reason.label}
                        className="flex gap-2"
                      >
                        <span
                          className={
                            reason.passed
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {reason.passed
                            ? '✓'
                            : '×'}
                        </span>

                        <div>
                          <p className="text-[10px] text-slate-300">
                            {reason.label}
                          </p>

                          <p className="text-[9px] text-slate-500 leading-4">
                            {reason.detail}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {incident.status === 'resolved' && (
              <div className="mt-4 rounded-xl border border-green-900 bg-green-950/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-green-300">
                  Incident resolved
                </p>

                <p className="text-[10px] text-slate-400 mt-2 leading-4">
                  Human review completed. Active
                  topology highlighting has been
                  cleared.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Judge Demo
          </span>

          <span className="text-[10px] text-slate-500">
            deterministic scenario
          </span>
        </div>

        {!incident ||
        incident.status === 'resolved' ? (
          <button
            onClick={runDemo}
            disabled={running}
            className="w-full bg-dash-cyan text-slate-950 font-semibold text-sm py-2.5 rounded-lg hover:bg-cyan-300 transition disabled:opacity-50"
          >
            {running
              ? 'Running scenario...'
              : 'Run Judge Scenario'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleResolve}
              disabled={running}
              className="border border-green-800 bg-green-950/30 text-green-300 text-xs font-medium py-2.5 rounded-lg hover:bg-green-950/60 disabled:opacity-50"
            >
              Resolve Incident
            </button>

            <button
              onClick={resetScenario}
              disabled={running}
              className="border border-slate-600 bg-slate-800 text-slate-300 text-xs font-medium py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        )}

        {incident?.status === 'resolved' && (
          <button
            onClick={resetScenario}
            className="w-full mt-2 border border-slate-700 text-slate-400 text-xs py-2 rounded-lg hover:bg-slate-800"
          >
            Clear Incident
          </button>
        )}

        <p className="text-[9px] text-center text-slate-600 mt-2">
          Ring integration is real. Additional
          scenario devices are explicitly simulated.
        </p>
      </div>
    </aside>
  )
}