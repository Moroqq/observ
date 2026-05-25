"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// ── ASCII art ─────────────────────────────────────────────────────────────────
const ART_OBSERV = `
 ___  _    ___ ___ _ __  __   __
/ _ \\| |__(_-</ -_)| '__|\\  \\ / /
\\___/| '_ \\/__/\\___||_|    \\ V /
     |_.__/               \\_/   `.trimStart()

const ART_FACE = `
    T
 .-"-.
|  ___|
| (.\\/.)
|  ,,,'
| '###
 '----'`.trimStart()

const ART_FIGURE = `
     '-.
        '-. _____
 .-._      |     '.
:  ..      |      :
'-._+      |    .-'
 /  \\     .'i--i
/    \\ .-'_/____\\___
    .-'  :       `.trimStart()

const ART_ROBOT = `
        || |                               ) )
          || |   ,                          '-'
          || |  | |
          || '--' |
    ,,    || .----'
   || |   || |
   |  '---'| |
   '------.| |                                  _____
   ((_))  || |      (  _                       / /|\\ \\
   (o o)  || |      ))("),                    | | | | |
____\\_/___||_|_____((__^_))____________________\\_\\|/_/__ldb`.trimStart()

const ART_PLANE = `
jgs    /     /\\
      /     /  \\
     /_____/----\\_    (
    "     "          ).
   _ ___          o (:') o
  (@))_))        o ~/~~\\~ o
                  o  o  o`.trimStart()

const ART_CYCLE = [ART_FACE, ART_FIGURE, ART_ROBOT, ART_PLANE]

// ── Logs ──────────────────────────────────────────────────────────────────────
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

interface LogLine {
  id:    number
  text:  string
  isArt: boolean
}

let _id = 0

export function SysLogConsole({ section }: { section: string }) {
  const [lines,    setLines]    = useState<LogLine[]>([])
  const [expanded, setExpanded] = useState(false)
  const queueRef   = useRef<string[]>([])
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const artTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const artIndexRef = useRef(0)
  const bodyRef    = useRef<HTMLDivElement>(null)

  const push = useCallback((text: string, isArt = false) => {
    setLines(prev => [...prev.slice(-60), { id: _id++, text: isArt ? text : `[${ts()}] ${text}`, isArt }])
  }, [])

  // Boot: show ObserV ascii on mount
  useEffect(() => {
    const t = setTimeout(() => push(ART_OBSERV, true), 400)
    return () => clearTimeout(t)
  }, [push])

  // Rotate drawings every 35s
  useEffect(() => {
    artTimerRef.current = setInterval(() => {
      push(ART_CYCLE[artIndexRef.current % ART_CYCLE.length], true)
      artIndexRef.current++
    }, 35_000)
    return () => clearInterval(artTimerRef.current)
  }, [push])

  // Reset log queue on section change
  useEffect(() => {
    queueRef.current = [...(SECTION_LOGS[section] ?? HEARTBEAT)]
  }, [section])

  // Drip logs
  useEffect(() => {
    const fire = () => {
      const msg =
        queueRef.current.length > 0
          ? queueRef.current.shift()!
          : HEARTBEAT[Math.floor(Math.random() * HEARTBEAT.length)]
      push(msg)
      timerRef.current = setTimeout(fire, 1500 + Math.random() * 1000)
    }
    timerRef.current = setTimeout(fire, 800)
    return () => clearTimeout(timerRef.current)
  }, [push])

  // Auto-scroll
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

  const lastLine = lines.findLast(l => !l.isArt)
  const lastMsg  = lastLine ? (lastLine.text.split("] ")[1] ?? "") : ""

  return (
    <div
      className="fixed bottom-6 right-6 z-[55] font-mono text-[11px] select-none hidden sm:flex flex-col"
      style={{
        width:      expanded ? 380 : 262,
        height:     expanded ? 280 : 36,
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
          aria-controls="ov-console-body"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-pulse shrink-0" />
            <span className="text-green-500/50 tracking-[0.2em] uppercase text-[10px]">ov.console</span>
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
          id="ov-console-body"
          ref={bodyRef}
          role="log"
          aria-live="polite"
          className="overflow-y-auto px-3 pb-3 flex flex-col gap-[2px] flex-1"
        >
          {lines.map((line, i) =>
            line.isArt ? (
              <pre
                key={line.id}
                className="text-green-500/45 leading-tight py-1 border-t border-green-500/10 mt-1"
                style={{ fontSize: "8.5px", fontFamily: "inherit" }}
              >
                {line.text}
              </pre>
            ) : (
              <div
                key={line.id}
                className="text-green-500/65 leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {line.text}
                {i === lines.length - 1 && (
                  <span className="inline-block w-[6px] h-[10px] bg-green-500/70 ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
