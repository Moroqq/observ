"use client"

import { useEffect, useRef, useState } from "react"

const CHARS    = "アイウエオカキクケコサシスセソ01234567890ABCDEFｦｧｨｩｪ<>{}[]|/\\!?#@$%"
const MIN_DIST = 20
const DECAY    = 0.952

interface Particle { x: number; y: number; char: string; alpha: number }

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  const target    = useRef({ x: -100, y: -100 })
  const current   = useRef({ x: -100, y: -100 })
  const lastPt    = useRef({ x: -100, y: -100 })
  const particles = useRef<Particle[]>([])
  const raf       = useRef<number>()

  // Keep canvas sized to viewport
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }
      setVisible(true)

      const dx = e.clientX - lastPt.current.x
      const dy = e.clientY - lastPt.current.y
      if (Math.hypot(dx, dy) >= MIN_DIST) {
        particles.current.push({
          x:     e.clientX + (Math.random() - 0.5) * 10,
          y:     e.clientY + (Math.random() - 0.5) * 10,
          char:  CHARS[Math.floor(Math.random() * CHARS.length)],
          alpha: 0.65 + Math.random() * 0.25,
        })
        lastPt.current = { x: e.clientX, y: e.clientY }
        if (particles.current.length > 80) particles.current.shift()
      }
    }
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    document.addEventListener("mousemove",  onMove)
    document.addEventListener("mouseleave", onLeave)
    document.addEventListener("mouseenter", onEnter)

    const tick = () => {
      // Smooth cursor follow
      const el = cursorRef.current
      if (el) {
        current.current.x += (target.current.x - current.current.x) * 0.22
        current.current.y += (target.current.y - current.current.y) * 0.22
        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`
      }

      // Draw trail
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = '11px monospace'

        particles.current = particles.current.filter(p => p.alpha > 0.02)
        for (const p of particles.current) {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle   = "#4ade80"
          ctx.fillText(p.char, p.x - 5, p.y + 4)
          p.alpha *= DECAY
          p.y     += 0.4  // slow downward matrix drift
        }
      }

      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener("mousemove",  onMove)
      document.removeEventListener("mouseleave", onLeave)
      document.removeEventListener("mouseenter", onEnter)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <style>{`@media (pointer: fine) { *, *::before, *::after { cursor: none !important; } }`}</style>

      {/* Trail canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
      />

      {/* Cursor crosshair */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ willChange: "transform", opacity: visible ? 1 : 0, transition: "opacity 0.15s" }}
      >
        <div className="relative w-5 h-5" style={{ transform: "translate(-50%, -50%)" }}>
          <div
            className="absolute inset-0 border border-green-500 rotate-45"
            style={{ boxShadow: "0 0 7px rgba(34,197,94,0.4)" }}
          />
          <div className="absolute w-1 h-1 bg-green-400 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </>
  )
}
