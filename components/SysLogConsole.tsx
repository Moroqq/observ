"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SECTION_LOGS: Record<string, string[]> = {
  hero: [
    "boot.sequence initiated",
    "ui.render → complete",
    "brand.assets loaded",
    "auth.session valid",
  ],
  services: [
    "services.module mounted",
    "pricing.matrix loaded",
    "ui.cards rendered ×3",
  ],
  "service:quick-start": [
    "deploy.pipeline active",
    "next.build success",
    "edge.functions deployed",
  ],
  "service:branding": [
    "palette.generated",
    "typography.weights loaded",
    "brandbook.compiled",
  ],
  "service:mobile": [
    "ios.build success",
    "android.compile OK",
    "expo.publish complete",
  ],
  manifesto: [
    "identity.module initialized",
    "motion.curve calculated",
    "signal received",
  ],
  metrics: [
    "sys.metrics loaded",
    "benchmarks.verified OK",
    "data.sources: stanford, google, forrester",
  ],
  calculator: [
    "estimate.engine online",
    "pricing.matrix v2.1 loaded",
    "input.handler ready",
  ],
}

const HEARTBEAT = ["system.heartbeat OK", "environment stable", "observer.mode ON"]

function ts(): string {
  return new Date().toTimeString().slice(0, 8)
}

interface LogLine { id: number; text: string }

let _id = 0

export function SysLogConsole({ section }: { section: string }) {
  const [lines,    setLines]    = useState<LogLine[]>([])
  const [expanded, setExpanded] = useState(false)
  const queueRef  = useRef<string[]>([])
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const bodyRef   = useRef<HTMLDivElement>(null)

  const push = useCallback((text: string) => {
    setLines(prev => [...prev.slice(-40), { id: _id++, text: `[${ts()}] ${text}` }])
  }, [])

  // Reset queue on section change
  useEffect(() => {
    queueRef.current = [...(SECTION_LOGS[section] ?? HEARTBEAT)]
  }, [section])

  // Drip logs on interval
  useEffect(() => {
    const fire = () => {
      const msg =
        queueRef.current.length > 0
          ? queueRef.current.shift()!
          : HEARTBEAT[Math.floor(Math.random() * HEARTBEAT.length)]
      push(msg)
      timerRef.current = setTimeout(fire, 1500 + Math.random() * 1000)
    }
    timerRef.current = setTimeout(fire, 600)
    return () => clearTimeout(timerRef.current)
  }, [push])

  // Auto-scroll when expanded
  useEffect(() => {
    if (expanded && bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [lines, expanded])

  // Esc closes
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false) }
    document.addEventListener("keydown", fn)
    return () => document.removeEventListener("keydown", fn)
  }, [])

  const lastMsg = lines.length > 0
    ? (lines[lines.length - 1].text.split("] ")[1] ?? "")
    : ""

  return (
    <div
      className="fixed bottom-6 right-6 z-[55] font-mono text-[11px] select-none hidden sm:flex flex-col"
      style={{
        width:      expanded ? 360 : 262,
        height:     expanded ? 228 : 36,
        transition: "width 220ms ease-out, height 220ms ease-out",
        transformOrigin: "bottom right",
        overflow:   "hidden",
      }}
    >
      <div className="border border-green-500/25 bg-black/95 backdrop-blur-sm h-full flex flex-col">

        {/* Title bar */}
        <button
          className="flex items-center justify-between px-3 h-9 shrink-0 hover:bg-green-500/5 transition-colors w-full"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-controls="syslog-body"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-pulse shrink-0" />
            <span className="text-green-500/50 tracking-[0.2em] uppercase text-[10px]">sys.log</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {!expanded && (
              <span className="text-green-500/30 truncate text-[10px] max-w-[120px]">
                {lastMsg}
              </span>
            )}
            <span className="text-green-500/30 shrink-0">{expanded ? "×" : "▲"}</span>
          </div>
        </button>

        {/* Log body */}
        <div
          id="syslog-body"
          ref={bodyRef}
          role="log"
          aria-live="polite"
          className="overflow-y-auto px-3 pb-3 flex flex-col gap-[2px] flex-1"
        >
          {lines.map((line, i) => (
            <div key={line.id} className="text-green-500/65 leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">
              {line.text}
              {i === lines.length - 1 && (
                <span className="inline-block w-[6px] h-[10px] bg-green-500/70 ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
