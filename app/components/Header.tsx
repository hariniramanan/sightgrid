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
    <header className="h-[70px] bg-[#F4F1EE] border-b border-[#D5D0CB] px-6 flex items-center justify-between shrink-0 text-[#011D4D]">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#6F747B]">
            Site
          </p>

          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold">
              Ring Playground
            </h1>

            <span className="text-[#034078] text-xs">
              ▾
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-7">
        {simpleMode ? (
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1282A2]" />
            Ring API Connected
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected
                    ? 'bg-[#1282A2]'
                    : 'bg-[#63372C]'
                }`}
              />

              {connected
                ? 'Connected'
                : 'Disconnected'}
            </div>

            {enabledCount > 0 && (
              <span className="text-xs text-[#63372C]">
                {enabledCount} processor
                {enabledCount > 1 ? 's' : ''} active
              </span>
            )}
          </>
        )}

        <span className="hidden md:inline text-[11px] text-[#6F747B]">
          SightGrid
        </span>
      </div>
    </header>
  )
}
