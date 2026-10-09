"use client"

import { useState, useEffect, useCallback } from "react"

interface RevealTextProps {
  text: string
  className?: string
}

export function RevealText({ text, className = "" }: RevealTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)

  const isDone = revealedCount >= text.length

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

  // Scramble non-revealed characters periodically.
  // Once everything is revealed there is nothing left to scramble — keeping
  // the interval alive would re-render 20 times a second for no reason.
  useEffect(() => {
    if (isDone) {
      setDisplayText(text)
      return
    }
    const interval = setInterval(() => {
      setDisplayText(generateDisplay())
    }, 50)

    return () => clearInterval(interval)
  }, [generateDisplay, isDone, text])

  // Reveal letters one by one once triggered
  useEffect(() => {
    if (!isRevealing || isDone) return

    const timeout = setTimeout(() => {
      setRevealedCount((prev) => prev + 1)
    }, 50) // Speed of reveal per letter

    return () => clearTimeout(timeout)
  }, [isRevealing, isDone, revealedCount])

  return (
    <span
      className={`font-mono select-none ${isDone ? "cursor-default" : "cursor-pointer"} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={text}
      onMouseEnter={() => setIsRevealing(true)}
      // Клик и тап: на тач-устройствах наведения не бывает, без этого
      // строка там не расшифровалась бы никогда.
      onClick={() => setIsRevealing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setIsRevealing(true)
        }
      }}
    >
      {displayText}
    </span>
  )
}
