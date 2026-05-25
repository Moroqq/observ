import { NextResponse }                    from "next/server"
import { SERVICES }                        from "@/lib/pricing"
import { computeEstimate }                 from "@/lib/estimate"
import { tgCall, tgSend, tgAnswer, sendLeadNotification } from "@/lib/telegram"

// ── Session ───────────────────────────────────────────────────────────────────
type Step = "services" | "budget_custom" | "name" | "contact" | "notes"

interface Session {
  step:        Step
  selectedIds: string[]
  budget:      number
  rush:        boolean
  name:        string
  contact:     string
  svcMsgId?:   number
}

const sessions = new Map<number, Session>()

function newSession(): Session {
  return { step: "services", selectedIds: [], budget: 100_000, rush: false, name: "", contact: "" }
}

// ── Formatting ────────────────────────────────────────────────────────────────
const fmtRub = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽"

// ── Keyboards ─────────────────────────────────────────────────────────────────
function servicesKeyboard(sel: string[]) {
  const dev   = SERVICES.filter(s => s.category === "development")
  const brand = SERVICES.filter(s => s.category === "branding")

  const btn = (s: typeof SERVICES[0]) => {
    const on    = sel.includes(s.id)
    const price = s.priceMode === "quote" ? "по запросу" : `от ${fmtRub(s.basePrice)}`
    return { text: `${on ? "✅" : "☐"} ${s.label} · ${price}`, callback_data: `svc:${s.id}` }
  }

  const confirmRow = sel.length > 0
    ? [{ text: `➡️ Продолжить (выбрано: ${sel.length})`, callback_data: "confirm_services" }]
    : [{ text: "⬆️ Выбери услуги выше",                  callback_data: "noop" }]

  return {
    inline_keyboard: [
      [{ text: "📱  РАЗРАБОТКА",          callback_data: "noop" }],
      dev.slice(0, 2).map(btn),
      dev.slice(2).map(btn),
      [{ text: "🎨  БРЕНДИНГ",            callback_data: "noop" }],
      brand.slice(0, 3).map(btn),
      brand.slice(3).map(btn),
      confirmRow,
    ],
  }
}

function budgetKeyboard() {
  const vals = [10_000, 30_000, 100_000, 200_000, 500_000]
  const rows: { text: string; callback_data: string }[][] = []
  for (let i = 0; i < vals.length; i += 3) {
    rows.push(vals.slice(i, i + 3).map(v => ({ text: fmtRub(v), callback_data: `budget:${v}` })))
  }
  rows.push([{ text: "✏️  Другая сумма", callback_data: "budget:custom" }])
  return { inline_keyboard: rows }
}

