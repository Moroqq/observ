"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  SERVICES,
  BUDGET_MIN, BUDGET_MAX, BUDGET_STEP,
  formatPrice, formatServicePrice,
  type Service,
} from "@/lib/pricing"
import { computeEstimate } from "@/lib/estimate"

// ── BudgetSlider ─────────────────────────────────────────────────────────────
const TICKS = [
  { val:     5_000, label: "5к"   },
  { val:   100_000, label: "100к" },
  { val:   500_000, label: "500к" },
  { val: 1_000_000, label: "1млн" },
  { val: 2_000_000, label: "2млн" },
]

function BudgetSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useTranslations()
  const [dragging, setDragging] = useState(false)
  const fillPercent = `${((value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN) * 100).toFixed(2)}%`

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-white/35 text-[10px] uppercase tracking-widest font-mono shrink-0">
          &gt; {t("calculator.budgetLabel")}:
        </span>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: "clamp(20px, 2.2vw, 28px)",
            color: dragging ? "var(--brand)" : "#fff",
            transition: "color 120ms ease",
          }}
        >
          {new Intl.NumberFormat("ru-RU").format(value)} ₽
        </span>
      </div>

      <input
        type="range"
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        className="budget-slider w-full"
        style={{ "--fill": fillPercent } as React.CSSProperties}
        aria-label={t("calculator.budgetLabel")}
        aria-valuemin={BUDGET_MIN}
        aria-valuemax={BUDGET_MAX}
        aria-valuenow={value}
      />

      <div className="relative h-3">
        {TICKS.map(({ val, label }) => {
          const pct = ((val - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN) * 100).toFixed(2)
          return (
            <span
              key={val}
              className="absolute text-[9px] text-white/20 font-mono -translate-x-1/2 select-none"
              style={{ left: `${pct}%` }}
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── ServiceCard ──────────────────────────────────────────────────────────────
function ServiceCard({
  service,
  label,
  isSelected,
  onToggle,
}: {
  service: Service
  label: string
  isSelected: boolean
  onToggle: () => void
}) {
  const isQuote = service.priceMode === "quote"
  const priceStr = formatServicePrice(service)

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      onClick={onToggle}
      className="text-left font-mono transition-all duration-200 flex flex-col gap-1.5"
      style={{
        padding: "9px 12px",
        minHeight: 58,
        border: `1.5px solid ${isSelected ? "rgba(0,255,106,1)" : "rgba(0,255,106,0.30)"}`,
        background: isSelected ? "rgba(0,255,106,0.08)" : "rgba(0,255,106,0.02)",
        boxShadow: isSelected
          ? "0 0 0 1px rgba(0,255,106,1) inset, 0 0 14px rgba(0,255,106,0.15)"
          : "none",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-green-500/70 text-[11px] shrink-0">{isSelected ? "(●)" : "( )"}</span>
        <span className="text-[rgba(255,255,255,0.92)] text-[13px] leading-tight">{label}</span>
      </div>

      <div
        className="tabular-nums"
        style={{
          fontSize: isQuote ? "11px" : "clamp(13px, 1.2vw, 17px)",
          color: isQuote
            ? "rgba(255,255,255,0.22)"
            : isSelected
            ? "var(--brand)"
            : "rgba(255,255,255,0.38)",
          transition: "color 150ms ease",
          letterSpacing: isQuote ? "0.05em" : undefined,
        }}
      >
        {isQuote ? "— по запросу" : priceStr}
      </div>
    </button>
  )
}

// ── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t" style={{ borderColor: "rgba(0,255,106,0.15)" }} />
}

// ── Lead form schema ─────────────────────────────────────────────────────────
const leadSchema = z.object({
  name:    z.string().min(1, "Обязательное поле"),
  contact: z.string().min(2, "Укажите telegram или email"),
  notes:   z.string().optional(),
})
type LeadForm = z.infer<typeof leadSchema>
type SubmitState = "idle" | "submitting" | "success" | "error"

// ── EstimateModule ────────────────────────────────────────────────────────────
export function EstimateModule({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const t = useTranslations()

  const [selectedIds,  setSelectedIds]  = useState<string[]>([])
  const [rush,         setRush]         = useState(false)
  const [ctaOpen,      setCtaOpen]      = useState(false)
  const [submitState,  setSubmitState]  = useState<SubmitState>("idle")

  const [budget, setBudget] = useState<number>(() => {
    if (typeof window === "undefined") return 100_000
    const saved = Number(localStorage.getItem("observ.budget"))
    return Number.isFinite(saved) && saved >= BUDGET_MIN ? saved : 100_000
  })
  useEffect(() => {
    localStorage.setItem("observ.budget", String(budget))
  }, [budget])

  const devServices   = SERVICES.filter(s => s.category === "development")
  const brandServices = SERVICES.filter(s => s.category === "branding")

  const toggleService = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const estimate = useMemo(
    () => computeEstimate({ selectedIds, rush }),
    [selectedIds, rush],
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
  })

  const onSubmit = async (data: LeadForm) => {
    setSubmitState("submitting")
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          budget,
          total:     estimate?.total     ?? 0,
          hasQuotes: estimate?.hasQuotes ?? false,
          selectedIds,
          rush,
          weeks:    estimate?.weeks    ?? [0, 0],
          services: estimate?.items.map(i => ({ id: i.serviceId, price: i.price, priceMode: i.priceMode })) ?? [],
          locale,
        }),
      })
      if (!res.ok) throw new Error("failed")
      setSubmitState("success")
    } catch {
      setSubmitState("error")
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) { setSubmitState("idle"); reset() }
    setCtaOpen(open)
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto font-mono">

      {/* Header */}
      <div className="text-[9px] tracking-[0.4em] text-green-500/50 mb-2 uppercase">
        {t("estimate.section_label")}
      </div>
      <div
        className="text-white/90 mb-1"
        style={{ fontSize: "clamp(18px, 2.2vw, 26px)", lineHeight: 1.15 }}
      >
        {t("estimate.title")}
      </div>
      <div className="text-white/40 text-[11px] mb-4">
        {t("estimate.subtitle")}
      </div>

      {/* Terminal frame */}
      <div
        className="border-2"
        style={{
          borderColor: "rgba(0,255,106,0.75)",
          boxShadow: "0 0 0 1px rgba(0,255,106,.12), 0 0 32px rgba(0,255,106,.15)",
        }}
      >
        {/* Top bar */}
        <div
          className="border-b-2 px-4 py-2 text-green-400/70 text-[10px]"
          style={{ borderColor: "rgba(0,255,106,0.4)" }}
        >
          {t("calculator.commandLine")}
        </div>

        <div className="space-y-3" style={{ padding: "clamp(10px,1.5vw,18px)" }}>

          {/* 1 — Budget slider */}
          <BudgetSlider value={budget} onChange={setBudget} />

          <Divider />

          {/* 2 — Development services */}
          <div>
            <div className="text-green-500/60 text-[10px] mb-2 uppercase tracking-widest">
              {t("calculator.groups.development")}
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
            >
              {devServices.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  label={t(`estimate.service_${s.id}`)}
                  isSelected={selectedIds.includes(s.id)}
                  onToggle={() => toggleService(s.id)}
                />
              ))}
            </div>
          </div>

          {/* 3 — Branding services */}
          <div>
            <div className="text-green-500/60 text-[10px] mb-2 uppercase tracking-widest">
              {t("calculator.groups.branding")}
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
            >
              {brandServices.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  label={t(`estimate.service_${s.id}`)}
                  isSelected={selectedIds.includes(s.id)}
                  onToggle={() => toggleService(s.id)}
                />
              ))}
            </div>
          </div>

          {/* 4 — Deadline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
            <span className="text-white/35 text-[10px] uppercase tracking-widest shrink-0">
              &gt; {t("calculator.deadlineLabel")}:
            </span>
            <div className="flex gap-2">
              {([false, true] as const).map(isRush => {
                const label  = isRush ? t("calculator.deadlineRush") : t("calculator.deadlineStandard")
                const active = rush === isRush
                return (
                  <button
                    key={String(isRush)}
                    onClick={() => setRush(isRush)}
                    className={[
                      "px-3 py-1 border-2 text-[11px] transition-all duration-75",
                      active
                        ? "border-green-500/65 text-green-400 bg-green-500/14"
                        : "border-white/15 text-white/40 hover:border-white/30",
                    ].join(" ")}
                  >
                    [ {label} ]
                  </button>
                )
              })}
            </div>
          </div>

          <Divider />

          {/* 5 — Summary + CTA */}
          <div className="space-y-4">

            {/* Estimate totals — only when services selected */}
            {estimate && (
              <div className="flex flex-wrap gap-4 sm:gap-8">
                {estimate.total > 0 && (
                  <div>
                    <p className="text-white/35 text-[10px] uppercase tracking-widest mb-0.5">
                      {t("calculator.totalLabel")}
                    </p>
                    <p className="text-green-400 tabular-nums" style={{ fontSize: "clamp(16px, 1.8vw, 22px)" }}>
                      {formatPrice(estimate.total)}
                      {estimate.hasQuotes && (
                        <span className="text-white/30 text-[11px] ml-2">+ уточн. у менеджера</span>
                      )}
                    </p>
                  </div>
                )}

                {estimate.total === 0 && estimate.hasQuotes && (
                  <div>
                    <p className="text-white/35 text-[10px] uppercase tracking-widest mb-0.5">
                      {t("calculator.totalLabel")}
                    </p>
                    <p className="text-white/50 text-[13px]">уточняется у менеджера</p>
                  </div>
                )}

                <div>
                  <p className="text-white/35 text-[10px] uppercase tracking-widest mb-0.5">
                    {t("calculator.termLabel")}
                  </p>
                  <p className="text-white/70 tabular-nums" style={{ fontSize: "clamp(16px, 1.8vw, 22px)" }}>
                    ~{estimate.weeks[0]}–{estimate.weeks[1]} {t("calculator.weeksShort")}
                  </p>
                </div>
              </div>
            )}

            {/* CTA — always visible, centered */}
            <div className="flex justify-center pt-1">
              <button
                onClick={() => setCtaOpen(true)}
                className="border-2 border-green-500/55 text-green-400 px-8 py-2 text-sm hover:bg-green-500/10 hover:border-green-500 transition-all duration-150"
              >
                [ оставить заявку ]
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── CTA Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={ctaOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-black border border-white/15 font-mono text-sm max-w-2xl p-0 gap-0">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-white/8">
            <DialogTitle className="text-[10px] tracking-[0.3em] uppercase text-green-500/60 font-normal">
              {t("modal.title")}
            </DialogTitle>
          </DialogHeader>

          {submitState === "success" ? (
            <div className="px-8 py-10 text-center space-y-3">
              <div className="text-green-500/70 text-xs leading-relaxed">
                &gt; {t("modal.success_title")}.<br />
                &gt; {t("modal.success_body")}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 md:p-10">
              {estimate && (
                <div className="mb-6 space-y-1">
                  {estimate.items.map(item => {
                    const svc = SERVICES.find(s => s.id === item.serviceId)
                    const priceStr = item.priceMode === "quote"
                      ? "по запросу"
                      : formatPrice(item.price)
                    return (
                      <div key={item.serviceId} className="text-[10px] text-white/40">
                        · {svc?.label ?? item.serviceId} — {priceStr}
                      </div>
                    )
                  })}
                  <div className="text-[10px] text-white/25 mt-2">
                    бюджет {formatPrice(budget)} · {rush ? "rush" : "standard"}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-green-400">
                  &gt; {t("modal.name_label")}
                </label>
                <input
                  {...register("name")}
                  placeholder={t("modal.name_placeholder")}
                  className="mt-2 w-full bg-transparent border border-white/15 px-4 py-3 text-white/80 text-xs placeholder:text-white/30 focus:outline-none focus:border-green-500 transition-colors"
                />
                {errors.name && (
                  <p className="text-red-400/70 text-[10px] mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="mt-5">
                <label className="block text-xs uppercase tracking-wider text-green-400">
                  &gt; {t("modal.contact_label")}
                </label>
                <input
                  {...register("contact")}
                  placeholder={t("modal.contact_placeholder")}
                  className="mt-2 w-full bg-transparent border border-white/15 px-4 py-3 text-white/80 text-xs placeholder:text-white/30 focus:outline-none focus:border-green-500 transition-colors"
                />
                {errors.contact && (
                  <p className="text-red-400/70 text-[10px] mt-1">{errors.contact.message}</p>
                )}
              </div>

              <div className="mt-5">
                <label className="block text-xs uppercase tracking-wider text-green-400">
                  &gt; {t("modal.notes_label")}
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder={t("modal.notes_placeholder")}
                  className="mt-2 w-full bg-transparent border border-white/15 px-4 py-3 text-white/80 text-xs placeholder:text-white/30 focus:outline-none focus:border-green-500 transition-colors resize-none"
                />
              </div>

              {submitState === "error" && (
                <p className="text-red-400/70 text-[10px] mt-4">
                  &gt; {t("modal.error_message")}
                </p>
              )}

              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="mt-6 w-full border border-green-500/50 text-green-400 px-6 py-3 text-sm hover:bg-green-500/10 hover:border-green-500 transition-all duration-150 disabled:opacity-40"
              >
                [ {submitState === "submitting" ? t("modal.submit_loading") : t("modal.submit")} ]
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
