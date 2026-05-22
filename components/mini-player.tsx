"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"

interface MiniPlayerProps {
  isPlaying: boolean
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  volume: number
  onVolumeChange: (volume: number) => void
}

export function MiniPlayer({ isPlaying, onToggle, onNext, onPrevious, volume, onVolumeChange }: MiniPlayerProps) {
  const t = useTranslations("header")
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)
  const volumePanelRef = useRef<HTMLDivElement>(null)
  const volumeButtonRef = useRef<HTMLButtonElement>(null)

  // Handle click outside to close
  useEffect(() => {
    if (!isVolumeOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        volumePanelRef.current && 
        !volumePanelRef.current.contains(e.target as Node) &&
        volumeButtonRef.current &&
        !volumeButtonRef.current.contains(e.target as Node)
      ) {
        setIsVolumeOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVolumeOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isVolumeOpen])

  const toggleVolumePanel = () => {
    setIsVolumeOpen(!isVolumeOpen)
  }

  return (
    <div className="flex items-center gap-4">
      <span 
        className="text-sm font-mono text-green-500 cursor-pointer transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(34,197,94,0.9)] hover:text-green-400 select-none"
        onClick={onToggle}
      >
        {t("listen")}
      </span>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onPrevious}
          aria-label="Previous"
          className="hover:opacity-70 transition-opacity"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="hover:opacity-70 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onNext}
          aria-label="Next"
          className="hover:opacity-70 transition-opacity"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="relative flex items-center">
          <button
            ref={volumeButtonRef}
            onClick={toggleVolumePanel}
            aria-label="Volume"
            className={`hover:opacity-70 transition-all ${isVolumeOpen ? "text-green-500" : ""}`}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <div
            ref={volumePanelRef}
            className={`fixed top-[88px] right-4 p-4 bg-black border border-gray-800 z-50 transition-opacity duration-200 ${
              isVolumeOpen 
                ? "opacity-100" 
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex flex-col items-center gap-2 relative">
              <div className="relative h-36 w-2 bg-gray-700 overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-green-500 transition-all duration-100"
                  style={{ height: `${volume * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="absolute top-0 left-1/2 -translate-x-1/2 h-36 w-8 opacity-0 cursor-pointer"
                style={{ writingMode: "vertical-lr", direction: "rtl" }}
                aria-label="Volume slider"
              />
              <span className="text-xs text-gray-400 font-mono mt-1 w-8 text-center">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
