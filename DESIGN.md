# observ.team — Design System

> **Эстетика:** dark terminal · observability · монохром + зелёный сигнал  
> **Стек:** Next.js 16 · Tailwind CSS v4 · Space Mono · CSS keyframes

---

## 1. Философия

Сайт — не лендинг, а **цифровая среда**. Интерфейс имитирует системный монитор: логи в реальном времени, терминальные команды, ASCII-символика, зелёные сигналы на чёрном фоне. Каждый элемент либо несёт смысл, либо создаёт атмосферу наблюдения за работающей системой.

Три принципа из манифеста:
- `interface is identity.` — UI является голосом бренда
- `motion is language.` — анимация несёт смысл, не декор
- `silence is design.` — пустое пространство — это решение

---

## 2. Цвета

Сайт всегда в тёмной теме (`.dark` захардкожен на `<html>`).

### Бренд

| Токен | CSS-переменная | Значение | Применение |
|---|---|---|---|
| `--color-brand` | `--brand` | `oklch(0.723 0.219 148.08)` ≈ `#22c55e` | Акцент, сигналы, CTA, иконки |

В Tailwind доступен как `text-brand`, `bg-brand`, `border-brand`.  
В коде компонентов используется как `text-green-500`, `border-green-500` (Tailwind shorthand).

### Поверхности

| Роль | Значение | Hex-эквивалент |
|---|---|---|
| Background | `oklch(0.145 0 0)` | `#111111` |
| Card / Popover | `oklch(0.145 0 0)` | `#111111` |
| Secondary / Muted | `oklch(0.269 0 0)` | `#303030` |
| Border | `oklch(0.269 0 0)` | `#303030` |

Service-карточки используют чуть более тёплый чёрный — `rgba(12,12,12,0.95)` — с box-shadow глубины.

### Непрозрачность (white/N паттерн)

Все текстовые оттенки выражены через `rgba(255,255,255, N)`:

| Уровень | Класс | Применение |
|---|---|---|
| Основной | `text-white/90` | Заголовки |
| Средний | `text-white/70` | Подзаголовки, результаты |
| Dim | `text-white/45` | Описания карточек |
| Ghost | `text-white/30` | Лейблы, метки |
| Phantom | `text-white/20–10` | Декоративные элементы |

---

## 3. Типографика

**Единственный шрифт** — `Space Mono` (Google Fonts), подключён через `next/font`.

```css
--font-mono: 'Space Mono', monospace;
--font-sans: var(--font-mono); /* sans = mono по всему сайту */
```

`body` имеет класс `font-mono antialiased`, так что всё дерево компонентов автоматически использует Space Mono.

### Иерархия размеров

| Роль | Размер | Класс / style |
|---|---|---|
| Раздельная метка | 10px | `text-[10px] tracking-[0.4–0.5em] uppercase` |
| Мелкий UI | 11px | `text-[11px] tracking-widest` |
| Тело, чипы | 13px → 16px | `text-sm` / `text-base` |
| Подзаголовок | 18–20px | `text-lg` / `text-xl` |
| Манифест | 24px | `text-2xl leading-relaxed` |
| Метрика-цифра | 60–72px | `text-6xl md:text-7xl font-bold tabular-nums` |

Лейблы разделов всегда: `text-[10px] uppercase tracking-[0.4em] text-green-500/50`.

---

## 4. Пространство и компоновка

### Сетка

Сайт не использует классическую сетку страницы — вместо этого **fixed viewport overlay**: весь контент абсолютно позиционирован внутри `fixed inset-0 top-[88px]` и управляется через `scrollY`.

Максимальные ширины контейнеров:
- Карточки сервисов: `360px` (фиксировано)
- Логотип: `718px × 718px` (фиксировано)
- Манифест: `min(700px, 90vw)`
- Метрики / Калькулятор: `min(1200px, 95vw)`

### Шапка

Высота шапки — `88px` (Ticker `~48px` + nav `~40px`). Sticky, `z-10`, фон `bg-background`.

### Скролл-пространство

```
minHeight: max(700vh, 7200px)
```

Весь контент фиксирован — скролл только двигает прогресс фаз.

---

## 5. Архитектура скролла (фазы)

Семь фаз, управляемых функцией `prog(scrollY, start, end) → 0..1`:

