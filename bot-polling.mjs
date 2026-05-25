import https from "https"
import { SocksProxyAgent } from "socks-proxy-agent"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import dotenv from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, ".env.local") })

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN not set"); process.exit(1) }

const agent = process.env.SOCKS_PROXY ? new SocksProxyAgent(process.env.SOCKS_PROXY) : undefined

// ── Telegram API ──────────────────────────────────────────────────────────────
function tgRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data)
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${TOKEN}/${path}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      agent,
    }, res => {
      let raw = ""
      res.on("data", c => raw += c)
      res.on("end", () => { try { resolve(JSON.parse(raw)) } catch { resolve({}) } })
    })
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

const tgSend  = (chatId, text, extra = {})           => tgRequest("sendMessage",           { chat_id: chatId, text, parse_mode: "HTML", ...extra })
const tgEdit  = (chatId, msgId, markup)               => tgRequest("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: markup })
const tgAnswer = (cbId, text)                         => tgRequest("answerCallbackQuery",    { callback_query_id: cbId, ...(text ? { text } : {}) })

// ── Pricing (inline, no TS imports) ──────────────────────────────────────────
const SERVICES = [
  { id: "website",   label: "Сайт",          category: "development", priceMode: "fixed",  basePrice: 80_000  },
  { id: "webapp",    label: "Веб-приложение", category: "development", priceMode: "fixed",  basePrice: 150_000 },
  { id: "mobile",    label: "Мобильное",      category: "development", priceMode: "quote",  basePrice: 0       },
  { id: "branding",  label: "Брендинг",       category: "branding",    priceMode: "fixed",  basePrice: 50_000  },
  { id: "logo",      label: "Логотип",        category: "branding",    priceMode: "fixed",  basePrice: 15_000  },
  { id: "design",    label: "Дизайн",         category: "branding",    priceMode: "fixed",  basePrice: 30_000  },
]

const fmtRub = n => new Intl.NumberFormat("ru-RU").format(n) + " ₽"

// ── Keyboards ─────────────────────────────────────────────────────────────────
function servicesKeyboard(sel) {
  const dev   = SERVICES.filter(s => s.category === "development")
  const brand = SERVICES.filter(s => s.category === "branding")
  const btn = s => {
    const on    = sel.includes(s.id)
    const price = s.priceMode === "quote" ? "по запросу" : `от ${fmtRub(s.basePrice)}`
    return { text: `${on ? "✅" : "☐"} ${s.label} · ${price}`, callback_data: `svc:${s.id}` }
  }
  const confirmRow = sel.length > 0
    ? [{ text: `➡️ Продолжить (выбрано: ${sel.length})`, callback_data: "confirm_services" }]
    : [{ text: "⬆️ Выбери услуги выше",                  callback_data: "noop" }]
  return {
    inline_keyboard: [
      [{ text: "📱  РАЗРАБОТКА", callback_data: "noop" }],
      dev.slice(0, 2).map(btn),
      dev.slice(2).map(btn),
      [{ text: "🎨  БРЕНДИНГ",  callback_data: "noop" }],
      brand.slice(0, 3).map(btn),
      brand.slice(3).map(btn),
      confirmRow,
    ],
  }
}

function budgetKeyboard() {
  const vals = [10_000, 30_000, 100_000, 200_000, 500_000]
  const rows = []
  for (let i = 0; i < vals.length; i += 3)
    rows.push(vals.slice(i, i + 3).map(v => ({ text: fmtRub(v), callback_data: `budget:${v}` })))
  rows.push([{ text: "✏️  Другая сумма", callback_data: "budget:custom" }])
  return { inline_keyboard: rows }
}

function deadlineKeyboard() {
  return { inline_keyboard: [[
    { text: "📅  Стандарт",      callback_data: "deadline:standard" },
    { text: "⚡  Срочно (+30%)", callback_data: "deadline:rush" },
  ]] }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessions = new Map()
const newSession = () => ({ step: "services", selectedIds: [], budget: 100_000, rush: false, name: "", contact: "" })

// ── Lead notification ─────────────────────────────────────────────────────────
async function submitLead(chatId, s, notes) {
  const total = s.selectedIds.reduce((sum, id) => {
    const svc = SERVICES.find(x => x.id === id)
    return svc?.priceMode === "fixed" ? sum + svc.basePrice : sum
  }, 0)
  const multiplied = s.rush ? Math.round(total * 1.3) : total
  const hasQuotes  = s.selectedIds.some(id => SERVICES.find(x => x.id === id)?.priceMode === "quote")

  const serviceLines = s.selectedIds.map(id => {
    const svc = SERVICES.find(x => x.id === id)
    return svc?.priceMode === "quote" ? `  · ${id} — по запросу` : `  · ${id} — ${fmtRub(svc?.basePrice ?? 0)}`
  }).join("\n")

  const totalLine = multiplied > 0 && hasQuotes ? `${fmtRub(multiplied)} + уточн.`
                  : multiplied > 0              ? fmtRub(multiplied)
                  :                               "уточняется у менеджера"

  const text = [
    `🟢 <b>NEW LEAD</b> · observ.team · via bot`,
    ``,
    `<b>Имя:</b> ${s.name}`,
    `<b>Контакт:</b> ${s.contact}`,
    notes ? `<b>Заметки:</b> ${notes}` : "",
    ``,
    `<b>Бюджет клиента:</b> ${fmtRub(s.budget)} ${s.rush ? "(rush)" : "(standard)"}`,
    `<b>Итого:</b> ${totalLine}`,
    `<b>Услуги:</b>`,
    serviceLines,
    ``,
    `⏱ ${new Date().toISOString()}`,
  ].filter(l => l !== "").join("\n")

  await tgRequest(`sendMessage`, { chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true })

  const clientTotal = multiplied > 0 ? fmtRub(multiplied) : "уточняется у менеджера"
  await tgSend(chatId, `✅ <b>Заявка принята!</b>\n\nСкоро свяжемся с тобой.\n\n<b>Итого:</b> ${clientTotal}\n\n/start — новая заявка`)
}

// ── Message handler ───────────────────────────────────────────────────────────
async function handleMessage(msg) {
  const chatId = msg.chat.id
  const text   = (msg.text ?? "").trim()

  if (text === "/start") {
    sessions.set(chatId, newSession())
    const res = await tgSend(chatId, `👋 <b>Привет! Это ObserV.</b>\n\nВыбери услуги — рассчитаем стоимость и запишем заявку.`, { reply_markup: servicesKeyboard([]) })
    const s = sessions.get(chatId)
    s.svcMsgId = res.result?.message_id
    return
  }

  const s = sessions.get(chatId)
  if (!s) { await tgSend(chatId, "Напиши /start чтобы начать."); return }

  if (s.step === "budget_custom") {
    const val = parseInt(text.replace(/\D/g, ""), 10)
    if (!val || val < 1_000) { await tgSend(chatId, "Укажи сумму цифрами, например: <code>80000</code>"); return }
    s.budget = val
    await tgSend(chatId, `<b>Дедлайн:</b> стандарт или срочно?`, { reply_markup: deadlineKeyboard() })
    return
  }

  if (s.step === "name") {
    if (text.length < 2 || text.length > 100) { await tgSend(chatId, "Введи имя (2–100 символов)."); return }
    s.name = text; s.step = "contact"
    await tgSend(chatId, `<b>Контакт</b>\n\nКак с тобой связаться? Telegram (@username) или email:`)
    return
  }

  if (s.step === "contact") {
    if (text.length < 2 || text.length > 200) { await tgSend(chatId, "Укажи контакт: @username или email."); return }
    s.contact = text; s.step = "notes"
    await tgSend(chatId, `<b>Комментарий</b> (необязательно)\n\nЕсть детали или пожелания? Напиши или отправь «—» чтобы пропустить:`)
    return
  }

  if (s.step === "notes") {
    const notes = text === "—" || text === "-" ? "" : text
    sessions.delete(chatId)
    await submitLead(chatId, s, notes)
  }
}

// ── Callback handler ──────────────────────────────────────────────────────────
async function handleCallback(cb) {
  const chatId = cb.message.chat.id
  const data   = cb.data
  const cbId   = cb.id

  if (data === "noop") { await tgAnswer(cbId); return }

  const s = sessions.get(chatId)
  if (!s) { await tgAnswer(cbId, "Напиши /start"); return }

  if (data.startsWith("svc:")) {
    const id = data.slice(4)
    s.selectedIds = s.selectedIds.includes(id) ? s.selectedIds.filter(x => x !== id) : [...s.selectedIds, id]
    await tgAnswer(cbId)
    const msgId = s.svcMsgId ?? cb.message.message_id
    await tgRequest("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: servicesKeyboard(s.selectedIds) })
    return
  }

  if (data === "confirm_services") {
    await tgAnswer(cbId)
    await tgSend(chatId, `<b>Бюджет</b>\n\nВыбери или напиши свою сумму:`, { reply_markup: budgetKeyboard() })
    return
  }

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

  if (data.startsWith("deadline:")) {
    s.rush = data === "deadline:rush"
    s.step = "name"
    await tgAnswer(cbId)
    await tgSend(chatId, `<b>Имя</b>\n\nКак тебя зовут?`)
    return
  }

  await tgAnswer(cbId)
}

// ── Long polling loop ─────────────────────────────────────────────────────────
let offset = 0

async function poll() {
  try {
    const res = await tgRequest("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] })
    if (!res.ok || !res.result?.length) return

    for (const update of res.result) {
      offset = update.update_id + 1
      try {
        if (update.message)        await handleMessage(update.message)
        if (update.callback_query) await handleCallback(update.callback_query)
      } catch (e) {
        console.error("[bot] update error:", e.message)
      }
    }
  } catch (e) {
    console.error("[bot] poll error:", e.message)
    await new Promise(r => setTimeout(r, 5000))
  }
}

// Remove webhook so polling works
await tgRequest("deleteWebhook", {})
console.log("[bot] Polling started")

while (true) {
  await poll()
}