function deadlineKeyboard() {
  return {
    inline_keyboard: [[
      { text: "📅  Стандарт",      callback_data: "deadline:standard" },
      { text: "⚡  Срочно (+30%)", callback_data: "deadline:rush" },
    ]],
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────
async function handleMessage(msg: any) {
  const chatId = msg.chat.id as number
  const text   = (msg.text ?? "").trim()

  if (text === "/start") {
    sessions.set(chatId, newSession())
    const res = await tgSend(
      chatId,
      `👋 <b>Привет! Это ObserV.</b>\n\nВыбери услуги — рассчитаем стоимость и запишем заявку.`,
      { reply_markup: servicesKeyboard([]) },
    )
    const s = sessions.get(chatId)!
    s.svcMsgId = res.result?.message_id
    return
  }

  const s = sessions.get(chatId)
  if (!s) {
    await tgSend(chatId, "Напиши /start чтобы начать.")
    return
  }

  if (s.step === "budget_custom") {
    const val = parseInt(text.replace(/\D/g, ""), 10)
    if (!val || val < 1_000) {
      await tgSend(chatId, "Укажи сумму цифрами, например: <code>80000</code>")
      return
    }
    s.budget = val
    await tgSend(chatId, `<b>Дедлайн:</b> стандарт или срочно?`, { reply_markup: deadlineKeyboard() })
    return
  }

  if (s.step === "name") {
    if (text.length < 2 || text.length > 100) {
      await tgSend(chatId, "Введи имя (2–100 символов).")
      return
    }
    s.name = text
    s.step = "contact"
    await tgSend(chatId, `<b>Контакт</b>\n\nКак с тобой связаться? Telegram (@username) или email:`)
    return
  }

  if (s.step === "contact") {
    if (text.length < 2 || text.length > 200) {
      await tgSend(chatId, "Укажи контакт: @username или email.")
      return
    }
    s.contact = text
    s.step = "notes"
    await tgSend(chatId, `<b>Комментарий</b> (необязательно)\n\nЕсть детали или пожелания? Напиши или отправь «—» чтобы пропустить:`)
    return
  }

  if (s.step === "notes") {
    const notes = text === "—" || text === "-" ? "" : text
    await submitLead(chatId, s, notes)
  }
}

async function handleCallback(cb: any) {
  const chatId = cb.message.chat.id as number
  const data   = cb.data   as string
  const cbId   = cb.id     as string

  if (data === "noop") { await tgAnswer(cbId); return }

  const s = sessions.get(chatId)
  if (!s) { await tgAnswer(cbId, "Напиши /start"); return }

  // ── Toggle service ──
  if (data.startsWith("svc:")) {
    const id = data.slice(4)
    s.selectedIds = s.selectedIds.includes(id)
      ? s.selectedIds.filter(x => x !== id)
      : [...s.selectedIds, id]
    await tgAnswer(cbId)
    const msgId = s.svcMsgId ?? cb.message.message_id
    await tgCall("editMessageReplyMarkup", {
      chat_id:      chatId,
      message_id:   msgId,
      reply_markup: servicesKeyboard(s.selectedIds),
    })
    return
  }

  // ── Confirm services → budget ──
  if (data === "confirm_services") {
    await tgAnswer(cbId)
    await tgSend(chatId, `<b>Бюджет</b>\n\nВыбери или напиши свою сумму:`, { reply_markup: budgetKeyboard() })
    return
  }

  // ── Budget ──
  if (data.startsWith("budget:")) {
    const val = data.slice(7)
    await tgAnswer(cbId)
    if (val === "custom") {
      s.step = "budget_custom"
      await tgSend(chatId, "Напиши свой бюджет цифрами, например: <code>80000</code>")
      return
    }
    s.budget = parseInt(val, 10)
    await tgSend(chatId, `<b>Дедлайн:</b> стандарт или срочно?`, { reply_markup: deadlineKeyboard() })
    return
  }

  // ── Deadline → name ──
  if (data.startsWith("deadline:")) {
    s.rush = data === "deadline:rush"
    s.step = "name"
    await tgAnswer(cbId)
    await tgSend(chatId, `<b>Имя</b>\n\nКак тебя зовут?`)
    return
  }

  await tgAnswer(cbId)
}

async function submitLead(chatId: number, s: Session, notes: string) {
  const estimate = computeEstimate({ selectedIds: s.selectedIds, rush: s.rush })

  const ok = await sendLeadNotification({
    name:        s.name,
    contact:     s.contact,
    notes,
    budget:      s.budget,
    total:       estimate?.total     ?? 0,
    hasQuotes:   estimate?.hasQuotes ?? false,
    selectedIds: s.selectedIds,
    rush:        s.rush,
    weeks:       estimate?.weeks     ?? [0, 0],
    services:    estimate?.items.map(i => ({ id: i.serviceId, price: i.price, priceMode: i.priceMode })) ?? [],
    locale:      "ru",
    source:      "bot",
  })

  sessions.delete(chatId)

  if (ok) {
    const totalStr = (estimate?.total ?? 0) > 0 ? fmtRub(estimate!.total) : "уточняется у менеджера"
    await tgSend(
      chatId,
      `✅ <b>Заявка принята!</b>\n\nСкоро свяжемся с тобой.\n\n<b>Итого:</b> ${totalStr}\n<b>Сроки:</b> ${estimate?.weeks[0]}–${estimate?.weeks[1]} нед.\n\n/start — новая заявка`,
    )
  } else {
    await tgSend(chatId, "❌ Не удалось отправить заявку. Попробуй позже или напиши нам напрямую.")
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // Telegram sets this header when a webhook secret is configured via setWebhook.
  // Without a valid secret the endpoint rejects all requests — this prevents
  // anyone from injecting fake updates into the bot flow.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const header = req.headers.get("x-telegram-bot-api-secret-token")
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const update = await req.json()
    if (update.message)        await handleMessage(update.message)
    if (update.callback_query) await handleCallback(update.callback_query)
  } catch (err) {
    console.error("[bot] unhandled", err)
  }
  return NextResponse.json({ ok: true })
}
