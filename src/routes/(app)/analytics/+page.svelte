<script lang="ts">
  import { onMount } from 'svelte'
  import { scaleBand } from 'd3-scale'
  import { BarChart } from 'layerchart'
  import { cubicInOut } from 'svelte/easing'
  import * as Chart from '$lib/components/ui/chart/index.js'
  import * as Card from '$lib/components/ui/card/index.js'
  import { Button } from '$lib/components/ui/button'
  import {
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Download,
    Calendar,
    Users,
    Banknote,
    ShoppingBag,
    CheckCircle2,
    XCircle,
    BarChart3,
  } from 'lucide-svelte'

  type Summary = {
    totalOrders: number
    completedOrders: number
    canceledOrders: number
    totalRevenue: number
    totalExpenses: number
    totalPayroll: number
    profit: number
    avgOrderValue: number
  }

  type MonthlyPoint = {
    month: string
    revenue: number
    expenses: number
    orders: number
    profit: number
  }

  type TopCustomer = { name: string; orders: number; revenue: number }

  type AnalyticsData = {
    period: {
      from: string
      to: string
      type: string
      year: number
      month: number
    }
    summary: Summary
    monthly: MonthlyPoint[]
    topCustomers: TopCustomer[]
    statusBreakdown: Record<string, number>
    orders: Array<{
      id: string
      date: string
      status: string
      paymentStatus: string
      customer: string
      address: string
      revenue: number
      expenses: number
      payroll: number
      workers: string[]
    }>
  }

  let period = $state<'week' | 'month' | 'year'>('month')
  let year = $state(new Date().getFullYear())
  let month = $state(new Date().getMonth() + 1)
  let data = $state<AnalyticsData | null>(null)
  let loading = $state(true)
  let exporting = $state(false)

  const MONTHS_UA = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
  ]
  const MONTHS_SHORT = [
    'Січ',
    'Лют',
    'Бер',
    'Кві',
    'Тра',
    'Чер',
    'Лип',
    'Сер',
    'Вер',
    'Жов',
    'Лис',
    'Гру',
  ]

  async function load() {
    loading = true
    try {
      const res = await fetch(
        `/api/analytics?period=${period}&year=${year}&month=${month}`,
      )
      const json = await res.json()
      if (json.success) data = json
    } finally {
      loading = false
    }
  }

  onMount(load)

  function fmt(n: number): string {
    return n.toLocaleString('uk-UA', { minimumFractionDigits: 0 })
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function monthLabel(key: string): string {
    const m = parseInt(key.split('-')[1]) - 1
    return MONTHS_SHORT[m]
  }

  const chartConfig = {
    revenue: { label: 'Дохід', color: 'var(--chart-1)' },
    expenses: { label: 'Витрати', color: 'var(--chart-2)' },
    profit: { label: 'Прибуток', color: 'var(--chart-3)' },
  } satisfies Chart.ChartConfig

  const chartData = $derived(
    data?.monthly.map((m) => ({
      month: monthLabel(m.month),
      revenue: Math.round(m.revenue),
      expenses: Math.round(m.expenses),
      profit: Math.round(m.profit),
    })) ?? [],
  )

  const periodLabel = $derived(
    period === 'week'
      ? 'Поточний тиждень'
      : period === 'month'
        ? `${MONTHS_UA[month - 1]} ${year}`
        : `${year} рік`,
  )

  function prevPeriod() {
    if (period === 'month') {
      if (month === 1) {
        month = 12
        year--
      } else month--
    } else if (period === 'year') {
      year--
    }
    load()
  }
  function nextPeriod() {
    if (period === 'month') {
      if (month === 12) {
        month = 1
        year++
      } else month++
    } else if (period === 'year') {
      year++
    }
    load()
  }

  const kpis = $derived.by(() => {
    if (!data) return []
    const s = data.summary
    return [
      {
        label: 'Дохід',
        value: fmt(s.totalRevenue) + ' ₴',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        accent: 'bg-emerald-400',
      },
      {
        label: 'Витрати',
        value: fmt(s.totalExpenses) + ' ₴',
        icon: TrendingDown,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        accent: 'bg-red-400',
      },
      {
        label: 'Зарплати',
        value: fmt(s.totalPayroll) + ' ₴',
        icon: Users,
        color: 'text-violet-600',
        bg: 'bg-violet-50 dark:bg-violet-950/30',
        accent: 'bg-violet-400',
      },
      {
        label: 'Прибуток',
        value: fmt(s.profit) + ' ₴',
        icon: Banknote,
        color: s.profit >= 0 ? 'text-emerald-600' : 'text-red-500',
        bg:
          s.profit >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30'
            : 'bg-red-50 dark:bg-red-950/30',
        accent: s.profit >= 0 ? 'bg-emerald-400' : 'bg-red-400',
      },
      {
        label: 'Замовлень',
        value: String(s.totalOrders),
        icon: ShoppingBag,
        color: 'text-sky-600',
        bg: 'bg-sky-50 dark:bg-sky-950/30',
        accent: 'bg-sky-400',
      },
      {
        label: 'Виконано',
        value: String(s.completedOrders),
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        accent: 'bg-emerald-400',
      },
      {
        label: 'Скасовано',
        value: String(s.canceledOrders),
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        accent: 'bg-red-400',
      },
      {
        label: 'Сер. чек',
        value: fmt(s.avgOrderValue) + ' ₴',
        icon: BarChart3,
        color: 'text-amber-600',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        accent: 'bg-amber-400',
      },
    ]
  })

  const STATUS_UA: Record<string, string> = {
    PENDING: 'Нові',
    CONFIRMED: 'Підтверджені',
    IN_PROGRESS: 'В роботі',
    COMPLETED: 'Виконані',
    CANCELED: 'Скасовані',
  }
  const PAYMENT_UA: Record<string, string> = {
    UNPAID: 'Не оплачено',
    PARTIALLY_PAID: 'Частково',
    PAID: 'Оплачено',
  }

  // ─── Експорт ────────────────────────────────────────────
  async function exportDocx() {
    if (!data) return
    exporting = true
    try {
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        Table,
        TableRow,
        TableCell,
        AlignmentType,
        HeadingLevel,
        BorderStyle,
        WidthType,
        ShadingType,
        VerticalAlign,
      } = await import('docx')

      const s = data.summary
      const borderLight = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: 'DDDDDD',
      }
      const cellBorders = {
        top: borderLight,
        bottom: borderLight,
        left: borderLight,
        right: borderLight,
      }
      const headerBorders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: '2563EB' },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: '2563EB' },
        left: borderLight,
        right: borderLight,
      }

      const W = 14400 // A4 landscape content width DXA
      const colW = [
        W * 0.05,
        W * 0.11,
        W * 0.13,
        W * 0.09,
        W * 0.15,
        W * 0.11,
        W * 0.11,
        W * 0.11,
        W * 0.14,
      ].map(Math.round)

      function hCell(text: string, w: number) {
        return new TableCell({
          borders: headerBorders,
          width: { size: w, type: WidthType.DXA },
          shading: { fill: '1E40AF', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text,
                  bold: true,
                  color: 'FFFFFF',
                  size: 18,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        })
      }

      function dCell(
        text: string,
        w: number,
        right = false,
        bold = false,
        color = '1F2937',
      ) {
        return new TableCell({
          borders: cellBorders,
          width: { size: w, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [
                new TextRun({ text, font: 'Arial', size: 18, bold, color }),
              ],
            }),
          ],
        })
      }

      const doc = new Document({
        styles: {
          default: { document: { run: { font: 'Arial', size: 20 } } },
          paragraphStyles: [
            {
              id: 'Heading1',
              name: 'Heading 1',
              basedOn: 'Normal',
              next: 'Normal',
              quickFormat: true,
              run: { size: 40, bold: true, font: 'Arial', color: '1E3A5F' },
              paragraph: {
                spacing: { before: 0, after: 160 },
                outlineLevel: 0,
              },
            },
            {
              id: 'Heading2',
              name: 'Heading 2',
              basedOn: 'Normal',
              next: 'Normal',
              quickFormat: true,
              run: { size: 26, bold: true, font: 'Arial', color: '1E40AF' },
              paragraph: {
                spacing: { before: 280, after: 140 },
                outlineLevel: 1,
              },
            },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                size: { width: 16838, height: 11906 },
                margin: { top: 900, right: 900, bottom: 900, left: 900 },
              },
            },
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [
                  new TextRun({
                    text: `Фінансовий звіт — ${periodLabel}`,
                    font: 'Arial',
                    size: 40,
                    bold: true,
                    color: '1E3A5F',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Сформовано: ${new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}`,
                    font: 'Arial',
                    size: 18,
                    color: '6B7280',
                    italics: true,
                  }),
                ],
                spacing: { after: 400 },
              }),

              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Зведені показники')],
              }),
              new Table({
                width: { size: W, type: WidthType.DXA },
                columnWidths: [W / 4, W / 4, W / 4, W / 4].map(Math.round),
                rows: [
                  new TableRow({
                    children: [
                      hCell('Дохід', W / 4),
                      hCell('Витрати', W / 4),
                      hCell('Зарплати', W / 4),
                      hCell('Чистий прибуток', W / 4),
                    ],
                  }),
                  new TableRow({
                    children: [
                      dCell(
                        `${fmt(s.totalRevenue)} ₴`,
                        W / 4,
                        true,
                        true,
                        '16A34A',
                      ),
                      dCell(
                        `${fmt(s.totalExpenses)} ₴`,
                        W / 4,
                        true,
                        true,
                        'DC2626',
                      ),
                      dCell(
                        `${fmt(s.totalPayroll)} ₴`,
                        W / 4,
                        true,
                        true,
                        '7C3AED',
                      ),
                      dCell(
                        `${fmt(s.profit)} ₴`,
                        W / 4,
                        true,
                        true,
                        s.profit >= 0 ? '16A34A' : 'DC2626',
                      ),
                    ],
                  }),
                  new TableRow({
                    children: [
                      hCell('Всього замовлень', W / 4),
                      hCell('Виконано', W / 4),
                      hCell('Скасовано', W / 4),
                      hCell('Середній чек', W / 4),
                    ],
                  }),
                  new TableRow({
                    children: [
                      dCell(String(s.totalOrders), W / 4, true, true),
                      dCell(
                        String(s.completedOrders),
                        W / 4,
                        true,
                        true,
                        '16A34A',
                      ),
                      dCell(
                        String(s.canceledOrders),
                        W / 4,
                        true,
                        true,
                        'DC2626',
                      ),
                      dCell(`${fmt(s.avgOrderValue)} ₴`, W / 4, true, true),
                    ],
                  }),
                ],
              }),

              new Paragraph({ children: [], spacing: { before: 400 } }),

              ...(data.topCustomers.length > 0
                ? [
                    new Paragraph({
                      heading: HeadingLevel.HEADING_2,
                      children: [new TextRun('Топ клієнти')],
                    }),
                    new Table({
                      width: { size: W, type: WidthType.DXA },
                      columnWidths: [W * 0.05, W * 0.5, W * 0.2, W * 0.25].map(
                        Math.round,
                      ),
                      rows: [
                        new TableRow({
                          children: [
                            hCell('#', W * 0.05),
                            hCell('Клієнт', W * 0.5),
                            hCell('Замовлень', W * 0.2),
                            hCell('Дохід', W * 0.25),
                          ],
                        }),
                        ...data.topCustomers.map(
                          (c, i) =>
                            new TableRow({
                              children: [
                                dCell(String(i + 1), W * 0.05, true),
                                dCell(c.name, W * 0.5),
                                dCell(String(c.orders), W * 0.2, true),
                                dCell(`${fmt(c.revenue)} ₴`, W * 0.25, true),
                              ],
                            }),
                        ),
                      ],
                    }),
                    new Paragraph({ children: [], spacing: { before: 400 } }),
                  ]
                : []),

              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Деталізація замовлень')],
              }),
              new Table({
                width: { size: W, type: WidthType.DXA },
                columnWidths: colW,
                rows: [
                  new TableRow({
                    children: [
                      hCell('№', colW[0]),
                      hCell('Дата', colW[1]),
                      hCell('Клієнт', colW[2]),
                      hCell('Статус', colW[3]),
                      hCell('Адреса', colW[4]),
                      hCell('Дохід ₴', colW[5]),
                      hCell('Витрати ₴', colW[6]),
                      hCell('ФОП ₴', colW[7]),
                      hCell('Клінери', colW[8]),
                    ],
                  }),
                  ...data.orders.map(
                    (o, i) =>
                      new TableRow({
                        children: [
                          dCell(String(i + 1), colW[0], true),
                          dCell(fmtDate(o.date), colW[1]),
                          dCell(o.customer, colW[2]),
                          dCell(STATUS_UA[o.status] ?? o.status, colW[3]),
                          dCell(o.address, colW[4]),
                          dCell(
                            fmt(o.revenue),
                            colW[5],
                            true,
                            false,
                            o.revenue > 0 ? '16A34A' : '6B7280',
                          ),
                          dCell(
                            fmt(o.expenses),
                            colW[6],
                            true,
                            false,
                            o.expenses > 0 ? 'DC2626' : '6B7280',
                          ),
                          dCell(
                            fmt(o.payroll),
                            colW[7],
                            true,
                            false,
                            o.payroll > 0 ? '7C3AED' : '6B7280',
                          ),
                          dCell(o.workers.join(', ') || '—', colW[8]),
                        ],
                      }),
                  ),
                  new TableRow({
                    children: [
                      dCell('', colW[0]),
                      dCell('', colW[1]),
                      dCell('', colW[2]),
                      dCell('', colW[3]),
                      dCell('РАЗОМ:', colW[4], false, true),
                      dCell(
                        fmt(data.orders.reduce((s, o) => s + o.revenue, 0)),
                        colW[5],
                        true,
                        true,
                        '16A34A',
                      ),
                      dCell(
                        fmt(data.orders.reduce((s, o) => s + o.expenses, 0)),
                        colW[6],
                        true,
                        true,
                        'DC2626',
                      ),
                      dCell(
                        fmt(data.orders.reduce((s, o) => s + o.payroll, 0)),
                        colW[7],
                        true,
                        true,
                        '7C3AED',
                      ),
                      dCell('', colW[8]),
                    ],
                  }),
                ],
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Документ сформовано системою ProClean CRM',
                    font: 'Arial',
                    size: 16,
                    color: '9CA3AF',
                    italics: true,
                  }),
                ],
                spacing: { before: 600 },
                alignment: AlignmentType.CENTER,
              }),
            ],
          },
        ],
      })

      // ✅ Packer.toBlob — правильний спосіб для браузера
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zvit-${periodLabel.replace(/\s/g, '-')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
      alert('Помилка експорту. Перевірте: npm install docx')
    } finally {
      exporting = false
    }
  }
</script>

<!-- ══ SPINNER ═══════════════════════════════════════════ -->
{#if loading}
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
  >
    <div class="relative">
      <div class="h-14 w-14 rounded-full border-4 border-muted"></div>
      <div
        class="absolute inset-0 h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent"
      ></div>
    </div>
    <p class="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
      Завантаження аналітики...
    </p>
  </div>
{/if}

<!-- ══ КОНТЕНТ ════════════════════════════════════════════ -->
<div class="space-y-6">
  <!-- ── Хедер ──────────────────────────────────────────── -->
  <div
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
  >
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Аналітика та фінанси</h1>
      <p class="text-sm text-muted-foreground mt-0.5">{periodLabel}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex rounded-lg border overflow-hidden shadow-sm">
        {#each [['week', 'Тиждень'], ['month', 'Місяць'], ['year', 'Рік']] as [val, label]}
          <button
            onclick={() => {
              period = val as any
              load()
            }}
            class="cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors
              {period === val
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted/60 text-muted-foreground'}">{label}</button
          >
        {/each}
      </div>

      {#if period !== 'week'}
        <div
          class="flex items-center gap-1 rounded-lg border overflow-hidden shadow-sm"
        >
          <button
            onclick={prevPeriod}
            class="cursor-pointer px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors"
            >←</button
          >
          <span class="px-2 text-xs font-medium min-w-[90px] text-center">
            {period === 'month' ? MONTHS_SHORT[month - 1] + ' ' + year : year}
          </span>
          <button
            onclick={nextPeriod}
            class="cursor-pointer px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors"
            >→</button
          >
        </div>
      {/if}

      <Button
        variant="outline"
        size="sm"
        class="h-8 cursor-pointer"
        onclick={load}
        disabled={loading}
      >
        <RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" />
      </Button>

      <Button
        size="sm"
        class="h-8 gap-1.5 cursor-pointer"
        onclick={exportDocx}
        disabled={exporting || !data}
      >
        <Download class="h-3.5 w-3.5" />
        {exporting ? 'Експорт...' : 'Завантажити звіт'}
      </Button>
    </div>
  </div>

  {#if data}
    <!-- ── KPI картки ─────────────────────────────────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {#each kpis as kpi}
        <div
          class="relative rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
        >
          <!-- Цветная полоска сверху -->
          <div
            class="absolute top-0 left-0 right-0 h-0.5 {kpi.accent} opacity-70 group-hover:opacity-100 transition-opacity"
          ></div>
          <div class="p-4 pt-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {kpi.label}
              </p>
              <div
                class="h-8 w-8 rounded-lg {kpi.bg} flex items-center justify-center"
              >
                <svelte:component this={kpi.icon} class="h-4 w-4 {kpi.color}" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums {kpi.color} leading-none">
              {kpi.value}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <!-- ── Графік ──────────────────────────────────────────── -->
    <Card.Root class="shadow-sm w-full">
      <Card.Header class="pb-2">
        <Card.Title class="text-base font-semibold flex items-center gap-2">
          <BarChart3 class="h-4 w-4 text-muted-foreground" />
          Динаміка доходів та витрат — {year} рік
        </Card.Title>
        <Card.Description>Дохід і витрати по місяцях</Card.Description>
      </Card.Header>
      <Card.Content class="px-2 sm:px-6">
        <Chart.Container config={chartConfig} class="h-72 w-full">
          <BarChart
            data={chartData}
            xScale={scaleBand().padding(0.2)}
            x="month"
            series={[
              {
                key: 'revenue',
                label: 'Дохід',
                color: chartConfig.revenue.color,
              },
              {
                key: 'expenses',
                label: 'Витрати',
                color: chartConfig.expenses.color,
              },
            ]}
            axis="x"
            rule={false}
            props={{
              bars: {
                stroke: 'none',
                radius: 4,
                rounded: 'top',
                motion: { type: 'tween', duration: 400, easing: cubicInOut },
              },
              highlight: { area: { fill: 'none' } },
              xAxis: { format: (d: string) => d },
            }}
          >
            {#snippet tooltip()}<Chart.Tooltip />{/snippet}
          </BarChart>
        </Chart.Container>
      </Card.Content>
      <Card.Footer>
        <div class="flex items-center gap-4 text-xs text-muted-foreground">
          <span class="flex items-center gap-1.5"
            ><span
              class="h-2.5 w-2.5 rounded-sm"
              style="background:var(--chart-1)"
            ></span>Дохід</span
          >
          <span class="flex items-center gap-1.5"
            ><span
              class="h-2.5 w-2.5 rounded-sm"
              style="background:var(--chart-2)"
            ></span>Витрати</span
          >
        </div>
      </Card.Footer>
    </Card.Root>

    <!-- ── Топ клієнти + статуси ──────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card.Root class="shadow-sm">
        <Card.Header class="pb-3">
          <Card.Title class="text-base font-semibold flex items-center gap-2">
            <Users class="h-4 w-4 text-muted-foreground" />Топ клієнти
          </Card.Title>
        </Card.Header>
        <Card.Content class="p-0">
          {#if data.topCustomers.length === 0}
            <p class="text-sm text-muted-foreground text-center py-8">
              Немає даних
            </p>
          {:else}
            <div class="divide-y">
              {#each data.topCustomers as c, i}
                <div
                  class="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                >
                  <span
                    class="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0"
                    >{i + 1}</span
                  >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">{c.name}</p>
                    <p class="text-xs text-muted-foreground">
                      {c.orders} замовлень
                    </p>
                  </div>
                  <span class="text-sm font-bold tabular-nums text-emerald-600"
                    >{fmt(c.revenue)} ₴</span
                  >
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <Card.Root class="shadow-sm">
        <Card.Header class="pb-3">
          <Card.Title class="text-base font-semibold flex items-center gap-2">
            <Calendar class="h-4 w-4 text-muted-foreground" />Статуси замовлень
          </Card.Title>
        </Card.Header>
        <Card.Content class="p-0">
          {@const total = data.summary.totalOrders || 1}
          <div class="divide-y">
            {#each [{ key: 'COMPLETED', label: 'Виконано', color: 'bg-emerald-400', text: 'text-emerald-700' }, { key: 'CONFIRMED', label: 'Підтверджено', color: 'bg-sky-400', text: 'text-sky-700' }, { key: 'PENDING', label: 'Нові', color: 'bg-amber-400', text: 'text-amber-700' }, { key: 'IN_PROGRESS', label: 'В роботі', color: 'bg-violet-400', text: 'text-violet-700' }, { key: 'CANCELED', label: 'Скасовано', color: 'bg-red-300', text: 'text-red-500' }] as row}
              {@const count = data.statusBreakdown[row.key] ?? 0}
              {@const pct = Math.round((count / total) * 100)}
              <div class="px-5 py-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full {row.color}"></span>
                    <span class="text-sm">{row.label}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">{pct}%</span>
                    <span class="text-sm font-bold tabular-nums {row.text}"
                      >{count}</span
                    >
                  </div>
                </div>
                <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full {row.color} transition-all duration-700"
                    style="width:{pct}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- ── Таблиця замовлень ───────────────────────────────── -->
    <Card.Root class="shadow-sm overflow-hidden">
      <Card.Header class="pb-3">
        <Card.Title class="text-base font-semibold"
          >Деталізація замовлень</Card.Title
        >
        <Card.Description
          >{data.orders.length} замовлень за період</Card.Description
        >
      </Card.Header>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b"
            >
              <th class="text-left px-4 py-3 font-semibold">Дата</th>
              <th class="text-left px-4 py-3 font-semibold">Клієнт</th>
              <th class="text-left px-4 py-3 font-semibold">Статус</th>
              <th class="text-left px-4 py-3 font-semibold">Оплата</th>
              <th class="text-right px-4 py-3 font-semibold">Дохід</th>
              <th class="text-right px-4 py-3 font-semibold">Витрати</th>
              <th class="text-right px-4 py-3 font-semibold">ФОП</th>
              <th class="text-right px-4 py-3 font-semibold">Клінери</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each data.orders as o}
              <tr
                class="hover:bg-muted/30 transition-colors cursor-pointer group"
                onclick={() => {
                  window.location.href = `/orders/${o.id}`
                }}
              >
                <td
                  class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
                  >{fmtDate(o.date)}</td
                >
                <td
                  class="px-4 py-3 font-medium truncate max-w-[140px] group-hover:text-primary transition-colors"
                  >{o.customer}</td
                >
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
                    {o.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                      : o.status === 'CANCELED'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30'
                        : o.status === 'IN_PROGRESS'
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30'
                          : o.status === 'CONFIRMED'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30'}"
                  >
                    {STATUS_UA[o.status] ?? o.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs font-medium
                    {o.paymentStatus === 'PAID'
                      ? 'text-emerald-600'
                      : o.paymentStatus === 'PARTIALLY_PAID'
                        ? 'text-amber-600'
                        : 'text-red-500'}"
                  >
                    {PAYMENT_UA[o.paymentStatus] ?? o.paymentStatus}
                  </span>
                </td>
                <td
                  class="px-4 py-3 text-right font-bold tabular-nums {o.revenue >
                  0
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'}"
                >
                  {o.revenue > 0 ? fmt(o.revenue) + ' ₴' : '—'}
                </td>
                <td
                  class="px-4 py-3 text-right tabular-nums {o.expenses > 0
                    ? 'text-red-500'
                    : 'text-muted-foreground'}"
                >
                  {o.expenses > 0 ? fmt(o.expenses) + ' ₴' : '—'}
                </td>
                <td
                  class="px-4 py-3 text-right tabular-nums {o.payroll > 0
                    ? 'text-violet-600'
                    : 'text-muted-foreground'}"
                >
                  {o.payroll > 0 ? fmt(o.payroll) + ' ₴' : '—'}
                </td>
                <td class="px-4 py-3 text-right text-xs text-muted-foreground">
                  {o.workers.length > 0
                    ? o.workers.map((w) => w.split(' ')[0]).join(', ')
                    : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="bg-muted/50 font-bold text-sm border-t-2">
              <td class="px-4 py-3 text-muted-foreground" colspan="4"
                >Разом за період</td
              >
              <td class="px-4 py-3 text-right tabular-nums text-emerald-600">
                {fmt(data.orders.reduce((s, o) => s + o.revenue, 0))} ₴
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-red-500">
                {fmt(data.orders.reduce((s, o) => s + o.expenses, 0))} ₴
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-violet-600">
                {fmt(data.orders.reduce((s, o) => s + o.payroll, 0))} ₴
              </td>
              <td class="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card.Root>
  {:else if !loading}
    <div class="rounded-xl border bg-card p-16 text-center">
      <BarChart3 class="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
      <p class="text-muted-foreground">Немає даних за вибраний період</p>
    </div>
  {/if}
</div>
