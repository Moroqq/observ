"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./preloader.module.css"

const ASCII = [
  String.raw`_______/\\\\\_______/\\\___________________________________________________/\\\________/\\\_`,
  String.raw` _____/\\\///\\\____\/\\\__________________________________________________\/\\\_______\/\\\_`,
  String.raw`  ___/\\\/__\///\\\__\/\\\__________________________________________________\//\\\______/\\\__`,
  String.raw`   __/\\\______\//\\\_\/\\\_________/\\\\\\\\\\_____/\\\\\\\\___/\\/\\\\\\\___\//\\\____/\\\___`,
  String.raw`    _\/\\\_______\/\\\_\/\\\\\\\\\__\/\\\//////____/\\\/////\\\_\/\\\/////\\\___\//\\\__/\\\____`,
  String.raw`     _\//\\\______/\\\__\/\\\////\\\_\/\\\\\\\\\\__/\\\\\\\\\\\__\/\\\___\///_____\//\\\/\\\_____`,
  String.raw`      __\///\\\__/\\\____\/\\\__\/\\\_\////////\\\_\//\\///////___\/\\\_____________\//\\\\\______`,
  String.raw`       ____\///\\\\\/_____\/\\\\\\\\\___/\\\\\\\\\\__\//\\\\\\\\\\_\/\\\______________\//\\\_______`,
  String.raw`        ______\/////_______\/////////___\//////////____\//////////__\///________________\///________`,
]

// All frame sequences that need to be loaded before the site is shown
const FRAME_GROUPS = [
  { basePath: "/frames/observ-logo_frame_",         count: 407 },
  { basePath: "/frameswebsite/websiteobrez_frame_", count: 101 },
  { basePath: "/framesdesign/designobrez_frame_",   count: 151 },
  { basePath: "/framesapp/prilozhenieobrez_frame_", count: 103 },
]

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

function detectIOS() {
  if (typeof window === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

interface Props {
  onComplete: () => void
}

export function Preloader({ onComplete }: Props) {
  const [line1,      setLine1]      = useState(false)
  const [line2,      setLine2]      = useState(false)
  const [asciiCount, setAsciiCount] = useState(0)
  const [showBar,    setShowBar]    = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [showReady,  setShowReady]  = useState(false)
  const [fading,     setFading]     = useState(false)
  const [done,       setDone]       = useState(false)

  const progressRef = useRef(0)

  // Real asset preloading
  useEffect(() => {
    const isIOS = detectIOS()

    // On iOS the service cards use a ring buffer — no need to preload all their frames.
    // Only preload the logo sequence so the hero animation is ready.
    const groups = isIOS
      ? FRAME_GROUPS.filter(g => g.basePath.includes("/frames/"))
      : FRAME_GROUPS

    const total = groups.reduce((s, g) => s + g.count, 0)

    if (total === 0) {
      progressRef.current = 100
      setProgress(100)
      return
    }

    let loaded = 0

    for (const { basePath, count } of groups) {
      for (let i = 1; i <= count; i++) {
        const img = new Image()
        img.onload = img.onerror = () => {
          loaded++
          const pct = Math.round((loaded / total) * 100)
          progressRef.current = pct
          setProgress(pct)
        }
        img.src = `${basePath}${String(i).padStart(3, "0")}.webp`
      }
    }
  }, [])

  // Terminal animation — waits at the progress bar until loading hits 100%
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await sleep(150)
      if (cancelled) return
      setLine1(true)

      await sleep(380)
      if (cancelled) return
      setLine2(true)

      await sleep(260)
      if (cancelled) return

      for (let i = 1; i <= ASCII.length; i++) {
        await sleep(48)
        if (cancelled) return
        setAsciiCount(i)
      }

      await sleep(130)
      if (cancelled) return
      setShowBar(true)

      // Block here until all assets are loaded
      await new Promise<void>(resolve => {
        const poll = () => {
          if (cancelled) return
          if (progressRef.current >= 100) resolve()
          else requestAnimationFrame(poll)
        }
        requestAnimationFrame(poll)
      })
      if (cancelled) return

      await sleep(200)
      setShowReady(true)
      await sleep(520)
      setFading(true)
      await sleep(680)
      setDone(true)
      onComplete()
    }

    run()
    return () => { cancelled = true }
  }, [onComplete])

  if (done) return null

  const filled = Math.floor(progress / 5)

  return (
    <div className={`${styles.overlay} ${fading ? styles.fading : ""}`}>
      <div className={styles.terminal}>
        {line1 && (
          <p className={styles.line}>
            <span className={styles.prompt}>&gt;</span> initializing OBSERV studio...
          </p>
        )}
        {line2 && (
          <p className={styles.line}>
            <span className={styles.prompt}>&gt;</span> loading modules
            <span className={styles.dots}>...............</span>
            <span className={styles.ok}> ok</span>
          </p>
        )}

        {asciiCount > 0 && (
          <pre className={styles.ascii}>
            {ASCII.slice(0, asciiCount).join("\n")}
          </pre>
        )}

        {showBar && (
          <p className={styles.line}>
            <span className={styles.prompt}>&gt;</span> loading assets&nbsp;
            <span className={styles.bar}>
              {"█".repeat(filled)}{"░".repeat(20 - filled)}
            </span>
            <span className={styles.pct}>&nbsp;{progress}%</span>
          </p>
        )}

        {showReady && (
          <p className={`${styles.line} ${styles.ready}`}>
            <span className={styles.prompt}>&gt;</span> system ready&nbsp;
            <span className={styles.check}>✓</span>
          </p>
        )}
      </div>
    </div>
  )
}
