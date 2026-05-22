"use client"

import { useEffect, useState } from "react"

export function GlitchOverlay() {
  const [flicker, setFlicker] = useState(false)
  const [scan,    setScan]    = useState(false)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    const trigger = () => {
      const r = Math.random()

      if (r < 0.45) {
        // Double flicker
        setFlicker(true)
        setTimeout(() => setFlicker(false), 55)
        setTimeout(() => setFlicker(true),  95)
        setTimeout(() => setFlicker(false), 165)
      } else if (r < 0.75) {
        // Single flash
        setFlicker(true)
        setTimeout(() => setFlicker(false), 35 + Math.random() * 80)
      } else {
        // Scanline sweep
        setScan(true)
        setTimeout(() => setScan(false), 700)
      }

      t = setTimeout(trigger, 14000 + Math.random() * 26000)
    }

    t = setTimeout(trigger, 7000 + Math.random() * 11000)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-[9000]"
        style={{
          background: "rgba(180,255,180,0.022)",
          opacity: flicker ? 1 : 0,
          transition: flicker ? "none" : "opacity 0.04s",
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-[9000] overflow-hidden"
        style={{ opacity: scan ? 1 : 0, transition: "opacity 0.08s" }}
      >
        <div
          className="w-full h-px bg-green-500/20"
          style={{ animation: scan ? "glitch-scan 0.7s linear forwards" : "none" }}
        />
      </div>
    </>
  )
}
