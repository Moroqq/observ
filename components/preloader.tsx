"use client"

import { useEffect, useState } from "react"
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

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

interface Props {
  onComplete: () => void
}

export function Preloader({ onComplete }: Props) {
  const [line1,       setLine1]       = useState(false)
  const [line2,       setLine2]       = useState(false)
  const [asciiCount,  setAsciiCount]  = useState(0)
  const [showBar,     setShowBar]     = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [showReady,   setShowReady]   = useState(false)
  const [fading,      setFading]      = useState(false)
  const [done,        setDone]        = useState(false)

  useEffect(() => {
    const run = async () => {
      await sleep(150)
      setLine1(true)
      await sleep(380)
      setLine2(true)
      await sleep(260)

      for (let i = 1; i <= ASCII.length; i++) {
        await sleep(48)
        setAsciiCount(i)
      }

      await sleep(130)
      setShowBar(true)

      await new Promise<void>(resolve => {
        const start = performance.now()
        const duration = 950
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1)
          setProgress(Math.round(t * 100))
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })

      await sleep(200)
      setShowReady(true)
      await sleep(520)
      setFading(true)
      await sleep(680)
      setDone(true)
      onComplete()
    }
    run()
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
