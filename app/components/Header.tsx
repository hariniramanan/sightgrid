'use client'

interface HeaderProps {
  connected: boolean
  enabledCount: number
  simpleMode?: boolean
}

export function Header({
  connected,
  enabledCount,
  simpleMode,
}: HeaderProps) {
  return (
    <header className="h-[68px] bg-dash-panel border-b border-slate-700 px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-dash-cyan text-xl">
          ◈
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-wide">
              SightGrid
            </h1>

            <span className="text-[9px] px-2 py-0.5 rounded-full border border-cyan-700/50 bg-cyan-950/30 text-cyan-300 uppercase tracking-wider">
              Prototype
            </span>
          </div>

          <p className="text-[10px] text-slate-400 tracking-[0.18em] uppercase">
            Spatial Event Intelligence
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {simpleMode ? (
          <>
            <span className="hidden sm:inline text-[10px] text-slate-500 uppercase tracking-wider">
              Ring Playground
            </span>

            <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-950/60 border border-green-800/60 text-green-300">
              ● RING API CONNECTED
            </span>
          </>
        ) : (
          <>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                connected
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}
            >
              {connected ? '● Connected' : '○ Disconnected'}
            </span>

            {enabledCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-900 text-purple-300">
                {enabledCount} processor
                {enabledCount > 1 ? 's' : ''} active
              </span>
            )}
          </>
        )}
      </div>
    </header>
  )
}