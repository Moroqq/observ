"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type PlayState = "idle" | "forward" | "reverse" | "leaving"

interface Options {
  frameUrls: string[]
  fps?: number
  leaveFps?: number
}

interface Result {
  index: number
  state: PlayState
  ready: boolean
  enter: () => void
  leave: () => void
  imagesRef: React.RefObject<HTMLImageElement[]>
}

// iOS Safari: ring buffer constants
const RING_AHEAD   = 8  // frames to keep loaded ahead of current position
const RING_BEHIND  = 2  // frames to keep loaded behind
const RING_STICKY  = 2  // first N frames are never released (poster / snap-back)

function detectIOS(): boolean {
  if (typeof window === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function ringAdvance(
  urls: string[],
  imgs: HTMLImageElement[],
  cur: number,
) {
  const total = urls.length
  // load ahead window
  for (let i = cur; i <= Math.min(cur + RING_AHEAD, total - 1); i++) {
    if (!imgs[i]) {
      const img = new Image()
      img.src = urls[i]
      imgs[i] = img
    }
  }
  // release behind (but keep sticky first frames)
  for (let i = RING_STICKY; i < cur - RING_BEHIND; i++) {
    if (imgs[i]) {
      imgs[i].src = ""
      imgs[i] = null as any
    }
  }
}

export function useFrameSequence({
  frameUrls,
  fps = 30,
  leaveFps = 45,
}: Options): Result {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<PlayState>("idle")
  const [ready, setReady] = useState(false)

  const isIOSRef     = useRef(false)
  const stateRef     = useRef<PlayState>("idle")
  const indexRef     = useRef(0)
  const lastTickRef  = useRef(0)
  const rafRef       = useRef<number | null>(null)
  const imagesRef    = useRef<HTMLImageElement[]>([])
  const frameUrlsRef = useRef(frameUrls)

  useEffect(() => { frameUrlsRef.current = frameUrls }, [frameUrls])

  // ── Preload ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // cancel any running animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setReady(false)
    stateRef.current = "idle"
    setState("idle")
    indexRef.current = 0
    setIndex(0)

    const ios = detectIOS()
    isIOSRef.current = ios
    imagesRef.current = new Array(frameUrls.length).fill(null)

    if (ios) {
      // iOS Safari: preload only frame 0 as the poster, then mark ready.
      // Remaining frames are loaded on-demand via ring buffer in tick().
      const img = new Image()
      img.src = frameUrls[0]
      imagesRef.current[0] = img
      const onDone = () => { if (!cancelled) setReady(true) }
      if (img.complete && img.naturalWidth > 0) { onDone() }
      else { img.onload = onDone; img.onerror = onDone }
    } else {
      // Non-iOS: preload all frames before playing (existing behaviour)
      const imgs: HTMLImageElement[] = frameUrls.map(src => {
        const img = new Image()
        img.src = src
        return img
      })
      const decodeAll = imgs.map(img =>
        new Promise<void>(resolve => {
          const tryDecode = () => img.decode().then(() => resolve(), () => resolve())
          if (img.complete && img.naturalWidth > 0) { tryDecode() }
          else { img.onload = tryDecode; img.onerror = () => resolve() }
        })
      )
      Promise.all(decodeAll).then(() => {
        if (!cancelled) {
          imagesRef.current = imgs
          setReady(true)
        }
      })
    }

    return () => { cancelled = true }
  }, [frameUrls])

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback((now: number) => {
    if (lastTickRef.current === 0) lastTickRef.current = now
    const last     = lastTickRef.current
    const interval = 1000 / (stateRef.current === "leaving" ? leaveFps : fps)

    if (now - last >= interval) {
      lastTickRef.current = now
      const urls  = frameUrlsRef.current
      const total = urls.length
      let next    = indexRef.current

      // ── iOS leaving: snap to frame 0 instantly (no stepback) ──────────────
      if (isIOSRef.current && stateRef.current === "leaving") {
        indexRef.current = 0
        setIndex(0)
        stateRef.current = "idle"
        setState("idle")
        stopRaf()
        return
      }

      if (stateRef.current === "forward") {
        next = indexRef.current + 1
        if (next >= total - 1) {
          if (isIOSRef.current) {
            // iOS: loop forward from start instead of reversing
            next = 0
            ringAdvance(urls, imagesRef.current, 0)
          } else {
            next = total - 1
            stateRef.current = "reverse"
            setState("reverse")
          }
        }
      } else if (stateRef.current === "reverse") {
        next = indexRef.current - 1
        if (next <= 0) {
          next = 0
          stateRef.current = "forward"
          setState("forward")
        }
      } else if (stateRef.current === "leaving") {
        next = indexRef.current - 1
        if (next <= 0) {
          next = 0
          stateRef.current = "idle"
          setState("idle")
          indexRef.current = 0
          setIndex(0)
          stopRaf()
          return
        }
      }

      indexRef.current = next
      setIndex(next)

      // advance ring buffer on every tick (iOS only)
      if (isIOSRef.current) {
        ringAdvance(urls, imagesRef.current, next)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [fps, leaveFps, stopRaf])

  const enter = useCallback(() => {
    if (!ready) return
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    if (stateRef.current === "leaving" || stateRef.current === "idle") {
      stateRef.current = "forward"
      setState("forward")
    } else if (stateRef.current === "reverse") {
      stateRef.current = "forward"
      setState("forward")
    }

    // iOS: prime the ring buffer from current position before playback starts
    if (isIOSRef.current) {
      ringAdvance(frameUrlsRef.current, imagesRef.current, indexRef.current)
    }

    if (rafRef.current === null) {
      lastTickRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [ready, tick])

  const leave = useCallback(() => {
    if (stateRef.current === "idle") return
    stateRef.current = "leaving"
    setState("leaving")
    if (rafRef.current === null) {
      lastTickRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [tick])

  useEffect(() => () => stopRaf(), [stopRaf])

  return { index, state, ready, enter, leave, imagesRef }
}
