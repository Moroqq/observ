import { NextResponse }         from "next/server"
import { sendLeadNotification } from "@/lib/telegram"
import type { LeadData }        from "@/lib/telegram"

const RATE_LIMIT_MS = 60_000
const recentSubmissions = new Map<string, number>()

export async function POST(req: Request) {
  try {
    const ip         = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const lastSubmit = recentSubmissions.get(ip)
    if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_MS) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    }

    const body = (await req.json()) as LeadData

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

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.error("[lead] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 })
    }

    const ok = await sendLeadNotification({ ...body, source: "site" })
    if (!ok) {
      return NextResponse.json({ error: "telegram_failed" }, { status: 502 })
    }

    recentSubmissions.set(ip, Date.now())
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[lead] unhandled", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }


}
