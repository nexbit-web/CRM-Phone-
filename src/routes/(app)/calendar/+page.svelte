<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Button } from '$lib/components/ui/button'

  type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELED'

  type CalendarOrder = {
    id: string
    scheduledDate: string
    status: OrderStatus
    totalAmount: number
    customer: { name: string }
    property?: { street: string; city: string }
    cleaner?: { name: string } | null
  }

  const STATUS = {
    PENDING: {
      label: 'Нове',
      dotColor: '#FBBF24',
      pillBg: 'var(--cal-amber-bg)',
      pillText: 'var(--cal-amber-text)',
      pillBorder: 'var(--cal-amber-border)',
      pulse: false,
      strike: false,
    },
    CONFIRMED: {
      label: 'Підтверджено',
      dotColor: '#38BDF8',
      pillBg: 'var(--cal-sky-bg)',
      pillText: 'var(--cal-sky-text)',
      pillBorder: 'var(--cal-sky-border)',
      pulse: false,
      strike: false,
    },
    IN_PROGRESS: {
      label: 'В роботі',
      dotColor: '#A78BFA',
      pillBg: 'var(--cal-violet-bg)',
      pillText: 'var(--cal-violet-text)',
      pillBorder: 'var(--cal-violet-border)',
      pulse: true,
      strike: false,
    },
    COMPLETED: {
      label: 'Виконано',
      dotColor: '#34D399',
      pillBg: 'var(--cal-emerald-bg)',
      pillText: 'var(--cal-emerald-text)',
      pillBorder: 'var(--cal-emerald-border)',
      pulse: false,
      strike: false,
    },
    CANCELED: {
      label: 'Скасовано',
      dotColor: '#9CA3AF',
      pillBg: 'var(--cal-muted-bg)',
      pillText: 'var(--cal-muted-text)',
      pillBorder: 'var(--cal-muted-border)',
      pulse: false,
      strike: true,
    },
  } as const

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
  const MONTHS = [
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

  const now = new Date()
  let year = $state(now.getFullYear())
  let month = $state(now.getMonth())
  let orders = $state<CalendarOrder[]>([])
  let loading = $state(true)

  function prev() {
    if (month === 0) {
      month = 11
      year--
    } else month--
    load()
  }
  function next() {
    if (month === 11) {
      month = 0
      year++
    } else month++
    load()
  }
  function goToday() {
    year = now.getFullYear()
    month = now.getMonth()
    load()
  }

  async function load() {
    loading = true
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}`)
      const data = await res.json()
      if (data.success) orders = data.orders
    } finally {
      loading = false
    }
  }

  onMount(load)

  type Day = {
    n: number
    date: Date
    current: boolean
    today: boolean
    weekend: boolean
    orders: CalendarOrder[]
  }

  const grid = $derived.by((): Day[] => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    let dow = first.getDay() - 1
    if (dow < 0) dow = 6

    const days: Day[] = []

    for (let i = dow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({
        n: d.getDate(),
        date: d,
        current: false,
        today: false,
        weekend: d.getDay() === 0 || d.getDay() === 6,
        orders: [],
      })
    }

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d)
      const isToday =
        d === now.getDate() &&
        month === now.getMonth() &&
        year === now.getFullYear()
      const dayOrders = orders.filter((o) => {
        const od = new Date(o.scheduledDate)
        return (
          od.getFullYear() === year &&
          od.getMonth() === month &&
          od.getDate() === d
        )
      })
      days.push({
        n: d,
        date,
        current: true,
        today: isToday,
        weekend: date.getDay() === 0 || date.getDay() === 6,
        orders: dayOrders,
      })
    }

    let extra = 1
    while (days.length < 42) {
      const d = new Date(year, month + 1, extra++)
      days.push({
        n: d.getDate(),
        date: d,
        current: false,
        today: false,
        weekend: d.getDay() === 0 || d.getDay() === 6,
        orders: [],
      })
    }

    return days
  })

  function time(iso: string) {
    return new Date(iso).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const stats = $derived({
    total: orders.length,
    done: orders.filter((o) => o.status === 'COMPLETED').length,
    active: orders.filter((o) =>
      ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status),
    ).length,
  })
</script>

<div class="space-y-4 p-2 sm:p-3">
  <!-- Хедер -->
  <div class="flex items-center justify-between gap-2 flex-wrap">
    <div class="flex items-center gap-1.5">
      <Button
        onclick={prev}
        variant="outline"
        class="h-8 w-8 flex items-center justify-center  hover:bg-muted/50"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>

      <span
        class="text-sm font-semibold min-w-[120px] sm:min-w-[140px] text-center select-none"
      >
        {MONTHS[month]}
        {year}
      </span>

      <Button
        onclick={next}
        variant="outline"
        class="h-8 w-8 flex items-center justify-center  hover:bg-muted/50"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>

      <Button
        onclick={goToday}
        variant="outline"
        class="cursor-pointer h-8 px-3   border-input text-xs text-muted-foreground hover:bg-muted/50"
      >
        Сьогодні
      </Button>
    </div>

    <div class="flex items-center gap-2">
      {#if !loading && stats.total > 0}
        <div
          class="stats-block hidden md:flex items-center gap-3 text-xs text-muted-foreground"
        >
          <span class="tabular-nums">{stats.total} замовлень</span>
          {#if stats.active > 0}
            <span class="flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full shrink-0"
                style="background:#FBBF24"
              ></span>
              <span class="tabular-nums">{stats.active} активних</span>
            </span>
          {/if}
          {#if stats.done > 0}
            <span class="flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full shrink-0"
                style="background:#34D399"
              ></span>
              <span class="tabular-nums">{stats.done} виконано</span>
            </span>
          {/if}
        </div>
      {/if}

      <Button
        onclick={load}
        disabled={loading}
        variant="outline"
        class=" h-8 w-8     flex items-center justify-center   hover:bg-muted/50  "
      >
        <RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" />
      </Button>

      <Button
        onclick={() => goto('/orders/new')}
        class=" h-8 px-3 text-xs flex items-center gap-1"
      >
        <Plus />
        <span class="hidden sm:inline">Нове замовлення</span>
      </Button>
    </div>
  </div>

  <!-- Сітка -->
  <div class="rounded-xl border border-border overflow-hidden">
    <!-- Дні тижня -->
    <div
      style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr))"
      class="border-b bg-muted/30"
    >
      {#each WEEKDAYS as wd, i}
        <div
          class="py-2 text-center text-[10px] font-semibold uppercase tracking-widest select-none {i >=
          5
            ? 'text-red-500/60'
            : 'text-muted-foreground/50'}"
        >
          {wd}
        </div>
      {/each}
    </div>

    <!-- Клітинки -->
    <div
      style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:minmax(90px,auto)"
    >
      {#each grid as day, i}
        <div
          class="cal-cell group relative flex flex-col gap-1 p-2 border-b border-r transition-colors
            {i % 7 === 6 ? 'border-r-0' : ''}
            {i >= 35 ? 'border-b-0' : ''}
            {!day.current
            ? 'bg-muted/[0.02]'
            : 'bg-background hover:bg-muted/10'}
            {day.today ? '!bg-primary/[0.03]' : ''}"
        >
          <!-- Число -->
          <div class="flex items-center justify-between shrink-0">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full select-none
                {day.today
                ? 'bg-foreground text-background font-semibold text-xs'
                : ''}
                {!day.today && day.current && !day.weekend
                ? 'text-foreground/80 font-medium text-xs'
                : ''}
                {!day.today && day.current && day.weekend
                ? 'text-red-500/70 font-medium text-xs'
                : ''}
                {!day.current ? 'text-muted-foreground/25 text-[11px]' : ''}"
            >
              {day.n}
            </span>
            {#if day.current && day.orders.length > 0}
              <span
                class="text-[10px] text-muted-foreground/50 tabular-nums leading-none"
                >{day.orders.length}</span
              >
            {/if}
          </div>

          <!-- Замовлення -->
          {#if day.current}
            {#each day.orders.slice(0, 3) as order}
              {@const s = STATUS[order.status] ?? STATUS.PENDING}
              <button
                onclick={() => goto(`/orders/${order.id}`)}
                class="w-full p-0 bg-transparent border-0 cursor-pointer text-left"
              >
                <Badge
                  variant="outline"
                  class="order-badge {s.strike ? 'line-through' : ''}"
                  style="background:{s.pillBg};color:{s.pillText};border-color:{s.pillBorder}"
                >
                  <span
                    class="rounded-full shrink-0 {s.pulse ? 'dot-pulse' : ''}"
                    style="width:5px;height:5px;background:{s.dotColor};flex-shrink:0;display:inline-block"
                  ></span>
                  <span
                    class="badge-time font-medium tabular-nums shrink-0 leading-none whitespace-nowrap"
                  >
                    {time(order.scheduledDate)}
                  </span>
                  <span class="badge-name truncate leading-none">
                    {order.customer.name.split(' ')[0]}
                  </span>
                </Badge>
              </button>
            {/each}

            {#if day.orders.length > 3}
              <button
                onclick={() =>
                  goto(`/orders?date=${day.date.toISOString().slice(0, 10)}`)}
                class="cursor-pointer text-[10px] text-primary/60 font-medium hover:text-primary hover:underline text-left px-1 leading-3 bg-transparent border-0"
              >
                +{day.orders.length - 3} ще...
              </button>
            {/if}
          {/if}

          <!-- + при hover -->
          {#if day.current}
            <Button
              onclick={() => goto('/orders/new')}
              class="absolute top-1 right-1 h-5 w-5 rounded
                opacity-0 group-hover:opacity-100 transition-opacity
                flex items-center justify-center
                bg-transparent border-0 cursor-pointer
                text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
            >
              <Plus class="h-3 w-3" />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Легенда -->
  <div class="flex items-center gap-4 flex-wrap px-1">
    {#each Object.entries(STATUS) as [, s]}
      <div
        class="flex items-center gap-1.5 text-xs text-muted-foreground select-none"
      >
        <span
          class="h-2 w-2 rounded-full shrink-0"
          style="background:{s.dotColor}"
        ></span>
        {s.label}
      </div>
    {/each}
    <span class="ml-auto text-[10px] text-muted-foreground/40 hidden sm:block">
      Клік на замовлення → відкрити · + → нове замовлення
    </span>
  </div>
</div>
