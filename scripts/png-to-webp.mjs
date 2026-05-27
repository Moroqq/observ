import sharp from "sharp"
import { readdir, unlink } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC    = join(__dirname, "..", "public")
const DIRS      = ["frames", "frameswebsite", "framesdesign", "framesapp"]
const QUALITY   = 85

let totalPng = 0, totalWebp = 0, converted = 0

for (const dir of DIRS) {
  const folder = join(PUBLIC, dir)
  const files  = (await readdir(folder)).filter(f => f.endsWith(".png"))

  process.stdout.write(`${dir}: converting ${files.length} files... `)

  let dirPng = 0, dirWebp = 0
  for (const file of files) {
    const input  = join(folder, file)
    const output = join(folder, file.replace(/\.png$/, ".webp"))

    const { size: pngSize } = await import("fs").then(m => m.promises.stat(input))
    await sharp(input).webp({ quality: QUALITY }).toFile(output)
    const { size: webpSize } = await import("fs").then(m => m.promises.stat(output))

    dirPng  += pngSize
    dirWebp += webpSize
    converted++
  }

  const saved = ((1 - dirWebp / dirPng) * 100).toFixed(0)
  console.log(`${(dirPng / 1024 / 1024).toFixed(1)} MB → ${(dirWebp / 1024 / 1024).toFixed(1)} MB  (−${saved}%)`)
  totalPng  += dirPng
  totalWebp += dirWebp
}

const totalSaved = ((1 - totalWebp / totalPng) * 100).toFixed(0)
console.log(`\nИТОГО: ${(totalPng/1024/1024).toFixed(1)} MB → ${(totalWebp/1024/1024).toFixed(1)} MB  (−${totalSaved}%, ${converted} файлов)`)
console.log("WebP готовы. Теперь запусти: node scripts/delete-pngs.mjs")
