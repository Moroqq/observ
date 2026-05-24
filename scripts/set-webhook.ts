// Run: npx ts-node scripts/set-webhook.ts https://yourdomain.com
import "dotenv/config"

const token = process.env.TELEGRAM_BOT_TOKEN
const url   = process.argv[2]

if (!token || !url) {
  console.error("Usage: TELEGRAM_BOT_TOKEN=... npx ts-node scripts/set-webhook.ts https://yourdomain.com")
  process.exit(1)
}

const webhookUrl = `${url}/api/telegram/webhook`

fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body:    JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] }),
})
  .then(r => r.json())
  .then(res => console.log("Webhook set:", res))
  .catch(err => console.error("Error:", err))