| Константы | Диапазон px | Что происходит |
|---|---|---|
| `A13_S–A13_E` | 100–600 | Карточки A1 + A3 появляются снизу |
| `A2_S–A2_E` | 550–900 | Карточка A2 входит снизу |
| `P3_S–P3_E` | 900–1700 | A2 выравнивается с A1/A3, лого уходит вверх |
| `P4_S–P4_E` | 2100–2800 | Карточки уходят, появляется манифест |
| `P5_S–P5_E` | 3200–3800 | Манифест уходит, входят метрики |
| `P6_S–P6_E` | 4200–5000 | Метрики уходят, входит калькулятор |

Easing для карточек — `easeInOutSine`: `-(cos(π·t) - 1) / 2`.

---

## 6. Компоненты

### ServiceCard
Карточка 360px. Стеклянная подложка `rgba(12,12,12,0.95)`, `border-radius: 20px`, `boxShadow` с двумя слоями. Пропорция превью `4:3`. Padding контента `28px`.

### EstimateModule (калькулятор-терминал)
- Контейнер `max-w-6xl`, внутренний padding `p-8 md:p-10`
- Чипы услуг: `text-base tracking-tight`, gap `gap-3`
- Состояния чипов: `border-green-500/60 bg-green-500/10` (выбран) / `border-white/10` (нет)
- DotSlider: 5 точек-кружков, заполненные до выбранного индекса
- CTA-кнопка: `border-green-500/50`, hover `bg-green-500/10 border-green-500`

### Modal init.project
- Ширина `max-w-2xl`, padding `p-8 md:p-10`
- Summary заказа: 2 строки (`services line` + `details line`)
- Лейблы: `text-xs uppercase tracking-wider text-green-400`
- Инпуты: `py-3 px-4 border-white/15`, focus `border-green-500`
- Состояния формы: `idle → submitting → success | error`

### SysLogConsole
Floating консоль `bottom-6 right-6`, `z-55`. Сворачивается/разворачивается. Показывает контекстные логи по текущей секции. Скрыта на мобилке (`hidden sm:flex`).

### TelemetryBackground
Фоновый слой для секции калькулятора. 5 слоёв, все `pointer-events: none`:
1. SVG-сетка с fade по краям (`radial-gradient` mask)
2. 8 вращающихся ромбов `◆` (CSS `spin`, 12–20s, opacity 0.10)
3. ASCII-колонны слева/справа (символы `│┊╎┃╵╷`, меняются каждые ~3s, hidden на `<md`)
4. Угловые маркеры `▮` с `animate-pulse` и разным `animation-delay`
5. Cursor ping — случайный `>` появляется каждые 8–12s на 600ms

### SYS.METRICS
Сетка `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Карточки с анимированными счётчиками (IntersectionObserver threshold 0.3, RAF + easeOutCubic, 1.4s). Запуск один раз.

---

## 7. Микровизуализации (metrics/microviz)

Каждая метрика имеет уникальный SVG-компонент. Анимация стартует от класса `.is-animating` на SVG, one-shot.

| Компонент | Метрика | Анимация |
|---|---|---|
| `TimelineViz` | 50ms first impression | Засечка пульсирует 3 раза |
| `RingViz` | 75% judge by design | Кольцо заполняется до 75% |
| `BarChartViz` | 53% leave >3s | Бары растут каскадом 100ms |
| `DotMatrixViz` | ×100 ROI | 50 точек fade-in+scale каскадом |
| `LiftBarsViz` | +33% revenue | Горизонтальные бары выезжают |
| `SparklineViz` | +211% S&P 500 | Линии рисуются, финальная точка overshoots |

Все цвета через `var(--color-brand)`. Reduced motion: `animation-duration: 0.01s`.

---

## 8. Специальные эффекты

### CustomCursor
Matrix-курсор: ромб с зелёным бордером + частицы из кириллицы/ASCII/японских символов (`アイウエオ…`). Частицы медленно падают вниз (`p.y += 0.4`), цвет `#4ade80`, fade через `alpha * 0.952`. Отключён на `pointer: coarse` (тач).

### GlitchOverlay
Случайный эффект каждые 14–40 секунд. Три варианта:
- Двойное мигание (`55ms off → 40ms on → 70ms off`)
- Одиночная вспышка
- Scanline sweep (`h-px bg-green-500/20`, анимация `glitch-scan` 700ms)

