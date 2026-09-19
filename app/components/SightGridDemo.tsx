'use client'

import { useState } from 'react'
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

  const runDemo = async () => {
    if (running) return

    setRunning(true)
    setIncident(null)

    const start = Date.now()

    const events: SightGridEvent[] = [
      {
        id: 'demo-1',
        source: 'simulated',
        deviceId: 'camera-north',
        deviceName: 'Camera 01',
        zoneId: 'north-gate',
        type: 'motion',
        timestamp: new Date(start).toISOString(),
      },
      {
        id: 'demo-2',
        source: 'simulated',
        deviceId: 'camera-courtyard',
        deviceName: 'Camera 02',
        zoneId: 'courtyard',
        type: 'motion',
        timestamp: new Date(start + 12_000).toISOString(),
      },
      {
        id: 'demo-3',
        source: 'simulated',
        deviceId: 'camera-block-a',
        deviceName: 'Camera 03',
        zoneId: 'block-a',
        type: 'motion',
        timestamp: new Date(start + 21_000).toISOString(),
      },
    ]

    let current = createIncident(events[0])
    setIncident(current)

    await wait(1200)

    const second = addEventToIncident(current, events[1])

    if (second) {
      current = second
      setIncident(current)
    }

    await wait(1200)

    const third = addEventToIncident(current, events[2])

    if (third) {
      current = third
      setIncident(current)
    }

    setRunning(false)
  }

  const zoneName = (zoneId: string) => {
    const names: Record<string, string> = {
      'north-gate': 'North Gate',
      courtyard: 'Courtyard',
      'block-a': 'Block A',
      'block-b': 'Block B',
    }

    return names[zoneId] ?? zoneId
  }

  // Convert genuine Ring webhook events into SightGrid events.
  const normalizedRingEvents = ringEvents
    .map(normalizeRingEvent)
    .filter((event): event is SightGridEvent => event !== null)

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

      {/* Genuine Ring event feed */}
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
            {normalizedRingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="rounded border border-slate-700 p-2"
              >
                <div className="flex justify-between">
                  <span className="text-xs text-dash-cyan">
                    {event.type}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {event.deviceName}
                </p>

                <p
                    className={`mt-1 text-[10px] uppercase ${
                        event.source === 'ring'
                            ? 'text-green-400'
                            : 'text-amber-400'
                    }`}
                >
                    {event.source === 'ring'
                        ? 'REAL RING'
                        : 'SIMULATED WEBHOOK'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulated multi-zone demo */}
      <button
        onClick={runDemo}
        disabled={running}
        className="w-full bg-dash-cyan text-black font-bold py-2 rounded-lg hover:bg-cyan-300 disabled:opacity-50"
      >
        {running ? 'Correlating Events...' : 'Run Demo Incident'}
      </button>

      {!incident && (
        <div className="mt-6 border border-dashed border-slate-600 rounded-lg p-5 text-center">
          <p className="text-sm text-slate-400">
            No active incident
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Run the demo to simulate activity across multiple zones.
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

          {/* Incident events */}
          <div className="mt-4 space-y-1">
            {incident.events.map((event, index) => (
              <div key={event.id}>

                <div className="bg-dash-card rounded-lg p-3">

                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-white">
                      {zoneName(event.zoneId)}
                    </span>

                    <span className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">
                      {event.deviceName}
                    </span>

                    <span className="text-[10px] text-slate-500 uppercase">
                      Simulated source
                    </span>
                  </div>

                  <p className="text-xs text-dash-cyan mt-2">
                    Motion observed
                  </p>

                </div>

                {index < incident.events.length - 1 && (
                  <div className="text-center text-slate-500 py-1">
                    ↓
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Correlated path */}
          {incident.events.length > 1 && (
            <div className="mt-4 border border-dash-cyan/30 bg-cyan-950/20 rounded-lg p-3">

              <p className="text-xs text-dash-cyan font-medium">
                CORRELATED SEQUENCE
              </p>

              <p className="text-sm text-white mt-2">
                {incident.path.map(zoneName).join(' → ')}
              </p>

              <p className="text-xs text-slate-400 mt-2">
                {incident.events.length} observations correlated using
                time and spatial adjacency.
              </p>

            </div>
          )}

        </div>
      )}

    </div>
  )
}