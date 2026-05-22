"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type PlayState = "idle" | "forward" | "reverse" | "leaving"

interface Options {
  frameUrls: string[]
  fps?: number      // default 30
  leaveFps?: number // default 45  (faster on mouseleave)
}

interface Result {
  index: number
  state: PlayState
  ready: boolean
  enter: () => void
  leave: () => void
  imagesRef: React.MutableRefObject<HTMLImageElement[]>
}

export function useFrameSequence({
  frameUrls,
  fps = 30,
  leaveFps = 45,
}: Options): Result {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<PlayState>("idle")
  const [ready, setReady] = useState(false)

  const stateRef    = useRef<PlayState>("idle")
  const indexRef    = useRef(0)
  const lastTickRef = useRef(0)
  const rafRef      = useRef<number | null>(null)
  const imagesRef   = useRef<HTMLImageElement[]>([])

  // Bulletproof preload — guaranteed to resolve even on 404 or decode failure
  useEffect(() => {
    let cancelled = false
    setReady(false)
    indexRef.current = 0
    setIndex(0)

    const imgs: HTMLImageElement[] = frameUrls.map(src => {
      const img = new Image()
      img.src = src
      return img
    })

    const decodeAll = imgs.map(img =>
      new Promise<void>(resolve => {
        const tryDecode = () => img.decode().then(() => resolve(), () => resolve())
        if (img.complete && img.naturalWidth > 0) {
          tryDecode()
        } else {
          img.onload  = tryDecode
          img.onerror = () => resolve()
        }
      })
    )

    Promise.all(decodeAll).then(() => {
      if (!cancelled) {
        imagesRef.current = imgs
        setReady(true)
      }
    })

    return () => { cancelled = true }
  }, [frameUrls])

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback((now: number) => {
    const last     = lastTickRef.current || now
    const interval = 1000 / (stateRef.current === "leaving" ? leaveFps : fps)

    if (now - last >= interval) {
      lastTickRef.current = now
      const total = frameUrls.length
      let next    = indexRef.current

      if (stateRef.current === "forward") {
        next = indexRef.current + 1
        if (next >= total - 1) {
          next = total - 1
          stateRef.current = "reverse"
          setState("reverse")
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
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [frameUrls.length, fps, leaveFps, stopRaf])

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
