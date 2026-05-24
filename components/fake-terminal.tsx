"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type LineType = "header" | "ok" | "dim" | "normal"
interface Line { text: string; type?: LineType }

const BOOT: { text: string; delay: number; type?: LineType }[] = [
  { text: "OBSERV SYSTEM v2.4",       delay: 300,  type: "header" },
  { text: "",                          delay: 600  },
  { text: "checking modules...",       delay: 800,  type: "dim"   },
  { text: "ui.engine ........ OK",    delay: 1300, type: "ok"    },
  { text: "motion.layer ..... OK",    delay: 1750, type: "ok"    },
  { text: "identity.core .... OK",    delay: 2200, type: "ok"    },
  { text: "",                          delay: 2700 },
  { text: "launching environment...", delay: 3000, type: "dim"   },
]

const EVENTS = [
  "identity.module initialized",
  "client request accepted",
  "visual system generated",
  "motion layer compiled",
  "brand.assets loaded",
  "ui.render → complete",
  "signal received",
  "environment stable",
  "design.output ready",
  "system.heartbeat OK",
  "cache.layer refreshed",
  "deploy.pipeline active",
  "auth.session valid",
  "observer.mode ON",
  "interface.sync complete",
  "motion.curve calculated",
]

const ts = () => new Date().toTimeString().slice(0, 8)

export function FakeTerminal() {
  const [lines,    setLines]    = useState<Line[]>([])
  const [min,      setMin]      = useState(false)
  const [bootDone, setBootDone] = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const bodyRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600)
    return () => clearTimeout(t)
  }, [])

  const push = useCallback((line: Line) => {
    setLines(prev => [...prev.slice(-28), line])
  }, [])

  useEffect(() => {
    BOOT.forEach(({ text, delay, type }) =>
      setTimeout(() => push({ text, type }), delay)
    )
    setTimeout(() => setBootDone(true), 3400)
  }, [push])

  useEffect(() => {
    if (!bootDone) return
    const fire = () => push({
      text: `[${ts()}] ${EVENTS[Math.floor(Math.random() * EVENTS.length)]}`,
      type: "normal",
    })
    fire()
    const id = setInterval(fire, 2200 + Math.random() * 3800)
    return () => clearInterval(id)
  }, [bootDone, push])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [lines])

  const cls = (t?: LineType) =>
    t === "header" ? "text-green-400 font-bold tracking-widest" :
    t === "ok"     ? "text-green-500" :
    t === "dim"    ? "text-green-500/50" :
                     "text-green-500/65"

  return (
    <div
      className="fixed z-50 font-mono text-[11px] select-none"
      style={{
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(520px, calc(100vw - 48px))",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div className="border border-green-500/25 bg-black/95 backdrop-blur-sm">
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b border-green-500/15 cursor-pointer hover:bg-green-500/5 transition-colors"
          onClick={() => setMin(m => !m)}
        >
          <span className="text-green-500/45 tracking-[0.25em] uppercase text-[10px]">sys.log</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-pulse" />
            <span className="text-green-500/30 text-[10px]">{min ? "▲" : "▼"}</span>
          </div>
        </div>

        {!min && (
          <div ref={bodyRef} className="p-3 h-44 overflow-hidden flex flex-col gap-[2px]">
            {lines.map((line, i) => (
              <div key={i} className={cls(line.type)}>
                {line.text || " "}
                {i === lines.length - 1 && (
                  <span className="inline-block w-[7px] h-[11px] bg-green-500/70 ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
