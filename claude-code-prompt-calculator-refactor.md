# Промт для Claude Code: рефакторинг калькулятора оценки проекта

## Контекст

В проекте есть модуль «Estimate your project» (калькулятор стоимости услуг агентства). Сейчас он работает по модели **weight distribution** — бюджет делится между выбранными услугами пропорционально весам. Это концептуально неверно: при выборе нескольких услуг цены неестественно «съезжают», тиры ломаются, сроки нелогичны.

Нужно полностью заменить модель на **scope estimation**: цены услуг стабильны, а бюджет влияет на тир (глубину проработки), сроки и набор deliverables. Параллельно — починить layout, типографику, state-менеджмент и payload в Telegram.

## Задача

Провести полный рефакторинг калькулятора по четырём направлениям: математика, UI/responsive, React-state, UX. Ниже — что именно поменять.

---

## 1. Математика и архитектура расчёта

### Что убрать

Удалить полностью формулу деления бюджета:

```ts
price = budget * (service.weight / totalWeight)
```

Эта модель — корень всех проблем. Бюджет **не делится** между услугами.

### Новая модель данных

Файл `pricing.ts` — структура каждой услуги:

```ts
export type Tier = 'lite' | 'standard' | 'extended'

export interface Service {
  id: string
  title: string
  category: 'development' | 'branding'
  basePrice: number          // базовая стоимость в рублях
  complexity: 1 | 2 | 3 | 4  // условная сложность
  baseWeeks: [number, number] // [min, max] срок в неделях
  tiers: Record<Tier, number> // множители: { lite: 0.8, standard: 1, extended: 1.5 }
}
```

Пример наполнения:

```ts
export const SERVICES: Service[] = [
  {
    id: 'landing',
    title: 'Landing',
    category: 'development',
    basePrice: 70000,
    complexity: 1,
    baseWeeks: [2, 4],
    tiers: { lite: 0.8, standard: 1, extended: 1.5 },
  },
  {
    id: 'mobile',
    title: 'Mobile app',
    category: 'development',
    basePrice: 350000,
    complexity: 4,
    baseWeeks: [8, 16],
    tiers: { lite: 0.8, standard: 1, extended: 1.5 },
  },
  // ...corporate, e-commerce, logo, identity, brandbook, presentation, graphics, video
]
```

Реальные значения basePrice и baseWeeks подбери на основе существующих цифр в текущем `pricing.ts`, но приведи их к консистентному формату (basePrice = стоимость **standard-варианта одной услуги**, а не доля от бюджета).

### Новый алгоритм

Функция `computeEstimate()` — полностью переписать:

```ts
export function computeEstimate(
  selected: Service[],
  budget: number,
  rush: boolean
) {
  if (!selected.length) return null

  const baseTotal = selected.reduce((sum, s) => sum + s.basePrice, 0)
  const ratio = budget / baseTotal

  let tier: Tier
  if (ratio < 0.8) tier = 'lite'
  else if (ratio > 1.3) tier = 'extended'
  else tier = 'standard'

  const items = selected.map(service => {
    const multiplier = service.tiers[tier]
    const finalPrice = Math.round(service.basePrice * multiplier)
    return { ...service, tier, price: finalPrice }
  })

  const total = items.reduce((s, i) => s + i.price, 0)

  const minWeeks = Math.max(...selected.map(s => s.baseWeeks[0]))
  const maxWeeks = Math.max(...selected.map(s => s.baseWeeks[1]))

  const weeks = rush
    ? [Math.max(1, Math.round(minWeeks * 0.7)), Math.max(2, Math.round(maxWeeks * 0.7))]
    : [minWeeks, maxWeeks]

  return { total, weeks, tier, items }
}
```

### Acceptance-критерии для математики

- Выбор одной услуги при достаточном бюджете показывает её **basePrice**, а не весь бюджет.
- Добавление второй услуги **не уменьшает** цену первой.
- При бюджете ниже `baseTotal * 0.8` — tier = `lite`, цены × 0.8.
- При бюджете выше `baseTotal * 1.3` — tier = `extended`, цены × 1.5.
- Срок проекта = max по выбранным услугам (не сумма), rush сокращает на 30%.

---

## 2. UI и responsive

### Контейнер

Сейчас фиксированная ширина (~1400px) ломает всё на ноутбуках. Заменить:

```css
.container {
  width: min(100%, 1200px);
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}
```

