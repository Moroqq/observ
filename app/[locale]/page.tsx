"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Ticker } from "@/components/ticker"
import { MiniPlayer } from "@/components/mini-player"
import { SocialLinks } from "@/components/social-links"
import { AsciiLogo } from "@/components/ascii-logo"
import { RevealText } from "@/components/reveal-text"
import { FrameSequence } from "@/components/frame-sequence"
import { ServiceCard } from "@/components/service-cards"
import { GlitchOverlay } from "@/components/glitch-overlay"
import { SysLogConsole } from "@/components/SysLogConsole"
import { EstimateModule } from "@/components/EstimateModule"
import { Proof } from "@/components/Proof/Proof"
import { TelemetryBackground } from "@/components/TelemetryBackground"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"

const playlist = [
  "/audio/track1.mp3",
  "/audio/track2.mp3",
  "/audio/track3.mp3",
]

const LOGO_SIZE  = 718
const CARD_WIDTH = 400
const ROW_GAP    = 32
const FROM_BELOW = 70

const A13_S = 100,  A13_E = 600
const A2_S  = 550,  A2_E  = 900
const P3_S  = 900,  P3_E  = 1700
const P4_S  = 2100, P4_E  = 2800
const P5_S  = 3200, P5_E  = 3800   // manifesto out, proof in
const PROOF_BEAT_S = 3800           // beat 1 starts
const PROOF_BEAT_E = 6600           // beat 4 ends (4 × 700 px)
const P6_S  = 6600, P6_E  = 7400   // proof out, calculator in

const SAFETY_GAP = 80

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const prog  = (y: number, s: number, e: number) => clamp((y - s) / (e - s))

