<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import { Spinner } from '$lib/components/ui/spinner'

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
  }

  const STATUS: Record<
    OrderStatus,
    {
      label: string
      dot: string
      pill: string
      pulse: boolean
      dim: boolean
    }
  > = {
    PENDING: {
      label: 'Нове',
      dot: 'bg-amber-400',
      pill: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      pulse: false,
      dim: false,
    },
    CONFIRMED: {
      label: 'Підтверджено',
      dot: 'bg-sky-400',
      pill: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
      pulse: false,
      dim: false,
    },
    IN_PROGRESS: {
      label: 'В роботі',
      dot: 'bg-violet-500',
      pill: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
      pulse: true,
      dim: false,
    },
    COMPLETED: {
      label: 'Виконано',
      dot: 'bg-emerald-400',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      pulse: false,
      dim: false,
    },
    CANCELED: {
      label: 'Скасовано',
      dot: 'bg-slate-300',
      pill: 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800',
      pulse: false,
      dim: true,
    },
  }

  const WEEKDAYS_D = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
  const WEEKDAYS_M = ['П', 'В', 'С', 'Ч', 'П', 'С', 'Н']
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

  // ─── Перейти на /orders/new з датою у параметрі ─────────
  function newOrderOnDate(date: Date) {
    // Формат YYYY-MM-DD — щоб легко парсити на сторінці
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    goto(`/orders/new?date=${iso}`)
  }

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
      const dayOrders = orders
        .filter((o) => {
          const od = new Date(o.scheduledDate)
          return (
            od.getFullYear() === year &&
            od.getMonth() === month &&
            od.getDate() === d
          )
        })
        .sort(
          (a, b) =>
            new Date(a.scheduledDate).getTime() -
            new Date(b.scheduledDate).getTime(),
        )
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
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    active: orders.filter((o) =>
      ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status),
    ).length,
  })
</script>

