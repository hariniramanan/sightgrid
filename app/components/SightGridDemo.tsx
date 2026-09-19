'use client'

import { useEffect, useRef, useState } from 'react'
import { DetectionEvent } from './EventCard'
import { normalizeRingEvent } from '@/lib/sightgrid/ringAdapter'
import { SightGridEvent, SightGridIncident } from '@/lib/sightgrid/types'
import {
  addEventToIncident,
  createIncident,
} from '@/lib/sightgrid/correlator'

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

interface SightGridDemoProps {
  ringEvents: DetectionEvent[]
}

export function SightGridDemo({
  ringEvents,
}: SightGridDemoProps) {
  const [incident, setIncident] =
    useState<SightGridIncident | null>(null)

  const [running, setRunning] = useState(false)

  const processedEventIds = useRef<Set<string>>(new Set())

  const normalizedRingEvents = ringEvents
    .map(normalizeRingEvent)
    .filter((event): event is SightGridEvent => event !== null)

  const zoneName = (zoneId: string) => {
    const names: Record<string, string> = {
      'north-gate': 'North Gate',
      courtyard: 'Courtyard',
      'block-a': 'Block A',
      'block-b': 'Block B',
    }

    return names[zoneId] ?? zoneId
  }

  /*
   * When a Ring/test webhook arrives, make it the beginning
   * of a SightGrid incident.
   */
  useEffect(() => {
    const latestEvent = normalizedRingEvents[0]

    if (!latestEvent) return

    if (processedEventIds.current.has(latestEvent.id)) {
      return
    }

    processedEventIds.current.add(latestEvent.id)

    setIncident(createIncident(latestEvent))
  }, [ringEvents])

  /*
   * Demonstrates additional cameras observing activity after
   * the first event.
   *
   * If a webhook event already exists, it becomes observation #1.
   * Otherwise we create a completely simulated North Gate event.
   */
  const runDemo = async () => {
    if (running) return

    setRunning(true)

    const start = Date.now()

    let current: SightGridIncident

    const latestRingEvent = normalizedRingEvents[0]

    if (latestRingEvent) {
      current = createIncident(latestRingEvent)
    } else {
      const northGateEvent: SightGridEvent = {
        id: `demo-north-${start}`,
        source: 'simulated',
        deviceId: 'camera-north',
        deviceName: 'Camera 01',
        zoneId: 'north-gate',
        type: 'motion',
        timestamp: new Date(start).toISOString(),
      }

      current = createIncident(northGateEvent)
    }

    setIncident(current)

    /*
     * Use timestamps relative to the first observation so the
     * correlation engine evaluates the sequence as one incident.
     */
    const firstTimestamp =
      new Date(current.events[0].timestamp).getTime()

    const courtyardEvent: SightGridEvent = {
      id: `demo-courtyard-${start}`,
      source: 'simulated',
      deviceId: 'camera-courtyard',
      deviceName: 'Camera 02',
      zoneId: 'courtyard',
      type: 'motion',
      timestamp: new Date(firstTimestamp + 12_000).toISOString(),
    }

    const blockAEvent: SightGridEvent = {
      id: `demo-block-a-${start}`,
      source: 'simulated',
      deviceId: 'camera-block-a',
      deviceName: 'Camera 03',
      zoneId: 'block-a',
      type: 'motion',
      timestamp: new Date(firstTimestamp + 21_000).toISOString(),
    }

    await wait(1200)

    const second =
      addEventToIncident(current, courtyardEvent)

    if (second) {
      current = second
      setIncident(current)
    }

    await wait(1200)

    const third =
      addEventToIncident(current, blockAEvent)

    if (third) {
      current = third
      setIncident(current)
    }

    setRunning(false)
  }

  const sourceLabel = (event: SightGridEvent) => {
    if (event.source === 'ring') {
      return 'REAL RING'
    }

    const simulatedWebhook =
      event.metadata?.simulated === true

    if (simulatedWebhook) {
      return 'SIMULATED WEBHOOK'
    }

    return 'SIMULATED CAMERA'
  }

  const sourceClass = (event: SightGridEvent) => {
    if (event.source === 'ring') {
      return 'text-green-400'
    }

    return 'text-amber-400'
  }

  return (
    <div className="w-[380px] border-l border-slate-700 bg-dash-panel p-4 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-dash-cyan">
            SightGrid
          </p>

          <h2 className="text-lg font-bold text-white">
            Incident Correlation
          </h2>
        </div>

        <span className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-300">
          DEMO
        </span>
      </div>

      {/* Webhook feed */}
      <div className="mb-4 rounded-lg border border-slate-700 bg-dash-card p-3">

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white">
            Ring Event Feed
          </span>

          <span className="rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-300">
            WEBHOOK FEED
          </span>
        </div>

        {normalizedRingEvents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            Waiting for Ring webhook events...
          </p>
        ) : (
          <div className="mt-3 space-y-2">

            {normalizedRingEvents
              .slice(0, 3)
              .map(event => (
                <div
                  key={event.id}
                  className="rounded border border-slate-700 p-2"
                >
                  <div className="flex justify-between">

                    <span className="text-xs text-dash-cyan">
                      {event.type}
                    </span>

                    <span className="text-[10px] text-slate-500">
                      {new Date(
                        event.timestamp
                      ).toLocaleTimeString()}
                    </span>

                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    {event.deviceName}
                  </p>

                  <p
                    className={`mt-1 text-[10px] uppercase ${sourceClass(
                      event
                    )}`}
                  >
                    {sourceLabel(event)}
                  </p>

                </div>
              ))}

          </div>
        )}

      </div>

      {/* Demo action */}
      <button
        onClick={runDemo}
        disabled={running}
        className="w-full bg-dash-cyan text-black font-bold py-2 rounded-lg hover:bg-cyan-300 disabled:opacity-50"
      >
        {running
          ? 'Correlating Events...'
          : normalizedRingEvents.length > 0
            ? 'Continue Across Site'
            : 'Run Demo Incident'}
      </button>

      {!incident && (
        <div className="mt-6 border border-dashed border-slate-600 rounded-lg p-5 text-center">

          <p className="text-sm text-slate-400">
            No active incident
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Generate a webhook event or run the demo to begin.
          </p>

        </div>
      )}

      {incident && (
        <div className="mt-5">

          {/* Incident status */}
          <div className="flex items-center justify-between">

            <span className="text-xs text-slate-400">
              ACTIVE INCIDENT
            </span>

            <span
              className={`text-[10px] px-2 py-1 rounded ${
                incident.status === 'requires_verification'
                  ? 'bg-amber-900 text-amber-300'
                  : 'bg-blue-900 text-blue-300'
              }`}
            >
              {incident.status
                .replaceAll('_', ' ')
                .toUpperCase()}
            </span>

          </div>

          {/* Incident timeline */}
          <div className="mt-4 space-y-1">

            {incident.events.map((event, index) => (
              <div key={event.id}>

                <div className="bg-dash-card rounded-lg p-3">

                  <div className="flex justify-between">

                    <span className="text-sm font-medium text-white">
                      {zoneName(event.zoneId)}
                    </span>

                    <span className="text-xs text-slate-400">
                      {new Date(
                        event.timestamp
                      ).toLocaleTimeString()}
                    </span>

                  </div>

                  <div className="flex justify-between mt-1">

                    <span className="text-xs text-slate-400">
                      {event.deviceName}
                    </span>

                    <span
                      className={`text-[10px] uppercase ${sourceClass(
                        event
                      )}`}
                    >
                      {sourceLabel(event)}
                    </span>

                  </div>

                  <p className="text-xs text-dash-cyan mt-2">
                    Motion observed
                  </p>

                </div>

                {index <
                  incident.events.length - 1 && (
                  <div className="text-center text-slate-500 py-1">
                    ↓
                  </div>
                )}

              </div>
            ))}

          </div>

          {/* Correlation explanation */}
          {incident.events.length > 1 && (
            <div className="mt-4 border border-dash-cyan/30 bg-cyan-950/20 rounded-lg p-3">

              <p className="text-xs text-dash-cyan font-medium">
                CORRELATED SEQUENCE
              </p>

              <p className="text-sm text-white mt-2">
                {incident.path
                  .map(zoneName)
                  .join(' → ')}
              </p>

              <p className="text-xs text-slate-400 mt-2">
                {incident.events.length} observations correlated
                using time and spatial adjacency.
              </p>

            </div>
          )}

        </div>
      )}

    </div>
  )
}