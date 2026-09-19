'use client'

import {
  useState,
  useEffect,
  useRef,
} from 'react'
import { useVideoProcessing } from '@/lib/video-processors/useVideoProcessing'
import '@/lib/video-processors'

import { Header } from './components/Header'
import { EventPanel } from './components/EventPanel'
import { ProcessorPanel } from './components/ProcessorPanel'
import { SightGridDemo } from './components/SightGridDemo'
import { useWebRTCStream } from './hooks/useWebRTCStream'
import { useEventStream } from './hooks/useEventStream'
import { useCanvasOverlay } from './hooks/useCanvasOverlay'

type RightPanelTab =
  | 'events'
  | 'processors'

type AuthMode =
  | 'access_token'
  | 'refresh_token'
  | null

export default function Dashboard() {
  const [rightPanelTab, setRightPanelTab] =
    useState<RightPanelTab>('events')

  const [webhookUrl, setWebhookUrl] =
    useState('')

  const [deviceId, setDeviceId] =
    useState<string | undefined>(undefined)

  const [deviceError, setDeviceError] =
    useState<string | null>(null)

  const [authMode, setAuthMode] =
    useState<AuthMode>(null)

  const [authError, setAuthError] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const videoRef =
    useRef<HTMLVideoElement>(null)

  const canvasRef =
    useRef<HTMLCanvasElement>(null)
  
  const [activeZones, setActiveZones] =
    useState<string[]>([])
  const [doorOpen, setDoorOpen] =
    useState(false)

  useEffect(() => {
    fetch('/api/ring/config')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setAuthError(data.error)
        } else {
          setAuthMode(data.mode)
        }
      })
      .catch(err =>
        setAuthError(err.message)
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!authMode) return

    fetch('/api/ring/devices')
      .then(res => res.json())
      .then(data => {
        if (
          data.devices &&
          data.devices.length > 0
        ) {
          setDeviceId(data.devices[0].id)
        } else {
          setDeviceError(
            data.error || 'No devices found'
          )
        }
      })
      .catch(err =>
        setDeviceError(err.message)
      )
  }, [authMode])

  const {
    streamActive,
    streamError,
    startStream,
    stopStream,
  } = useWebRTCStream({
    videoRef,
    deviceId,
  })

  const {
    events,
    connected,
  } = useEventStream({})

  const {
    processors,
    results,
    toggleProcessor,
    enabledCount,
  } = useVideoProcessing({
    video: videoRef.current,
    canvas: canvasRef.current,
    enabled: streamActive,
    fps: 10,
  })

  useCanvasOverlay({
    videoRef,
    canvasRef,
    events,
    results,
  })

  useEffect(() => {
    setWebhookUrl(
      `${window.location.origin}/api/webhook`
    )
  }, [])

  const isSimpleMode =
    authMode === 'access_token'

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dash-bg">
        <p className="text-slate-400">
          Loading SightGrid...
        </p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="h-screen flex items-center justify-center bg-dash-bg">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">
            Configuration Error
          </p>

          <p className="text-slate-400">
            {authError}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-dash-bg text-white">
      <Header
        connected={
          isSimpleMode
            ? true
            : connected
        }
        enabledCount={
          isSimpleMode
            ? 0
            : enabledCount
        }
        simpleMode={isSimpleMode}
      />

      {isSimpleMode ? (
        <div className="flex-1 flex min-h-0">

          {/* Main command center */}
          <main className="flex-1 min-w-0 flex flex-col p-4 gap-4 overflow-y-auto">

            {/* Section heading */}
            <div className="flex items-end justify-between shrink-0">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Site Overview
                </p>

                <h2 className="text-lg font-semibold text-white mt-1">
                  Device Grid
                </h2>
              </div>

              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span>
                  <span className="text-green-400">
                    ●
                  </span>{' '}
                  1 Ring device
                </span>

                <span>
                  <span className="text-amber-400">
                    ●
                  </span>{' '}
                  3 simulated devices
                </span>
              </div>
            </div>

            {/* Device grid */}
            <div className="grid grid-cols-2 gap-3 min-h-[420px]">

              {/* Real Ring camera */}
              <section className="relative min-h-[240px] rounded-xl border border-green-900/70 bg-black overflow-hidden group">

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-contain"
                />

                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      North Gate
                    </p>

                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Playground Device
                    </p>
                  </div>

                  <span className="text-[9px] px-2 py-1 rounded-full bg-green-950/80 border border-green-700 text-green-300">
                    ● REAL RING
                  </span>
                </div>

                {!streamActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                      ◉
                    </div>

                    <button
                      onClick={startStream}
                      disabled={!deviceId}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
                        deviceId
                          ? 'bg-dash-cyan text-black hover:bg-cyan-300'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {deviceId
                        ? 'Start Ring Live View'
                        : 'Discovering Ring device...'}
                    </button>

                    {streamError && (
                      <p className="text-red-400 text-xs mt-2">
                        {streamError}
                      </p>
                    )}

                    {deviceError && (
                      <p className="text-red-400 text-xs mt-2">
                        {deviceError}
                      </p>
                    )}
                  </div>
                )}

                {streamActive && (
                  <>
                    <div className="absolute left-3 bottom-3 flex items-center gap-2">
                      <span className="text-[9px] px-2 py-1 rounded bg-red-950/80 border border-red-800 text-red-300">
                        ● LIVE
                      </span>

                      <span className="text-[9px] px-2 py-1 rounded bg-black/70 text-slate-300">
                        RING API
                      </span>
                    </div>

                    <button
                      onClick={stopStream}
                      className="absolute right-3 bottom-3 px-2.5 py-1.5 bg-black/70 border border-slate-700 text-slate-300 text-[10px] rounded hover:bg-slate-800"
                    >
                      Stop stream
                    </button>
                  </>
                )}
              </section>
              
              <VirtualCamera
                zone="Courtyard"
                device="Camera 02"
                detail="Adjacent to North Gate"
                active={activeZones.includes('courtyard')}
              />

              <VirtualCamera
                zone="Block A"
                device="Camera 03"
                detail="East building entrance"
                active={activeZones.includes('block-a')}
                />

              {/* Door sensor */}
              <section className="relative min-h-[190px] rounded-xl border border-slate-700 bg-dash-card overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-32 border-2 border-slate-700 rounded-t-lg">
                    <div className="absolute right-3 top-1/2 w-2 h-2 rounded-full bg-slate-600" />
                  </div>
                </div>

                <div className="relative h-full p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Block B Door
                      </p>

                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Contact Sensor 01
                      </p>
                    </div>

                    <span className="text-[9px] px-2 py-1 rounded-full border border-amber-800/70 bg-amber-950/30 text-amber-300">
                      SIMULATED
                    </span>
                  </div>

                  <div>
                    <p
                      className={`text-2xl font-light ${
                        doorOpen
                          ? 'text-purple-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {doorOpen ? 'OPEN' : 'CLOSED'}
                    </p>

                    <p
                      className={`text-[10px] mt-1 ${
                        doorOpen
                          ? 'text-purple-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {doorOpen
                        ? 'Door state correlated with active incident'
                        : 'Virtual sensor · monitoring'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Site topology */}
            <section className="shrink-0 rounded-xl border border-slate-700 bg-dash-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-dash-cyan">
                    Spatial Context
                  </p>

                  <h3 className="text-sm font-semibold text-white mt-1">
                    Site Topology
                  </h3>
                </div>

                <span className="text-[9px] text-slate-500">
                  Edges represent physical adjacency
                </span>
              </div>

              <div className="flex items-center justify-center min-h-[90px]">
                <TopologyNode
                  label="North Gate"
                  ring
                  active={activeZones.includes('north-gate')}
                />

                <TopologyEdge
                  active={
                    activeZones.includes('north-gate') &&
                    activeZones.includes('courtyard')
                  }
                />

                <TopologyNode
                  label="Courtyard"
                  active={activeZones.includes('courtyard')}
                />

                <div className="relative">
                  <TopologyEdge
                    active={
                      activeZones.includes('courtyard') &&
                      activeZones.includes('block-a')
                    }
                  />

                  <div
                    className={`absolute left-1/2 top-full h-7 border-l transition-all duration-500 ${
                      activeZones.includes('block-b')
                        ? 'border-cyan-400'
                        : 'border-slate-600'
                    }`}
                  />
                </div>

                <TopologyNode
                  label="Block A"
                  active={activeZones.includes('block-a')}
                />
              </div>

              <div className="flex justify-center">
                <div className="ml-[110px]">
                  <TopologyNode
                    label="Block B"
                    small
                    active={activeZones.includes('block-b')}
                  />
                </div>
              </div>
            </section>
          </main>
          <SightGridDemo
            ringEvents={events}
            onActiveZonesChange={setActiveZones}
            onDoorStateChange={setDoorOpen}
          />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">

          {/* Original Ring sample interface retained
              for refresh-token mode */}
          <div className="w-[60%] p-4 flex flex-col">
            <div className="relative flex-1 bg-black rounded-xl overflow-hidden">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={startStream}
                    disabled={!deviceId}
                    className={`px-6 py-3 font-bold rounded-lg transition ${
                      deviceId
                        ? 'bg-dash-cyan text-black hover:bg-cyan-300'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {deviceId
                      ? '▶ Start Live Stream'
                      : '⏳ Discovering device...'}
                  </button>

                  {streamError && (
                    <p className="text-red-400 text-sm">
                      {streamError}
                    </p>
                  )}

                  {deviceError && (
                    <p className="text-red-400 text-sm">
                      {deviceError}
                    </p>
                  )}
                </div>
              )}

              {streamActive && (
                <button
                  onClick={stopStream}
                  className="absolute top-3 right-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500"
                >
                  ■ Stop
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Webhook URL:</span>

              <code className="bg-dash-card px-2 py-1 rounded text-slate-300 flex-1 truncate">
                {webhookUrl}
              </code>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    webhookUrl
                  )
                }
                className="px-2 py-1 bg-dash-card rounded hover:bg-slate-600 text-slate-400"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="w-[40%] border-l border-slate-700 flex flex-col">
            <div className="p-3 border-b border-slate-700 flex gap-2">
              <button
                onClick={() =>
                  setRightPanelTab('events')
                }
                className={`text-xs px-3 py-1 rounded-full ${
                  rightPanelTab === 'events'
                    ? 'bg-dash-cyan text-black font-medium'
                    : 'bg-dash-card text-slate-400 hover:bg-slate-600'
                }`}
              >
                Events
              </button>

              <button
                onClick={() =>
                  setRightPanelTab('processors')
                }
                className={`text-xs px-3 py-1 rounded-full ${
                  rightPanelTab === 'processors'
                    ? 'bg-dash-cyan text-black font-medium'
                    : 'bg-dash-card text-slate-400 hover:bg-slate-600'
                }`}
              >
                Processors{' '}
                {enabledCount > 0 &&
                  `(${enabledCount})`}
              </button>
            </div>

            {rightPanelTab === 'events' ? (
              <EventPanel
                events={events}
                webhookUrl={webhookUrl}
              />
            ) : (
              <ProcessorPanel
                processors={processors}
                results={results}
                onToggle={toggleProcessor}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function VirtualCamera({
  zone,
  device,
  detail,
  active = false,
}: {
  zone: string
  device: string
  detail: string
  active?: boolean
}) {
  return (
    <section
      className={`relative min-h-[190px] rounded-xl overflow-hidden transition-all duration-500 ${
        active
          ? 'border border-cyan-500 bg-cyan-950/20 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
          : 'border border-slate-700 bg-dash-card'
      }`}
    >
      {active && (
        <div className="absolute inset-0 border border-cyan-400/30 rounded-xl pointer-events-none" />
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div
            className={`w-28 h-20 border rounded-lg flex items-center justify-center transition-all duration-500 ${
              active
                ? 'border-cyan-700 bg-cyan-950/40'
                : 'border-slate-700 bg-slate-900/60'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                active
                  ? 'border-cyan-500'
                  : 'border-slate-600'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  active
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
            </div>
          </div>

          <div
            className={`w-8 h-3 border-x border-b mx-auto ${
              active
                ? 'border-cyan-700'
                : 'border-slate-700'
            }`}
          />
        </div>
      </div>

      <div className="relative h-full p-3 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-white">
              {zone}
            </p>

            <p className="text-[10px] text-slate-500 mt-0.5">
              {device}
            </p>
          </div>

          <span className="text-[9px] px-2 py-1 rounded-full border border-amber-800/70 bg-amber-950/30 text-amber-300">
            SIMULATED
          </span>
        </div>

        <div>
          {active ? (
            <>
              <p className="text-[10px] uppercase tracking-wider text-cyan-300">
                ● Motion observed
              </p>

              <p className="text-[10px] text-cyan-700 mt-1">
                Correlated with active incident
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                ● Monitoring
              </p>

              <p className="text-[10px] text-slate-600 mt-1">
                {detail}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
function TopologyNode({
  label,
  ring = false,
  small = false,
  active = false,
}: {
  label: string
  ring?: boolean
  small?: boolean
  active?: boolean
}) {
  return (
    <div
      className={`relative z-10 rounded-lg border px-4 py-2 text-center transition-all duration-500 ${
        active
          ? 'border-cyan-500 bg-cyan-950/50 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
          : ring
            ? 'border-green-800 bg-green-950/30'
            : 'border-slate-700 bg-dash-card'
      } ${small ? 'text-[10px]' : 'text-xs'}`}
    >
      <p className={active ? 'text-cyan-200' : 'text-slate-200'}>
        {label}
      </p>

      {ring && (
        <p className="text-[8px] text-green-400 mt-0.5">
          RING
        </p>
      )}

      {active && !ring && (
        <p className="text-[8px] text-cyan-400 mt-0.5">
          ACTIVE
        </p>
      )}
    </div>
  )
}

function TopologyEdge({
  active = false,
}: {
  active?: boolean
}) {
  return (
    <div
      className={`w-16 border-t relative transition-all duration-500 ${
        active
          ? 'border-cyan-400'
          : 'border-slate-600'
      }`}
    >
      <div
        className={`absolute right-0 -top-[3px] w-1.5 h-1.5 rounded-full ${
          active
            ? 'bg-cyan-400'
            : 'bg-slate-600'
        }`}
      />
    </div>
  )
}
