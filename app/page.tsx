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
        <div className="flex-1 flex min-h-0 bg-[#F4F1EE]">
          <aside className="hidden lg:flex w-[184px] shrink-0 bg-[#011D4D] text-white flex-col">
            <div className="px-5 pt-6 pb-8">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-[#1282A2] flex items-center justify-center text-[11px] font-bold">SG</div>
                <span className="text-[17px] font-semibold tracking-tight">SightGrid</span>
              </div>
              <p className="mt-3 text-[8px] uppercase tracking-[0.16em] text-[#E4DFDA]/50">Spatial Intelligence</p>
            </div>
            <nav className="px-3 space-y-1 text-[11px]">
              <div className="rounded-md bg-[#034078] px-3 py-2.5 font-medium">Live View</div>
              {['Incidents', 'Devices', 'Site Topology', 'Settings'].map(item => (
                <div key={item} className="px-3 py-2.5 text-[#E4DFDA]/65">{item}</div>
              ))}
            </nav>
            <div className="mt-auto border-t border-white/10 px-5 py-5">
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`h-2 w-2 rounded-full ${deviceId && !deviceError ? 'bg-[#1282A2]' : 'bg-[#63372C]'}`} />
                <span className="text-[#E4DFDA]/75">{deviceId && !deviceError ? 'Ring API connected' : 'Ring API unavailable'}</span>
              </div>
              <p className="mt-2 text-[8px] leading-4 text-[#E4DFDA]/40">Ring Developers Playground</p>
            </div>
          </aside>

          <main className="flex-1 min-w-0 overflow-y-auto p-5 text-[#011D4D]">
            <div className="mx-auto max-w-[1160px]">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1282A2]">Live operations</p>
                  <h2 className="mt-1 text-[20px] font-semibold tracking-tight">Site Overview</h2>
                </div>
                <div className="hidden sm:flex items-center gap-5 text-[9px] text-[#6F747B]">
                  <span><span className="text-[#1282A2]">●</span>{' '}Ring Playground</span>
                  <span>3 simulated sources</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_238px] gap-3">
                <section className="relative min-h-[470px] rounded-lg border border-[#011D4D]/20 bg-[#07101F] overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" />
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-black/55 p-4">
                    <div>
                      <p className="text-[14px] font-semibold text-white">North Gate</p>
                      <p className="mt-1 text-[9px] text-white/55">Playground Device · Ring API</p>
                    </div>
                    <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#E4DFDA]">Ring Playground</span>
                  </div>
                  {!streamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07101F] px-6">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/45">◉</div>
                      <button onClick={startStream} disabled={!deviceId} className={`rounded-md px-5 py-2.5 text-[11px] font-semibold transition ${deviceId ? 'bg-[#1282A2] text-white hover:bg-[#034078]' : 'cursor-not-allowed bg-white/10 text-white/35'}`}>
                        {deviceId ? 'Start Ring Live View' : deviceError ? 'Ring device unavailable' : 'Discovering Ring device...'}
                      </button>
                      {streamError && <p className="mt-3 max-w-sm text-center text-[10px] text-[#E4DFDA]">{streamError}</p>}
                      {deviceError && <p className="mt-3 max-w-sm text-center text-[10px] text-[#E4DFDA]">{deviceError}</p>}
                    </div>
                  )}
                  {streamActive && (
                    <>
                      <div className="absolute bottom-4 left-4 flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-white"><span className="h-2 w-2 rounded-full bg-[#1282A2]" />Live</span>
                        <span className="text-[8px] uppercase tracking-wider text-white/55">Ring API</span>
                      </div>
                      <button onClick={stopStream} className="absolute bottom-4 right-4 rounded border border-white/20 bg-black/50 px-3 py-1.5 text-[9px] text-white/75 hover:bg-black/70">Stop stream</button>
                    </>
                  )}
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                  <VirtualCamera zone="Courtyard" device="Camera 02" detail="Adjacent to North Gate" active={activeZones.includes('courtyard')} />
                  <VirtualCamera zone="Block A" device="Camera 03" detail="East building entrance" active={activeZones.includes('block-a')} />
                  <section className={`min-h-[145px] rounded-lg border transition-colors ${doorOpen ? 'border-[#63372C] bg-[#63372C]/[0.06]' : 'border-[#011D4D]/15 bg-[#FAF8F6]'}`}>
                    <div className="h-full p-4 flex flex-col justify-between">
                      <div className="flex justify-between gap-3">
                        <div><p className="text-[12px] font-semibold">Block B Door</p><p className="mt-1 text-[8px] text-[#6F747B]">Contact Sensor 01</p></div>
                        <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#6F747B]">Simulated</span>
                      </div>
                      <div>
                        <p className={`text-[20px] font-semibold ${doorOpen ? 'text-[#63372C]' : 'text-[#011D4D]'}`}>{doorOpen ? 'OPEN' : 'CLOSED'}</p>
                        <p className="mt-1 text-[8px] leading-4 text-[#6F747B]">{doorOpen ? 'Correlated with active incident' : 'Contact sensor monitoring'}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(240px,.65fr)] gap-3">
                <section className="rounded-lg border border-[#011D4D]/15 bg-[#FAF8F6] p-5">
                  <div className="mb-5 flex items-start justify-between">
                    <div><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1282A2]">Spatial context</p><h3 className="mt-1 text-[13px] font-semibold">Site Topology</h3></div>
                    <span className="text-[8px] text-[#6F747B]">Physical adjacency</span>
                  </div>
                  <div className="flex min-h-[82px] items-center justify-center">
                    <TopologyNode label="North Gate" ring active={activeZones.includes('north-gate')} />
                    <TopologyEdge active={activeZones.includes('north-gate') && activeZones.includes('courtyard')} />
                    <TopologyNode label="Courtyard" active={activeZones.includes('courtyard')} />
                    <div className="relative">
                      <TopologyEdge active={activeZones.includes('courtyard') && activeZones.includes('block-a')} />
                      <div className={`absolute left-1/2 top-full h-7 border-l ${activeZones.includes('block-b') ? 'border-[#034078]' : 'border-[#011D4D]/20'}`} />
                    </div>
                    <TopologyNode label="Block A" active={activeZones.includes('block-a')} />
                  </div>
                  <div className="flex justify-center"><div className="ml-[110px]"><TopologyNode label="Block B" small active={activeZones.includes('block-b')} /></div></div>
                </section>

                <section className="rounded-lg border border-[#011D4D]/15 bg-[#FAF8F6] p-5">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1282A2]">Site summary</p>
                  <div className="mt-3 divide-y divide-[#011D4D]/10">
                    <SummaryRow label="Ring sources" value="1" />
                    <SummaryRow label="Simulated sources" value="3" />
                    <SummaryRow label="Active zones" value={String(activeZones.length)} accent />
                    <SummaryRow label="Block B door" value={doorOpen ? 'OPEN' : 'CLOSED'} warning={doorOpen} />
                  </div>
                </section>
              </div>

              <section className="mt-3 rounded-lg border border-[#011D4D]/15 bg-[#FAF8F6] p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1282A2]">Event stream</p><h3 className="mt-1 text-[13px] font-semibold">Ring Event Status</h3></div>
                  <span className="text-[9px] text-[#6F747B]">{events.length} received</span>
                </div>
                <p className="mt-3 text-[9px] leading-5 text-[#6F747B]">Ring events feed the shared incident graph. The judge scenario can also run with explicitly simulated sources.</p>
              </section>
            </div>
          </main>

          <SightGridDemo ringEvents={events} onActiveZonesChange={setActiveZones} onDoorStateChange={setDoorOpen} />
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

