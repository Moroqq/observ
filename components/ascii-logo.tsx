"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface AsciiLogoProps {
  onHidden?: () => void
}

const ASCII_ART = `
  ██████╗ ██╗   ██╗
 ██╔═══██╗██║   ██║
 ██║   ██║██║   ██║
 ██║   ██║╚██╗ ██╔╝
 ╚██████╔╝ ╚████╔╝
  ╚═════╝   ╚═══╝
`

const GLITCH_CHARS = "█▓▒░╔╗╚╝║═@#$%&*!?<>[]{}~^"

export function AsciiLogo({ onHidden }: AsciiLogoProps) {
  const [phase, setPhase]           = useState<"appearing" | "spinning" | "done">("appearing")
  const [glitchText, setGlitchText] = useState("")

  const onHiddenRef = useRef(onHidden)
  onHiddenRef.current = onHidden

  const triggered = useRef(false)

  const generateGlitch = useCallback(() =>
    ASCII_ART.split("\n").map(line =>
      line.split("").map(char => {
        if (char === " ") return char
        return Math.random() > 0.3
          ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          : char
      }).join("")
    ).join("\n"),
  [])

  const triggerHide = useCallback(() => {
    if (triggered.current) return
    triggered.current = true
    onHiddenRef.current?.()
    setPhase("done")
  }, [])

  // Glitch phase: 10 frames × 80 ms = 800 ms
  useEffect(() => {
    if (phase !== "appearing") return
    let count = 0
    const id = setInterval(() => {
      setGlitchText(generateGlitch())
      if (++count >= 10) {
        clearInterval(id)
        setPhase("spinning")
      }
    }, 80)
    return () => clearInterval(id)
  }, [phase, generateGlitch])

  // Fallback timeout: covers browsers where animationend doesn't fire
  useEffect(() => {
    if (phase !== "spinning") return
    const id = setTimeout(triggerHide, 2200)
    return () => clearTimeout(id)
  }, [phase, triggerHide])

  const text = phase === "appearing" ? glitchText : ASCII_ART

  return (
    <div
      className={`perspective-1000 ${phase === "spinning" ? "animate-spin-slow" : ""}`}
      onAnimationEnd={phase === "spinning" ? triggerHide : undefined}
    >
      <pre
        className={`text-white font-mono leading-none select-none ${
          phase === "appearing" ? "animate-pulse" : ""
        }`}
        style={{ fontSize: 30, whiteSpace: "pre" }}
      >
        {text}
      </pre>
    </div>
  )
}
