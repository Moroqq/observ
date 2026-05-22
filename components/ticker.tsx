"use client"

import { useState, useEffect, useRef } from "react"

export function Ticker() {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<number | null>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  const currentRateRef = useRef(1)
  
  const targetRate = isHovered ? 0.4 : 1 // Slower when hovered
  
  // Smoothly interpolate the playback rate
  useEffect(() => {
    const ticker = tickerRef.current
    if (!ticker) return
    
    const animations = ticker.getAnimations()
    if (animations.length === 0) return
    
    let rafId: number
    
    const animate = () => {
      const diff = targetRate - currentRateRef.current
      if (Math.abs(diff) > 0.01) {
        currentRateRef.current += diff * 0.08 // Smooth easing
        animations.forEach(anim => {
          anim.playbackRate = currentRateRef.current
        })
        rafId = requestAnimationFrame(animate)
      } else {
        currentRateRef.current = targetRate
        animations.forEach(anim => {
          anim.playbackRate = targetRate
        })
      }
    }
    
    rafId = requestAnimationFrame(animate)
    
    return () => cancelAnimationFrame(rafId)
  }, [targetRate])
  
  // Define the ticker text segments with separators
  const segments = [
    { text: "observ.team", key: "observ", highlight: true },
    { text: "\u00A0//\u00A0", key: "sep1", highlight: false },
    { text: "dev_mode=ON", key: "devmode", highlight: true },
    { text: "\u00A0::\u00A0", key: "sep2", highlight: false },
    { text: "creating landing_pages", key: "landing", highlight: true },
    { text: "\u00A0+\u00A0", key: "sep3", highlight: false },
    { text: "mobile_apps", key: "mobile", highlight: true },
    { text: "\u00A0+\u00A0", key: "sep4", highlight: false },
    { text: "api_integrations", key: "api", highlight: true },
    { text: "\u00A0+\u00A0", key: "sep5", highlight: false },
    { text: "design_websites", key: "design", highlight: true },
    { text: "\u00A0::\u00A0", key: "sep6", highlight: false },
    { text: "branding{logo | identity | brandbook | graphics}", key: "branding", highlight: true },
    { text: "\u00A0::\u00A0", key: "sep7", highlight: false },
  ]
  
  // Duplicate for seamless loop
  const copies = [0, 1, 2, 3]

  return (
    <div 
      className={`w-full overflow-hidden border-b py-3 bg-background transition-all duration-300 ${
        isHovered ? "border-foreground/50 bg-foreground/5" : "border-border"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setHoveredElement(null)
      }}
    >
      <div className="flex w-full select-none">
        <div
          ref={tickerRef}
          className="flex animate-ticker select-none"
        >
          {copies.map((copy) => (
            <span key={copy} className="text-sm whitespace-nowrap px-2 flex select-none">
              {segments.map((segment, idx) => (
                <span
                  key={`${copy}-${idx}`}
                  onMouseEnter={() => segment.highlight && setHoveredElement(copy * 100 + idx)}
                  onMouseLeave={() => segment.highlight && setHoveredElement(null)}
                  className={`transition-all duration-200 ${
                    segment.highlight && hoveredElement === copy * 100 + idx
                      ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      : ""
                  }`}
                >
                  {segment.text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
