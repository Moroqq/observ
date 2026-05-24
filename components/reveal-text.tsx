"use client"

import { useState, useEffect, useCallback } from "react"

interface RevealTextProps {
  text: string
  className?: string
}

export function RevealText({ text, className = "" }: RevealTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [isHovering, setIsHovering] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)

  const randomLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

  // Generate random text for non-revealed characters
  const generateDisplay = useCallback(() => {
    let result = ""
    for (let i = 0; i < text.length; i++) {
      if (i < revealedCount) {
        result += text[i]
      } else if (text[i] === " ") {
        result += " "
      } else {
        result += randomLetters[Math.floor(Math.random() * randomLetters.length)]
      }
    }
    return result
  }, [text, revealedCount])

  // Initial scrambled text
  useEffect(() => {
    setDisplayText(generateDisplay())
  }, [])

  // Scramble non-revealed characters periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayText(generateDisplay())
    }, 50)

    return () => clearInterval(interval)
  }, [generateDisplay])

  // Reveal letters one by one on hover
  useEffect(() => {
    if (!isHovering) return
    if (revealedCount >= text.length) return

    const timeout = setTimeout(() => {
      setRevealedCount((prev) => prev + 1)
    }, 50) // Speed of reveal per letter

    return () => clearTimeout(timeout)
  }, [isHovering, revealedCount, text.length])

  return (
    <span
      className={`font-mono cursor-default select-none ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseMove={() => {
        if (!isHovering) setIsHovering(true)
      }}
    >
      {displayText}
    </span>
  )
}