<!-- ══ FULLSCREEN SPINNER ════════════════════════════════ -->
 <div class="flex flex-col gap-4">
  <!-- ══ ХЕДЕР ══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8 cursor-pointer"
          onclick={prev}
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span
          class="text-sm font-semibold min-w-[130px] text-center select-none tabular-nums"
        >
          {MONTHS[month]}
          {year}
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8 cursor-pointer"
          onclick={next}
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 px-3 text-xs cursor-pointer text-muted-foreground"
          onclick={goToday}
        >
          Сьогодні
        </Button>
      </div>

      <div class="flex items-center gap-2">
        {#if !loading && stats.total > 0}
          <div
            class="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-1"
          >
            <span class="tabular-nums">{stats.total} зам.</span>
            {#if stats.active > 0}
              <span class="flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                ></span>
                <span class="tabular-nums">{stats.active}</span>
              </span>
            {/if}
            {#if stats.completed > 0}
              <span class="flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"
                ></span>
                <span class="tabular-nums">{stats.completed}</span>
              </span>
            {/if}
          </div>
        {/if}

        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8 cursor-pointer"
          onclick={load}
          disabled={loading}
        >
          <RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" />
        </Button>

        <Button
          class="h-8 px-3 text-xs cursor-pointer gap-1.5"
          onclick={() => goto('/orders/new')}
        >
          <Plus class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Нове замовлення</span>
          <span class="sm:hidden">Нове</span>
        </Button>
      </div>
    </div>
{#if loading}
  <!-- Только лоадер, ничего больше не рендерится -->
  <div class="absolute inset-0 z-50 flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <Spinner class="h-8 w-8" />
      <p class="text-sm font-medium text-muted-foreground">Завантаження...</p>
    </div>
  </div>
{:else}
  
  

    <!-- ══ СІТКА ══════════════════════════════════════════════ -->
    <div class="rounded-xl border border-border overflow-hidden">
      <!-- Заголовки -->
      <div class="grid grid-cols-7 border-b bg-muted/30">
        {#each WEEKDAYS_D as wd, i}
          <div
            class="py-2.5 text-center select-none {i >= 5
              ? 'text-red-500/60'
              : 'text-muted-foreground/50'}"
          >
            <span
              class="hidden sm:block text-[10px] font-semibold uppercase tracking-widest"
              >{wd}</span
            >
            <span
              class="sm:hidden text-[10px] font-semibold uppercase tracking-widest"
              >{WEEKDAYS_M[i]}</span
            >
          </div>
        {/each}
      </div>

      <!-- Клітинки -->
      <div class="grid grid-cols-7" style="grid-auto-rows: minmax(80px, auto)">
        {#each grid as day, i}
          <div
            class="group relative flex flex-col p-1.5 sm:p-2 border-b border-r transition-colors gap-[3px]
          {i % 7 === 6 ? 'border-r-0' : ''}
          {i >= 35 ? 'border-b-0' : ''}
          {!day.current ? 'bg-muted/[0.03]' : 'bg-background hover:bg-muted/10'}
          {day.today ? '!bg-primary/[0.04]' : ''}"
          >
            <!-- Число -->
            <div class="flex items-start justify-between shrink-0 mb-0.5">
              <span
                class="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs select-none font-medium
              {day.today ? 'bg-foreground text-background font-bold' : ''}
              {!day.today && day.current && !day.weekend
                  ? 'text-foreground'
                  : ''}
              {!day.today && day.current && day.weekend
                  ? 'text-red-500/70'
                  : ''}
              {!day.current ? 'text-muted-foreground/25' : ''}"
              >
                {day.n}
              </span>
              {#if day.current && day.orders.length > 0}
                <span
                  class="text-[9px] sm:text-[10px] text-muted-foreground/40 tabular-nums leading-5 sm:leading-6 pr-0.5"
                >
                  {day.orders.length}
                </span>
              {/if}
            </div>

            <!-- ДЕСКТОП: таблетки -->
            {#if day.current}
              <div class="hidden sm:flex flex-col gap-[3px] flex-1 min-h-0">
                {#each day.orders.slice(0, 3) as order}
                  {@const s = STATUS[order.status] ?? STATUS.PENDING}
                  <button
                    onclick={() => goto(`/orders/${order.id}`)}
                    class="cursor-pointer w-full text-left rounded-[5px] border px-1.5 py-[3px] transition-all
                    hover:brightness-[0.94] hover:shadow-sm active:scale-[0.98]
                    {s.dim ? 'opacity-50 line-through' : ''}
                    {s.pill}"
                  >
                    <div class="flex items-center gap-1 leading-none">
                      <span
                        class="h-[5px] w-[5px] rounded-full shrink-0 {s.dot} {s.pulse
                          ? 'animate-pulse'
                          : ''}"
                      ></span>
                      <span
                        class="text-[11px] font-semibold tabular-nums shrink-0"
                        >{time(order.scheduledDate)}</span
                      >
                      <span class="text-[11px] truncate"
                        >{order.customer.name.split(' ')[0]}</span
                      >
                    </div>
                  </button>
                {/each}

                {#if day.orders.length > 3}
                  <button
                    onclick={() =>
                      goto(
                        `/orders?date=${day.date.toISOString().slice(0, 10)}`,
                      )}
                    class="cursor-pointer text-[10px] text-primary/60 font-medium hover:text-primary hover:underline text-left px-1 leading-4"
                  >
                    +{day.orders.length - 3} ще...
                  </button>
                {/if}
              </div>

              <!-- МОБІЛЬНИЙ: крапки -->
              <div class="sm:hidden flex flex-wrap gap-[3px] mt-0.5">
                {#each day.orders.slice(0, 6) as order}
                  {@const s = STATUS[order.status] ?? STATUS.PENDING}
                  <button
                    onclick={() => goto(`/orders/${order.id}`)}
                    class="cursor-pointer h-2 w-2 rounded-full transition-transform active:scale-75 {s.dot}
                    {s.dim ? 'opacity-40' : ''}
                    {s.pulse ? 'animate-pulse' : ''}"
                    title="{time(order.scheduledDate)} · {order.customer.name}"
                  ></button>
                {/each}
                {#if day.orders.length > 6}
                  <span class="text-[8px] text-muted-foreground/60 font-medium"
                    >+{day.orders.length - 6}</span
                  >
                {/if}
              </div>
            {/if}

            <!-- ✅ Кнопка + при hover → /orders/new?date=YYYY-MM-DD -->
            {#if day.current}
              <button
                onclick={() => newOrderOnDate(day.date)}
                class="cursor-pointer absolute top-1 right-1 h-5 w-5 rounded
                opacity-0 group-hover:opacity-100 transition-opacity
                items-center justify-center hidden sm:flex
                text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                title="Додати замовлення на {day.n} число"
              >
                <Plus class="h-3 w-3" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ══ ЛЕГЕНДА ════════════════════════════════════════════ -->
    <div class="flex items-center gap-3 sm:gap-4 flex-wrap px-1">
      {#each Object.entries(STATUS) as [, s]}
        <div
          class="flex items-center gap-1.5 text-xs text-muted-foreground select-none"
        >
          <span
            class="h-2 w-2 rounded-full shrink-0 {s.dot} {s.pulse
              ? 'animate-pulse'
              : ''}"
          ></span>
          <span class="hidden sm:inline">{s.label}</span>
          <span class="sm:hidden text-[10px]">{s.label.split(' ')[0]}</span>
        </div>
      {/each}
      <span
        class="ml-auto text-[10px] text-muted-foreground/40 hidden md:block"
      >
        Клік + → нове замовлення на цей день
      </span>
    </div>
 
{/if}
</div>