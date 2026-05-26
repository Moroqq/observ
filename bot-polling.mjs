import https from "https"
import { SocksProxyAgent } from "socks-proxy-agent"

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN not set"); process.exit(1) }

const agent = process.env.SOCKS_PROXY ? new SocksProxyAgent(process.env.SOCKS_PROXY) : undefined
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// ── Telegram API ──────────────────────────────────────────────────────────────
function tgRequest(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data)
    const req  = https.request({
      hostname: "api.telegram.org",
      path:     `/bot${TOKEN}/${method}`,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
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

const BASE  = { parse_mode: "HTML", disable_web_page_preview: true }
const tgSend   = (id, text, extra = {}) => tgRequest("sendMessage",    { chat_id: id, text, ...BASE, ...extra })
const tgEdit   = (id, mid, text, extra = {}) => tgRequest("editMessageText", { chat_id: id, message_id: mid, text, ...BASE, ...extra })
const tgAnswer = (cbId, text)  => tgRequest("answerCallbackQuery", { callback_query_id: cbId, ...(text ? { text } : {}) })

// ── Services ──────────────────────────────────────────────────────────────────
const SERVICES = [
  { id: "landing",      label: "лендинг",        cat: "dev",   priceMode: "fixed", basePrice: 5_000  },
  { id: "corporate",    label: "корп. сайт",      cat: "dev",   priceMode: "fixed", basePrice: 20_000 },
  { id: "ecommerce",    label: "e-commerce",      cat: "dev",   priceMode: "fixed", basePrice: 30_000 },
  { id: "mobile",       label: "mobile app",      cat: "dev",   priceMode: "fixed", basePrice: 10_000 },
  { id: "webapp",       label: "web-app",         cat: "dev",   priceMode: "quote", basePrice: 0      },
  { id: "logo",         label: "логотип",         cat: "brand", priceMode: "fixed", basePrice: 4_000  },
  { id: "identity",     label: "айдентика",       cat: "brand", priceMode: "quote", basePrice: 0      },
  { id: "brandbook",    label: "брендбук",        cat: "brand", priceMode: "quote", basePrice: 0      },
  { id: "presentation", label: "презентация",     cat: "brand", priceMode: "quote", basePrice: 0      },
  { id: "graphics",     label: "графика",         cat: "brand", priceMode: "quote", basePrice: 0      },
  { id: "video",        label: "видео",           cat: "brand", priceMode: "quote", basePrice: 0      },
]

const fmtRub = n => new Intl.NumberFormat("ru-RU").format(n) + " ₽"
const fmtK   = n => n >= 1000 ? `${n / 1000}к` : `${n}`
const plural  = n => n === 1 ? "услуга" : n < 5 ? "услуги" : "услуг"

// ── Keyboards ─────────────────────────────────────────────────────────────────
function servicesKeyboard(sel) {
  const dev   = SERVICES.filter(s => s.cat === "dev")
  const brand = SERVICES.filter(s => s.cat === "brand")

  const btn = s => ({
    text:          `${sel.includes(s.id) ? "▣" : "◻"}  ${s.label}`,
    callback_data: `svc:${s.id}`,
  })

  const rows = arr => {
    const out = []
    for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2).map(btn))
    return out
  }

  const n          = sel.length
  const confirmRow = n > 0
    ? [{ text: `⟶  подтвердить  ·  ${n} ${plural(n)}`, callback_data: "confirm_services" }]
    : [{ text: "─  выбери хотя бы одну услугу  ─",      callback_data: "noop"             }]

  return {
    inline_keyboard: [
      [{ text: "── РАЗРАБОТКА ─────────────────────", callback_data: "noop" }],
      ...rows(dev),
      [{ text: "── БРЕНДИНГ ───────────────────────", callback_data: "noop" }],
      ...rows(brand),
      confirmRow,
    ],
  }
}

const BACK_ROW = [{ text: "‹  изменить услуги", callback_data: "back_services" }]

function budgetKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "до 30к",   callback_data: "budget:30000"   },
        { text: "до 60к",   callback_data: "budget:60000"   },
        { text: "до 100к",  callback_data: "budget:100000"  },
      ],
      [
        { text: "до 200к",  callback_data: "budget:200000"  },
        { text: "до 500к",  callback_data: "budget:500000"  },
        { text: "500к+",    callback_data: "budget:1000000" },
      ],
      [{ text: "─  указать свой бюджет  ─", callback_data: "budget:custom" }],
      BACK_ROW,
    ],
  }
}

function deadlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "стандарт",       callback_data: "deadline:standard" },
        { text: "rush  ·  +30%",  callback_data: "deadline:rush"     },
      ],
      BACK_ROW,
    ],
  }
}

const backKeyboard = () => ({ inline_keyboard: [BACK_ROW] })

// ── Message templates ─────────────────────────────────────────────────────────
const S = "─".repeat(33)

const MSG = {
  boot1: `<code>observ · system</code>\n\n<code>[ connecting... ]</code>`,

  boot2: username => [
    `<b>OBSERV</b>`,
    `<code>${S}</code>`,
    ``,
    `<code>  ›</code> interface over noise`,
    `<code>  ›</code> motion over decoration`,
    `<code>  ›</code> silence over clutter`,
    ``,
    `<code>${S}</code>`,
    username ? `<code>  ›</code> сессия · <b>@${username}</b>` : `<code>  ›</code> сессия · anonymous`,
  ].join("\n"),

  services: sel => {
    const lines = sel.length > 0
      ? sel.map(id => {
          const s = SERVICES.find(x => x.id === id)
          const p = s.priceMode === "fixed" ? `от ${fmtK(s.basePrice)}` : "по запросу"
          return `<code>  ▸ ${s.label.padEnd(16)} ${p}</code>`
        }).join("\n")
      : `<code>  ◦ ничего не выбрано</code>`
    return [
      `<b>УСЛУГИ</b>`,
      `<code>${S}</code>`,
      ``,
      `  Выбери нужные услуги.`,
      `  Мультивыбор доступен.`,
      ``,
      `<code>${S}</code>`,
      lines,
    ].join("\n")
  },

  budget: [
    `<b>БЮДЖЕТ</b>`,
    `<code>${S}</code>`,
    ``,
    `  Выбери диапазон или укажи сумму.`,
  ].join("\n"),

  budgetCustom: [
    `<b>БЮДЖЕТ</b>  <code>· своя сумма</code>`,
    `<code>${S}</code>`,
    ``,
    `  Введи сумму цифрами:`,
    `  <code>80000</code>`,
  ].join("\n"),

  deadline: [
    `<b>РЕЖИМ РАБОТЫ</b>`,
    `<code>${S}</code>`,
    ``,
    `  <code>стандарт</code>  — обычная очередь`,
    `  <code>rush</code>      — приоритет · +30%`,
  ].join("\n"),

  name: [
    `<b>КОНТАКТ</b>  <code>[1/3]</code>`,
    `<code>${S}</code>`,
    ``,
    `  Как тебя зовут?`,
  ].join("\n"),

  contact: [
    `<b>КОНТАКТ</b>  <code>[2/3]</code>`,
    `<code>${S}</code>`,
    ``,
    `  Telegram (<code>@username</code>) или email?`,
  ].join("\n"),

  notes: [
    `<b>КОНТАКТ</b>  <code>[3/3]</code>`,
    `<code>${S}</code>`,
    ``,
    `  Есть пожелания или детали?`,
    `  Отправь <code>—</code> чтобы пропустить.`,
  ].join("\n"),

  noSession: `<code>  › /start — начать</code>`,

  done: (name, total) => [
    `<b>OBSERV</b>  <code>· заявка принята</code>`,
    `<code>${S}</code>`,
    ``,
    `<code>  ›</code> <b>${name}</b>, всё получили.`,
    ``,
    `  Свяжемся в течение рабочего дня.`,
    total > 0 ? `  Расчёт: <b>от ${fmtRub(total)}</b>` : `  Стоимость уточним при контакте.`,
    ``,
    `<code>${S}</code>`,
    `<code>  › /start — новый запрос</code>`,
  ].join("\n"),
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessions   = new Map()
const newSession = () => ({ step: "services", selectedIds: [], budget: 0, rush: false, name: "", contact: "", svcMsgId: null })

// ── Lead → team ───────────────────────────────────────────────────────────────
async function submitLead(chatId, s, notes) {
  const fixedTotal = s.selectedIds.reduce((sum, id) => {
    const svc = SERVICES.find(x => x.id === id)
    return svc?.priceMode === "fixed" ? sum + svc.basePrice : sum
  }, 0)
  const total     = s.rush ? Math.round(fixedTotal * 1.3) : fixedTotal
  const hasQuotes = s.selectedIds.some(id => SERVICES.find(x => x.id === id)?.priceMode === "quote")

  const svcLines = s.selectedIds.map(id => {
    const svc = SERVICES.find(x => x.id === id)
    return svc?.priceMode === "quote"
      ? `  ◦ ${svc.label} — по запросу`
      : `  ◦ ${svc.label} — от ${fmtRub(svc.basePrice)}`
  }).join("\n")

  const totalLine =
    total > 0 && hasQuotes ? `${fmtRub(total)} + уточн.`
    : total > 0            ? fmtRub(total)
    :                        "уточняется"

  const teamText = [
    `🟢 <b>NEW LEAD</b> · observ · bot`,
    ``,
    `<b>Имя:</b> ${s.name}`,
    `<b>Контакт:</b> ${s.contact}`,
    notes ? `<b>Детали:</b> ${notes}` : "",
    ``,
    `<b>Бюджет:</b> ${s.budget > 0 ? fmtRub(s.budget) : "не указан"} · ${s.rush ? "rush +30%" : "стандарт"}`,
    `<b>Итого:</b> ${totalLine}`,
    ``,
    `<b>Услуги:</b>`,
    svcLines,
    ``,
    `⏱ ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} MSK`,
  ].filter(l => l !== "").join("\n")

  if (CHAT_ID) {
    await tgRequest("sendMessage", { chat_id: CHAT_ID, text: teamText, ...BASE })
  }

  await tgSend(chatId, MSG.done(s.name, total))
}

// ── Message handler ───────────────────────────────────────────────────────────
async function handleMessage(msg) {
  const chatId   = msg.chat.id
  const text     = (msg.text ?? "").trim()
  const username = msg.from?.username

  if (text === "/help") {
    await tgSend(chatId, [
      `<b>OBSERV</b>  <code>· digital studio</code>`,
      `<code>${S}</code>`,
      ``,
      `<code>  ›</code> разработка сайтов и приложений`,
      `<code>  ›</code> брендинг и айдентика`,
      `<code>  ›</code> motion и графика`,
      ``,
      `<code>${S}</code>`,
      `<code>  /start</code>  — оставить заявку`,
    ].join("\n"))
    return
  }

  if (text === "/start") {
    sessions.set(chatId, newSession())

    // Boot animation: send → pause → edit → pause → services
    const bootRes   = await tgSend(chatId, MSG.boot1)
    const bootMsgId = bootRes.result?.message_id
    await sleep(900)
    if (bootMsgId) await tgEdit(chatId, bootMsgId, MSG.boot2(username)).catch(() => {})
    await sleep(300)

    const s      = sessions.get(chatId)
    const svcRes = await tgSend(chatId, MSG.services([]), { reply_markup: servicesKeyboard([]) })
    s.svcMsgId   = svcRes.result?.message_id
    return
  }

  const s = sessions.get(chatId)
  if (!s) { await tgSend(chatId, MSG.noSession); return }

  if (s.step === "budget_custom") {
    const val = parseInt(text.replace(/\D/g, ""), 10)
    if (!val || val < 1_000) {
      await tgSend(chatId, `<code>  укажи сумму цифрами, например: 80000</code>`)
      return
    }
    s.budget = val
    s.step   = "deadline"
    await tgSend(chatId, MSG.deadline, { reply_markup: deadlineKeyboard() })
    return
  }

  if (s.step === "name") {
    if (text.length < 2 || text.length > 100) {
      await tgSend(chatId, `<code>  имя: от 2 до 100 символов</code>`)
      return
    }
    s.name = text
    s.step = "contact"
    await tgSend(chatId, MSG.contact, { reply_markup: backKeyboard() })
    return
  }

  if (s.step === "contact") {
    if (text.length < 2 || text.length > 200) {
      await tgSend(chatId, `<code>  укажи @username или email</code>`)
      return
    }
    s.contact = text
    s.step    = "notes"
    await tgSend(chatId, MSG.notes, { reply_markup: backKeyboard() })
    return
  }

  if (s.step === "notes") {
    const notes = text === "—" || text === "-" ? "" : text
    sessions.delete(chatId)
    await submitLead(chatId, s, notes)
    return
  }
}

// ── Callback handler ──────────────────────────────────────────────────────────
async function handleCallback(cb) {
  const chatId = cb.message.chat.id
  const data   = cb.data
  const cbId   = cb.id

  if (data === "noop") { await tgAnswer(cbId); return }

  const s = sessions.get(chatId)
  if (!s) { await tgAnswer(cbId, "› /start — начать"); return }

  if (data.startsWith("svc:")) {
    const id     = data.slice(4)
    s.selectedIds = s.selectedIds.includes(id)
      ? s.selectedIds.filter(x => x !== id)
      : [...s.selectedIds, id]
    await tgAnswer(cbId)
    const msgId = s.svcMsgId ?? cb.message.message_id
    await tgEdit(chatId, msgId, MSG.services(s.selectedIds), { reply_markup: servicesKeyboard(s.selectedIds) }).catch(() => {})
    return
  }

  if (data === "back_services") {
    await tgAnswer(cbId)
    s.step    = "services"
    s.budget  = 0
    s.rush    = false
    s.name    = ""
    s.contact = ""
    const res  = await tgSend(chatId, MSG.services(s.selectedIds), { reply_markup: servicesKeyboard(s.selectedIds) })
    s.svcMsgId = res.result?.message_id
    return
  }

  if (data === "confirm_services") {
    await tgAnswer(cbId)
    s.step = "budget"
    await tgSend(chatId, MSG.budget, { reply_markup: budgetKeyboard() })
    return
  }

  if (data.startsWith("budget:")) {
    const val = data.slice(7)
    await tgAnswer(cbId)
    if (val === "custom") {
      s.step = "budget_custom"
      await tgSend(chatId, MSG.budgetCustom)
      return
    }
    s.budget = parseInt(val, 10)
    s.step   = "deadline"
    await tgSend(chatId, MSG.deadline, { reply_markup: deadlineKeyboard() })
    return
  }

  if (data.startsWith("deadline:")) {
    s.rush = data === "deadline:rush"
    s.step = "name"
    await tgAnswer(cbId)
    await tgSend(chatId, MSG.name, { reply_markup: backKeyboard() })
    return
  }

  await tgAnswer(cbId)
}

// ── Long polling ──────────────────────────────────────────────────────────────
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
        console.error("[bot] error:", e.message)
      }
    }
  } catch (e) {
    console.error("[bot] poll error:", e.message)
    await sleep(5000)
  }
}

await tgRequest("deleteWebhook", {})

// Register bot commands (shown in "/" menu)
await tgRequest("setMyCommands", {
  commands: [
    { command: "start",  description: "Инициировать запрос · новая сессия" },
    { command: "help",   description: "Информация о боте" },
  ],
})

// Set persistent menu button (replaces paperclip icon)
await tgRequest("setChatMenuButton", {
  menu_button: {
    type: "commands",
  },
})

console.log("[bot] polling · observ")
while (true) { await poll() }
