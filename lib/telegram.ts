import https from "https"
import { SocksProxyAgent } from "socks-proxy-agent"

const TG_HOST = "api.telegram.org"

function getAgent(): https.Agent | undefined {
  if (process.env.SOCKS_PROXY) return new SocksProxyAgent(process.env.SOCKS_PROXY)
  return undefined
}

function tgRequest(path: string, data: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data)
    const req = https.request(
      {
        hostname: TG_HOST,
        path,
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        agent:    getAgent(),
      },
      res => {
        let raw = ""
        res.on("data", c => (raw += c))
        res.on("end",  () => { try { resolve(JSON.parse(raw)) } catch { resolve({}) } })
      },
    )
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

const API = () => `/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function tgCall(method: string, body: object): Promise<any> {
  return tgRequest(`${API()}/${method}`, body)
}

export async function tgSend(chatId: number | string, text: string, extra: object = {}) {
  return tgCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra })
}

export async function tgEdit(chatId: number | string, msgId: number, text: string, extra: object = {}) {
  return tgCall("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", ...extra })
}

export async function tgAnswer(callbackQueryId: string, text?: string) {
  return tgCall("answerCallbackQuery", { callback_query_id: callbackQueryId, text })
}

// ── Lead notification ─────────────────────────────────────────────────────────
const fmtRub = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽"
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export interface LeadData {
  name:       string
  contact:    string
  notes?:     string
  budget:     number
  total:      number
  hasQuotes:  boolean
  selectedIds: string[]
  rush:       boolean
  weeks:      [number, number]
  services:   { id: string; price: number; priceMode: string }[]
  locale:     "ru" | "en"
  source?:    "site" | "bot"
}

export async function sendLeadNotification(lead: LeadData): Promise<boolean> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false

  const serviceLines = lead.services
    .map(i =>
      i.priceMode === "quote"
        ? `  · ${i.id} — по запросу`
        : `  · ${i.id} — ${fmtRub(i.price)}`
    )
    .join("\n")

  const totalLine =
    lead.total > 0 && lead.hasQuotes ? `${fmtRub(lead.total)} + уточн. у менеджера`
    : lead.total > 0                 ? fmtRub(lead.total)
    :                                  "уточняется у менеджера"

  const sourceTag = lead.source === "bot" ? " · via bot" : ""

  const text = [
    `🟢 <b>NEW LEAD</b> · observ.team${sourceTag}`,
    `<i>locale: ${lead.locale}</i>`,
    ``,
    `<b>Имя:</b> ${escape(lead.name)}`,
    `<b>Контакт:</b> ${escape(lead.contact)}`,
    lead.notes?.trim() ? `<b>Заметки:</b> ${escape(lead.notes)}` : "",
    ``,
    `<b>Бюджет клиента:</b> ${fmtRub(lead.budget)} ${lead.rush ? "(rush)" : "(standard)"}`,
    `<b>Итого:</b> ${totalLine}`,
    `<b>Услуги:</b>`,
    serviceLines,
    `<b>Сроки:</b> ${lead.weeks[0]}–${lead.weeks[1]} нед.`,
    ``,
    `⏱ ${new Date().toISOString()}`,
  ]
    .filter(l => l !== "")
    .join("\n")

  try {
    const res = await tgRequest(`/bot${token}/sendMessage`, {
      chat_id:                  chatId,
      text,
      parse_mode:               "HTML",
      disable_web_page_preview: true,
    })
    return res.ok === true
  } catch {
    return false
  }
}
