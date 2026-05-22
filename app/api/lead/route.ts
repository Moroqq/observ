import { NextResponse } from "next/server"

const RATE_LIMIT_MS = 60_000
const recentSubmissions = new Map<string, number>()

type LineItem = { id: string; price: number; tier: string }

type LeadPayload = {
  name:        string
  contact:     string
  notes?:      string
  budget:      number
  selectedIds: string[]
  rush:        boolean
  total:       number
  weeks:       [number, number]
  items:       LineItem[]
  locale:      "ru" | "en"
}

export async function POST(req: Request) {
  try {
    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const lastSubmit = recentSubmissions.get(ip)
    if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_MS) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    }

    const body = (await req.json()) as LeadPayload

    if (!body.name?.trim() || !body.contact?.trim()) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    }
    if (
      body.name.length > 100 ||
      body.contact.length > 200 ||
      (body.notes?.length ?? 0) > 2000
    ) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 400 })
    }
    if (!Array.isArray(body.selectedIds) || body.selectedIds.length === 0) {
      return NextResponse.json({ error: "no_services" }, { status: 400 })
    }

    const token  = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) {
      console.error("[lead] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 })
    }

    const text = formatTelegramMessage(body)

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })

    if (!tgRes.ok) {
      const errText = await tgRes.text()
      console.error("[lead] telegram api error", errText)
      return NextResponse.json({ error: "telegram_failed" }, { status: 502 })
    }

    recentSubmissions.set(ip, Date.now())
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[lead] unhandled", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

function formatTelegramMessage(b: LeadPayload): string {
  const fmt    = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽"
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const itemLines = (b.items ?? [])
    .map(i => `  · ${i.id} — ${fmt(i.price)} (${i.tier})`)
    .join("\n")

  return [
    `🟢 <b>NEW LEAD</b> · observ.team`,
    `<i>locale: ${b.locale}</i>`,
    ``,
    `<b>Имя:</b> ${escape(b.name)}`,
    `<b>Контакт:</b> ${escape(b.contact)}`,
    b.notes?.trim() ? `<b>Заметки:</b> ${escape(b.notes)}` : "",
    ``,
    `<b>Бюджет:</b> ${fmt(b.budget)} ${b.rush ? "(rush)" : "(standard)"}`,
    `<b>Услуги:</b>`,
    itemLines,
    `<b>Итого:</b> ${fmt(b.total)} · ${b.weeks[0]}–${b.weeks[1]} нед.`,
    ``,
    `⏱ ${new Date().toISOString()}`,
  ]
    .filter(l => l !== "")
    .join("\n")
}