function VirtualCamera({ zone, device, detail, active = false }: { zone: string; device: string; detail: string; active?: boolean }) {
  return (
    <section className={`min-h-[145px] rounded-lg border transition-colors ${active ? 'border-[#034078] bg-[#034078]/[0.05]' : 'border-[#011D4D]/15 bg-[#FAF8F6]'}`}>
      <div className="h-full p-4 flex flex-col justify-between text-[#011D4D]">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[12px] font-semibold">{zone}</p><p className="mt-1 text-[8px] text-[#6F747B]">{device}</p></div>
          <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#6F747B]">Simulated</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div><p className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${active ? 'text-[#034078]' : 'text-[#6F747B]'}`}>{active ? 'Motion observed' : 'Monitoring'}</p><p className="mt-1 text-[8px] leading-4 text-[#6F747B]">{active ? 'Correlated with active incident' : detail}</p></div>
          <div className={`flex h-8 w-10 items-center justify-center rounded border ${active ? 'border-[#034078] text-[#034078]' : 'border-[#011D4D]/20 text-[#011D4D]/30'}`}><span className="text-[12px]">◉</span></div>
        </div>
      </div>
    </section>
  )
}

function SummaryRow({ label, value, accent = false, warning = false }: { label: string; value: string; accent?: boolean; warning?: boolean }) {
  return <div className="flex items-center justify-between py-3"><span className="text-[10px] text-[#6F747B]">{label}</span><span className={`text-[11px] font-semibold ${warning ? 'text-[#63372C]' : accent ? 'text-[#034078]' : 'text-[#011D4D]'}`}>{value}</span></div>
}

function TopologyNode({ label, ring = false, small = false, active = false }: { label: string; ring?: boolean; small?: boolean; active?: boolean }) {
  return <div className={`relative z-10 rounded-md border px-4 py-2 text-center transition-colors ${active ? 'border-[#034078] bg-[#034078] text-white' : 'border-[#011D4D]/20 bg-[#F4F1EE] text-[#011D4D]'} ${small ? 'text-[8px]' : 'text-[9px]'}`}><p className="font-medium">{label}</p>{ring && <p className={`mt-0.5 text-[7px] uppercase tracking-wider ${active ? 'text-white/70' : 'text-[#1282A2]'}`}>Ring</p>}{active && !ring && <p className="mt-0.5 text-[7px] uppercase tracking-wider text-white/70">Active</p>}</div>
}

function TopologyEdge({ active = false }: { active?: boolean }) {
  return <div className={`relative w-16 border-t ${active ? 'border-[#034078]' : 'border-[#011D4D]/20'}`}><div className={`absolute right-0 -top-[3px] h-1.5 w-1.5 rounded-full ${active ? 'bg-[#034078]' : 'bg-[#011D4D]/25'}`} /></div>
}