export default function Home() {
  const t      = useTranslations()
  const locale = useLocale()

  const [isPlaying,    setIsPlaying]    = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [showFrames,   setShowFrames]   = useState(false)
  const [scrollY,      setScrollY]      = useState(0)
  const [rowHeight,    setRowHeight]    = useState(0)
  const [a2Height,     setA2Height]     = useState(0)
  const [hoveredCard,  setHoveredCard]  = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const rowRef   = useRef<HTMLDivElement>(null)
  const a2Ref    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => {
    if (!rowRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const h = e.contentRect.height
      if (h > 0) setRowHeight(h)
    })
    ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!a2Ref.current) return
    const ro = new ResizeObserver(([e]) => {
      const h = e.contentRect.height
      if (h > 0) setA2Height(h)
    })
    ro.observe(a2Ref.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.src = playlist[currentTrack]
    if (isPlaying) audioRef.current.play().catch(() => {})
  }, [currentTrack])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else           { audioRef.current.play().catch(() => {}); setIsPlaying(true) }
  }
  const playNext     = () => setCurrentTrack(p => (p + 1) % playlist.length)
  const playPrevious = () => setCurrentTrack(p => (p - 1 + playlist.length) % playlist.length)

  const a13P     = prog(scrollY, A13_S, A13_E)
  const a2P      = prog(scrollY, A2_S,  A2_E)
  const phase3   = prog(scrollY, P3_S,  P3_E)
  const cardsOut = prog(scrollY, P4_S,  P4_S + 500)
  const manifIn  = prog(scrollY, P4_S + 250, P4_E)
  const manifOut   = prog(scrollY, P5_S,  P5_S + 400)
  const proofIn    = prog(scrollY, P5_S + 200, P5_E)
  const proofOut   = prog(scrollY, P6_S,  P6_S + 400)
  const proofBeat  = prog(scrollY, PROOF_BEAT_S, PROOF_BEAT_E)
  const calcIn     = prog(scrollY, P6_S + 200, P6_E)

  const syslogSection =
    scrollY < 100        ? "hero" :
    scrollY < 900        ? "services" :
    scrollY < 1700       ? "service:quick-start" :
    scrollY < 2100       ? "service:branding" :
    scrollY < P5_S       ? "manifesto" :
    scrollY < PROOF_BEAT_E ? "proof" :
    scrollY < P6_S       ? "proof:return" :
                           "calculator"

  const eioS      = (t2: number) => -(Math.cos(Math.PI * t2) - 1) / 2
  const a13Eased  = eioS(a13P)

  const measured      = rowHeight > 0 && a2Height > 0
  const a2AlignedTop  = measured ? (rowHeight - a2Height) / 2 : 0
  const a2StartOffset = measured
    ? rowHeight / 2 + ROW_GAP + a2Height / 2 + SAFETY_GAP
    : 400 + SAFETY_GAP

  const a2TranslateY   = a2StartOffset * (1 - phase3) + FROM_BELOW * (1 - a2P)
  const logoTranslateY = measured ? -(phase3 * a2StartOffset) : 0
  const revealOpacity  = Math.max(0, 1 - a13P * 2.5)

  return (
    <main className="bg-background text-foreground flex flex-col" style={{ minHeight: "max(700vh, 9000px)" }}>
      <audio ref={audioRef} src={playlist[currentTrack]} onEnded={playNext} />

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background">
        <Ticker />
        <div className="border-b border-border py-3 px-4 flex justify-between items-center">
          <SocialLinks />
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <MiniPlayer
              isPlaying={isPlaying}
              onToggle={togglePlay}
              onNext={playNext}
              onPrevious={playPrevious}
              volume={volume}
              onVolumeChange={setVolume}
            />
          </div>
        </div>
      </div>

      {/* ── Fixed viewport ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 top-[88px] bg-black" style={{ overflow: "visible" }}>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 1 - cardsOut,
          }}
        >
          <div ref={rowRef} style={{ display: "flex", alignItems: "center", gap: ROW_GAP }}>
            {/* A1 */}
            <div
              style={{
                width: CARD_WIDTH, flexShrink: 0,
                opacity: a13Eased,
                transform: `translateY(${(1 - a13Eased) * FROM_BELOW}px)`,
                willChange: "opacity, transform",
              }}
            >
              <ServiceCard
                label={t("services.card_1_id")}
                title={t("services.card_1_title")}
                description={t("services.card_1_body")}
                framePath="/frameswebsite/websiteobrez_frame_"
                totalFrames={101}
                cardId="A1"
                hoveredCardId={hoveredCard}
                onHoverChange={setHoveredCard}
              />
            </div>

            {/* Logo slot */}
            <div
              style={{
                width: LOGO_SIZE, height: LOGO_SIZE, flexShrink: 0,
                position: "relative", zIndex: 2,
                transform: `translateY(${logoTranslateY}px)`,
                willChange: "transform",
                opacity: hoveredCard !== null ? 0.2 : 1,
                filter: hoveredCard !== null ? "blur(3px)" : "none",
                transition: "opacity 360ms ease, filter 360ms ease",
              }}
            >
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: showFrames ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents: "none" }}>
                <FrameSequence
                  totalFrames={407}
                  framePath="/frames/observ-logo_frame_"
                  frameExtension="png"
                  isPlaying={showFrames}
                  loop={true}
                  scrollControlled={false}
                  style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", display: "block" }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: showFrames ? 0 : 1, transition: "opacity 0.4s ease" }}>
                <AsciiLogo onHidden={() => setShowFrames(true)} />
              </div>
            </div>

            {/* A3 */}
            <div
              style={{
                width: CARD_WIDTH, flexShrink: 0,
                opacity: a13Eased,
                transform: `translateY(${(1 - a13Eased) * FROM_BELOW}px)`,
                willChange: "opacity, transform",
              }}
            >
              <ServiceCard
                label={t("services.card_3_id")}
                title={t("services.card_3_title")}
                description={t("services.card_3_body")}
                framePath="/framesapp/prilozhenieobrez_frame_"
                totalFrames={103}
                cardId="A3"
                hoveredCardId={hoveredCard}
                onHoverChange={setHoveredCard}
              />
            </div>
          </div>

          {/* A2 */}
          <div
            style={{
              position: "absolute", left: "50%", top: a2AlignedTop,
              width: CARD_WIDTH, zIndex: 1, opacity: a2P,
              transform: `translateX(-50%) translateY(${a2TranslateY}px)`,
              willChange: "opacity, transform",
            }}
          >
            <div ref={a2Ref}>
              <ServiceCard
                label={t("services.card_2_id")}
                title={t("services.card_2_title")}
                description={t("services.card_2_body")}
                framePath="/framesdesign/designobrez_frame_"
                totalFrames={151}
                cardId="A2"
                hoveredCardId={hoveredCard}
                onHoverChange={setHoveredCard}
              />
            </div>
          </div>
        </div>

        {/* Manifesto */}
        <div
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: manifIn * (1 - manifOut),
            zIndex: 5, pointerEvents: "none",
            width: "min(780px, 90vw)", textAlign: "center",
          }}
        >
          <div
            className="text-[10px] tracking-[0.5em] uppercase font-mono mb-10"
            style={{
              color: "rgba(74,222,128,0.9)",
              textShadow:
                "0 0 6px rgba(74,222,128,1), 0 0 14px rgba(74,222,128,0.8), 0 0 30px rgba(74,222,128,0.5), 0 0 60px rgba(74,222,128,0.25)",
              animation: "manifesto-label-glow 3s ease-in-out infinite",
            }}
          >
            {t("hero.manifesto_label")}
          </div>
          <div
            className="font-mono mb-10"
            style={{ fontSize: "clamp(26px, 3vw, 42px)", lineHeight: 1.35, color: "rgba(255,255,255,0.97)" }}
          >
            {t("hero.manifesto_title")}<br />
            {t("hero.manifesto_subtitle")}
          </div>
          <div className="w-12 h-px bg-green-500/20 mx-auto mb-10" />
          <div
            className="font-mono"
            style={{ fontSize: "clamp(14px, 1.1vw, 17px)", lineHeight: 2, color: "rgba(255,255,255,0.55)" }}
          >
            {t("hero.principle_interface")}<br />
            {t("hero.principle_motion")}<br />
            {t("hero.principle_silence")}
          </div>
        </div>

        {/* Reveal text */}
        <div className="absolute bottom-6 left-6 pointer-events-auto" style={{ opacity: revealOpacity }}>
          <RevealText
            text={t("hero.reveal_text")}
            className="text-gray-500 text-xs sm:text-sm text-left max-w-xs font-medium"
          />
        </div>

        {/* PROOF — four-frame argument */}
        <div
          style={{
            position: "absolute", inset: 0,
            opacity: proofIn * (1 - proofOut),
            zIndex: 6,
            pointerEvents: proofIn > 0.5 && proofOut < 0.5 ? "auto" : "none",
          }}
        >
          <Proof progress={proofBeat} />
        </div>

        {/* Calculator */}
        <div
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: calcIn,
            zIndex: 7,
            pointerEvents: calcIn > 0.5 ? "auto" : "none",
            width: "min(1200px, 95vw)",
          }}
        >
          <div className="relative">
            <TelemetryBackground />
            <div className="relative z-[1]">
              <EstimateModule locale={locale as "ru" | "en"} />
            </div>
          </div>
        </div>

        <SysLogConsole section={syslogSection} />
        <GlitchOverlay />
      </div>

      <div className="flex-1 bg-black" />
    </main>
  )
}
