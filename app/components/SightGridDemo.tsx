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
} from '@/lib/sightgrid/correlator'

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

interface SightGridDemoProps {
  ringEvents: DetectionEvent[]
  onActiveZonesChange?: (zones: string[]) => void
}

interface RejectedObservation {
  event: SightGridEvent
  result: CorrelationResult
}

export function SightGridDemo({
  ringEvents,
  onActiveZonesChange,
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

  const sourceLabel = (
    event: SightGridEvent
  ) => {
    if (event.source === 'ring') {
      return 'REAL RING'
    }

    if (
      event.metadata?.simulated === true
    ) {
      return 'SIMULATED WEBHOOK'
    }

    return 'SIMULATED DEVICE'
  }

  const sourceClass = (
    event: SightGridEvent
  ) => {
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
      Array.from(
        new Set(nextIncident.path)
      )
    )
  }

  useEffect(() => {
    const latestEvent =
      normalizedRingEvents[0]

    if (!latestEvent) return

    if (
      processedEventIds.current.has(
        latestEvent.id
      )
    ) {
      return
    }

    processedEventIds.current.add(
      latestEvent.id
    )

    setRejectedObservation(null)

    publishIncident(
      createIncident(latestEvent)
    )
  }, [ringEvents])

  const runDemo = async () => {
    if (running) return

    setRunning(true)
    setRejectedObservation(null)

    onActiveZonesChange?.([])

    const start = Date.now()

    let current: SightGridIncident

    const latestEvent =
      normalizedRingEvents.find(
        event => event.type === 'motion'
      )

    if (latestEvent) {
      current =
        createIncident(latestEvent)
    } else {
      const northGate: SightGridEvent = {
        id: `demo-north-${start}`,
        source: 'simulated',
        deviceId: 'camera-north',
        deviceName: 'Camera 01',
        zoneId: 'north-gate',
        type: 'motion',
        observationClass: 'person',
        observationConfidence: 0.9,
        timestamp: new Date(
          start
        ).toISOString(),
      }

      current =
        createIncident(northGate)
    }

    publishIncident(current)

    const firstTimestamp =
      new Date(
        current.events[0].timestamp
      ).getTime()

    const courtyard: SightGridEvent = {
      id: `demo-courtyard-${start}`,
      source: 'simulated',
      deviceId: 'camera-courtyard',
      deviceName: 'Camera 02',
      zoneId: 'courtyard',
      type: 'motion',
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
      observationClass: 'person',
      observationConfidence: 0.89,
      timestamp: new Date(
        firstTimestamp + 21_000
      ).toISOString(),
    }

    await wait(1200)

    const second =
      addEventToIncident(
        current,
        courtyard
      )

    if (second) {
      current = second
      publishIncident(current)
    }

    await wait(1200)

    const third =
      addEventToIncident(
        current,
        blockA
      )

    if (third) {
      current = third
      publishIncident(current)
    }

    /*
     * Negative reasoning demonstration.
     *
     * This observation occurs almost immediately
     * after Block A but at North Gate.
     *
     * Block A and North Gate are not directly
     * adjacent, so SightGrid should reject it
     * instead of blindly adding every event.
     */
    await wait(900)

    const unrelatedEvent: SightGridEvent = {
      id: `demo-rejected-${start}`,
      source: 'simulated',
      deviceId: 'camera-north-secondary',
      deviceName: 'Camera 04',
      zoneId: 'north-gate',
      type: 'motion',
      observationClass: 'person',
      observationConfidence: 0.88,
      timestamp: new Date(
        firstTimestamp + 23_000
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
          incident.correlationConfidence *
            100
        )
      : null

  const latestCorrelation =
    incident?.correlationHistory[
      incident.correlationHistory.length -
        1
    ]

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
              className={`text-[9px] px-2 py-1 rounded-full ${
                incident.status ===
                'requires_verification'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-blue-950 text-blue-300 border border-blue-800'
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
                SightGrid is monitoring device
                observations for spatially related
                activity.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  Correlation
                </span>

                <span className="text-[10px] text-dash-cyan">
                  {incident.events.length}{' '}
                  observation
                  {incident.events.length !== 1
                    ? 's'
                    : ''}
                </span>
              </div>

              <p className="text-sm text-white mt-2">
                {incident.path
                  .map(zoneName)
                  .join(' → ')}
              </p>

              {confidencePercent !==
                null && (
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
                    <div className="relative rounded-xl border border-slate-700 bg-dash-card p-3">
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

                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <span className="text-[10px] text-dash-cyan uppercase tracking-wider">
                            ●{' '}
                            {event.observationClass ===
                            'person'
                              ? 'Person observed'
                              : 'Motion observed'}
                          </span>

                          {event.observationConfidence !==
                            undefined && (
                            <p className="text-[9px] text-slate-500 mt-1">
                              Semantic confidence:{' '}
                              {Math.round(
                                event.observationConfidence *
                                  100
                              )}
                              %
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-[9px] uppercase ${sourceClass(
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
                          correlated by
                          SightGrid
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
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-300">
                      Observation Rejected
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

                  <span className="text-[9px] px-2 py-1 rounded border border-red-800 text-red-300">
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
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-3">
          <div className="flex justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Event Input
            </span>

            <span className="text-[10px] text-slate-500">
              {
                normalizedRingEvents.length
              }{' '}
              received
            </span>
          </div>
        </div>

        <button
          onClick={runDemo}
          disabled={running}
          className="w-full bg-dash-cyan text-slate-950 font-semibold text-sm py-2.5 rounded-lg hover:bg-cyan-300 transition disabled:opacity-50"
        >
          {running
            ? 'Evaluating observations...'
            : normalizedRingEvents.length >
                0
              ? 'Continue Across Site'
              : 'Run Intelligent Scenario'}
        </button>

        <p className="text-[9px] text-center text-slate-600 mt-2">
          Additional demo observations are
          explicitly simulated.
        </p>
      </div>
    </aside>
  )
}