### AsciiLogo → FrameSequence
При загрузке страницы ASCII-арт (`OV` в box-drawing символах) проходит через glitch-фазу и исчезает. После него появляется 3D frame sequence (407 кадров PNG).

### Ticker
Бегущая строка с информацией о сервисах. При hover замедляется до 0.4× через плавную интерполяцию `playbackRate`. Hover на отдельных словах — белое свечение `drop-shadow`.

---

## 9. Анимационная система

### CSS keyframes (globals.css)

| Имя | Применение |
|---|---|
| `ticker-scroll` | Бегущая строка, 35s |
| `ticker-scroll-slow` | Медленная строка, 130s |
| `spin-y` | 3D spin логотипа (1 раз) |
| `glitch-scan` | Scanline sweep |
| `tick-pulse` | TimelineViz |
| `ring-draw` | RingViz (stroke-dashoffset) |
| `bar-grow` | BarChartViz (scaleY) |
| `dot-pop` | DotMatrixViz (scale + opacity) |
| `bar-extend` | LiftBarsViz (scaleX) |
| `line-draw` | SparklineViz (stroke-dashoffset) |
| `dot-arrive` | SparklineViz финальная точка |

### Правила анимаций
- Только `transform` и `opacity` — никаких `top/left/width`
- `willChange: "opacity, transform"` на скролл-управляемых элементах
- Все новые анимации поддерживают `prefers-reduced-motion`
- One-shot: микровизуализации не зацикливаются

---

## 10. Локализация (i18n)

**Стек:** `next-intl` v3, `localePrefix: "always"`.

| URL | Локаль |
|---|---|
| `/` → редирект | → `/ru` |
| `/ru` | Русский (дефолт) |
| `/en` | Английский |

Строки хранятся в `messages/ru.json` и `messages/en.json`. Неймспейсы: `hero`, `services`, `metrics`, `estimate`, `modal`, `syslog`, `header`.

`LocaleSwitcher` — в шапке между `SocialLinks` и `MiniPlayer`. Активный язык `text-white`, неактивный `text-white/40`.

---

## 11. API

### POST /api/lead

Rate limit: 1 запрос/60s с одного IP.

```ts
type LeadPayload = {
  name: string       // max 100 chars
  contact: string    // max 200 chars
  notes?: string     // max 2000 chars
  services: string[] // массив ServiceId
  complexity: number // 1–5
  deadline: "standard" | "rush"
  estimate: number   // рублей
  timeline: [number, number] // недель
  locale: "ru" | "en"
}
```

Результат уходит в Telegram через Bot API (`sendMessage`, `parse_mode: HTML`).  
Переменные окружения: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

---

## 12. Структура файлов (ключевые)

```
app/
  globals.css           ← токены + все keyframes
  layout.tsx            ← root: html/body, SpaceMono, CustomCursor
  page.tsx              ← redirect → /ru
  [locale]/
    layout.tsx          ← NextIntlClientProvider
    page.tsx            ← главная страница (client, scroll logic)
  api/lead/route.ts     ← Telegram endpoint

components/
  EstimateModule.tsx    ← калькулятор + модалка
  SysLogConsole.tsx     ← floating лог
  SysMetrics.tsx        ← секция метрик
  TelemetryBackground.tsx
  LocaleSwitcher.tsx
  service-cards.tsx
  custom-cursor.tsx
  glitch-overlay.tsx
  ascii-logo.tsx
  ticker.tsx
  mini-player.tsx
  metrics/
    MetricCard.tsx
    microviz/
      TimelineViz.tsx · RingViz.tsx · BarChartViz.tsx
      DotMatrixViz.tsx · LiftBarsViz.tsx · SparklineViz.tsx

lib/
  pricing.ts            ← услуги, цены, calcEstimate()
  metrics.ts            ← данные SYS.METRICS

i18n/
  routing.ts
  request.ts

messages/
  ru.json
  en.json

proxy.ts                ← next-intl router (Next.js 16 convention)
```

---

## 13. Переменные окружения

```bash
# .env.local
TELEGRAM_BOT_TOKEN=...   # от @BotFather
TELEGRAM_CHAT_ID=...     # ID чата/канала/лички куда падают лиды
```
