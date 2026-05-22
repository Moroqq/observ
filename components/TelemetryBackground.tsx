"use client"

import { useEffect, useState } from "react"

const ASCII_CHARS = ["│", "┊", "╎", "┃", "╵", "╷", " ", " ", " "]
const COLUMN_SIZE = 30

function randomChar() {
  return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
}

function AsciiColumn({ side }: { side: "left" | "right" }) {
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length: COLUMN_SIZE }, randomChar)
  )

  useEffect(() => {
    const tick = () => {
      setChars(prev => {
        const next = [...prev]
        const count = 2 + Math.floor(Math.random() * 2)
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * COLUMN_SIZE)
          next[idx] = randomChar()
        }
        return next
      })
    }
    const id = setInterval(tick, 2500 + Math.random() * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={`absolute top-0 bottom-0 hidden md:flex flex-col ${side === "left" ? "left-4" : "right-4"}`}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {chars.map((c, i) => (
        <span key={i} className="text-xs leading-tight font-mono" style={{ color: "rgba(34,197,94,0.2)" }}>
          {c}
        </span>
      ))}
    </div>
  )
}

const DIAMONDS = [
  { top: "12%", left: "8%",  size: 18, dur: 14 },
  { top: "70%", left: "6%",  size: 24, dur: 18 },
  { top: "30%", left: "88%", size: 16, dur: 12 },
  { top: "80%", left: "92%", size: 28, dur: 20 },
  { top: "55%", left: "14%", size: 20, dur: 16 },
  { top: "18%", left: "78%", size: 22, dur: 15 },
  { top: "45%", left: "95%", size: 18, dur: 17 },
  { top: "88%", left: "50%", size: 16, dur: 13 },
]

const CORNERS = [
  { top: 24, left: 24, delay: "0s" },
  { top: 24, right: 24, delay: "0.4s" },
  { bottom: 24, left: 24, delay: "0.8s" },
  { bottom: 24, right: 24, delay: "1.2s" },
]

function CursorPing() {
  const [pos,     setPos]     = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const schedule = () => {
      const delay = 8000 + Math.random() * 4000
      const id = setTimeout(() => {
        setPos({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 })
        setVisible(true)
        setTimeout(() => { setVisible(false); schedule() }, 600)
      }, delay)
      return id
    }
    const id = schedule()
    return () => clearTimeout(id)
  }, [])

  if (!pos) return null

  return (
    <div
      className="absolute font-mono text-[10px] hidden md:block transition-opacity duration-300"
      style={{
        top:     `${pos.y}%`,
        left:    `${pos.x}%`,
        color:   "rgba(34,197,94,0.6)",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      &gt;
    </div>
  )
}

export function TelemetryBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Layer 1: grid */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      >
        <defs>
          <pattern id="telemetry-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-white/[0.04]"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#telemetry-grid)" />
      </svg>

      {/* Layer 2: floating diamonds */}
      {DIAMONDS.map((d, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top:       d.top,
            left:      d.left,
            width:     d.size,
            height:    d.size,
            display:   "flex",
            alignItems: "center",
            justifyContent: "center",
            color:     "rgba(34,197,94,0.10)",
            fontSize:  d.size,
            animation: `spin ${d.dur}s linear infinite`,
          }}
        >
          ◆
        </div>
      ))}

      {/* Layer 3: ASCII columns */}
      <AsciiColumn side="left" />
      <AsciiColumn side="right" />

      {/* Layer 4: corner pulse markers */}
      {CORNERS.map((c, i) => (
        <div
          key={i}
          className="absolute font-mono text-[10px]"
          style={{
            ...c,
            color:     "rgba(34,197,94,0.4)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            animationDelay: c.delay,
          }}
        >
          ▮
        </div>
      ))}

      {/* Layer 5: cursor ping */}
      <CursorPing />
    </div>
  )
}