Максимальная ширина блока калькулятора — `max-width: 1280px`.

### Сетка карточек услуг

Заменить `grid-template-columns: repeat(4, 1fr)` на:

```css
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
}

.service-card {
  min-height: 160px; /* не фиксированная height */
}
```

### Типографика

Все ключевые размеры — через `clamp()`:

```css
.calculator-title { font-size: clamp(28px, 5vw, 64px); }
.service-card     { font-size: clamp(14px, 1vw, 18px); }
.price-large      { font-size: clamp(20px, 2vw, 28px); }
```

### Acceptance-критерии для UI

- На экранах 1280–1920 px калькулятор не растягивается во всю ширину.
- На экранах 768–1024 px карточки услуг переразбиваются по `auto-fit`, ничего не наезжает.
- На 375 px (мобилка) карточки в одну колонку, текст читаем, padding не съедает контент.

---

## 3. React state

### Заменить Set на массив id

Сейчас:

```ts
const [selected, setSelected] = useState<Set<Service>>(new Set())
```

`Set` ломает shallow-compare, плохо сериализуется, мешает `useMemo`. Заменить на:

```ts
const [selectedIds, setSelectedIds] = useState<string[]>([])

const toggleService = (id: string) =>
  setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

const selectedServices = useMemo(
  () => SERVICES.filter(s => selectedIds.includes(s.id)),
  [selectedIds]
)

const estimate = useMemo(
  () => computeEstimate(selectedServices, budget, rush),
  [selectedServices, budget, rush]
)
```

### Acceptance-критерии для state

- Никаких `Set`/`Map` в state.
- Все производные значения (`selectedServices`, `estimate`) обёрнуты в `useMemo` с корректными зависимостями.
- Перерендер происходит только при изменении `selectedIds`, `budget` или `rush`.

---

## 4. UX слайдера и обратной связи

### Слайдер бюджета

Добавить визуальные якоря на шкале (`15k — lite`, `100k — standard`, `500k — extended`) и live-индикатор текущего тира.

Под слайдером показывать блок:

```
Current scope: STANDARD
Suitable for:
  • custom UI
  • CMS
  • responsive design
```

Содержание блока — функция от `tier` (вынести `TIER_DESCRIPTIONS` в `pricing.ts`).

### Acceptance-критерии для UX

- Пользователь видит, в каком тире находится при текущем бюджете.
- При переходе через границу тира (`ratio = 0.8` или `1.3`) блок описания меняется без задержки.
- Цены на карточках обновляются синхронно со слайдером.

---

## 5. Telegram payload

Сейчас в Telegram уходит только `total` — но total искусственный, без контекста.

Заменить payload на:

```ts
{
  expectedBudget: budget,           // что ввёл клиент
  recommendedBudget: estimate.total, // что реально нужно
  gap: estimate.total - budget,      // дельта (отрицательная = клиент готов переплатить)
  tier: estimate.tier,
  weeks: estimate.weeks,
  services: estimate.items.map(i => ({ id: i.id, title: i.title, price: i.price })),
  rush,
}
```

Это превращает форму из приёма заявки в sales-инструмент: менеджер сразу видит, что клиент хочет mobile app за 100k при реалистичной оценке 430k.

---

## Порядок работы

1. Найти текущие файлы: `pricing.ts` (или аналог), компонент калькулятора, обработчик отправки в Telegram.
2. Сначала переписать `pricing.ts` и `computeEstimate()` — добавить unit-тесты на 4 кейса (одна услуга, несколько, lite-граница, extended-граница).
3. Заменить state с `Set` на массив, прогнать компонент.
4. Поправить CSS: контейнер → сетка → типографика.
5. Добавить tier-feedback под слайдером.
6. Обновить Telegram payload.
7. Прогнать на трёх ширинах: 375 / 1024 / 1440 px.

## Не делать

- Не трогать терминальную ASCII-эстетику и цветовую схему — только структуру и расчёт.
- Не добавлять dependency matrix, AI-рекомендации, roadmap preview — это следующий этап, не сейчас.
- Не менять текст лейблов на русский/английский — оставить как есть.

## Готовность

Калькулятор считается готовым, когда:

- Цена одной услуги не зависит от количества выбранных.
- Бюджет влияет только на тир, сроки и набор фич.
- Layout не ломается на 1024 px.
- В Telegram уходит структурированный payload с gap-анализом.
