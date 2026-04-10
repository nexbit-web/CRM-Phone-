<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import * as Table from '$lib/components/ui/table'
  import * as Select from '$lib/components/ui/select'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import {
    Plus,
    Search,
    X,
    Calendar,
    User,
    MapPin,
    AlertCircle,
    Ban,
    ClipboardList,
    RefreshCw,
    Hourglass,
    Sparkles,
    Wrench,
    CheckCircle2,
  } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import { Spinner } from '$lib/components/ui/spinner/index.js'

  // ─── Типи ───────────────────────────────────────────────
  type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELED'

  type Order = {
    id: string
    scheduledDate: string
    status: OrderStatus
    totalAmount: unknown // ✅ було: string | number — Prisma повертає Decimal
    customer: { name: string; phone: string }
    property: { address?: string; street?: string; city: string }
    cleaner?: { name: string }
    workers?: Array<{ user: { name: string } }>
    items: Array<{ service: { name: string }; qty: number }>
  }

  // ─── Стан ───────────────────────────────────────────────
  let orders = $state<Order[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let search = $state('')
  let statusFilter = $state<string>('ALL')

  // ─── Статуси ────────────────────────────────────────────
  const statusConfig: Record<
    OrderStatus,
    { label: string; icon: any; class: string; dot: string }
  > = {
    PENDING: {
      label: 'Нове',
      icon: Hourglass,
      class:
        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    CONFIRMED: {
      label: 'Підтверджено',
      icon: CheckCircle2,
      class:
        'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
      dot: 'bg-blue-500',
    },
    IN_PROGRESS: {
      label: 'В роботі',
      icon: Wrench,
      class:
        'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
      dot: 'bg-violet-500',
    },
    COMPLETED: {
      label: 'Виконано',
      icon: Sparkles,
      class:
        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    },
    CANCELED: {
      label: 'Скасовано',
      icon: Ban,
      class:
        'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
      dot: 'bg-red-500',
    },
  }

  const statusOptions = [
    { value: 'ALL', label: 'Всі статуси' },
    { value: 'PENDING', label: 'Нові' },
    { value: 'CONFIRMED', label: 'Підтверджені' },
    { value: 'IN_PROGRESS', label: 'В роботі' },
    { value: 'COMPLETED', label: 'Виконані' },
    { value: 'CANCELED', label: 'Скасовані' },
  ]

  const currentStatusLabel = $derived(
    statusOptions.find((s) => s.value === statusFilter)?.label ?? 'Всі статуси',
  )

  // ─── Загрузка даних ─────────────────────────────────────
  async function loadOrders() {
    try {
      loading = true
      error = null
      const res = await fetch('/api/orders')
      const data = await res.json()
      if (data.success) {
        orders = data.orders
      } else {
        error = data.error || 'Не вдалося завантажити замовлення'
      }
    } catch (err) {
      error = 'Помилка підключення до сервера'
      console.error(err)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadOrders()
  })

  // ─── Фільтрація ─────────────────────────────────────────
  const filteredOrders = $derived(
    orders.filter((order) => {
      const q = search.toLowerCase()
      const matchesSearch =
        order.customer.name.toLowerCase().includes(q) ||
        (order.property.street ?? order.property.address ?? '')
          .toLowerCase()
          .includes(q) ||
        order.customer.phone.includes(q)
      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter
      return matchesSearch && matchesStatus
    }),
  )

  // ─── Хелпери ────────────────────────────────────────────

  // ✅ було: amount: string | number — тепер unknown бо Prisma Decimal
  function formatAmount(amount: unknown): string {
    const num = parseFloat(String(amount))
    if (isNaN(num)) return '0'
    return num.toLocaleString('uk-UA', { minimumFractionDigits: 0 })
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
</script>

<!-- ─── FULLSCREEN SPINNER ─────────────────────────────── -->

<!-- ─── ОСНОВНИЙ КОНТЕНТ ───────────────────────────────── -->

<div class="mx-auto max-w-screen-2xl px-1 py-8 sm:px-6 lg:px-8 space-y-6">
  {#if loading}
    <div class="absolute inset-0 z-50 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <Spinner class="h-8 w-8" />
        <p class="text-sm font-medium text-muted-foreground">
          Завантаження замовлень...
        </p>
      </div>
    </div>
  {/if}
  <div class="flex flex-col gap-4">
    <!-- Рядок 1: заголовок + кнопки -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight leading-none">
          Замовлення
          {#if !loading}
            <span class="ml-1 text-base font-normal text-muted-foreground">
              ({filteredOrders.length})
            </span>
          {/if}
        </h1>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          class="h-9"
          onclick={loadOrders}
          disabled={loading}
        >
          <RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
        </Button>
        <Button href="/orders/new" size="sm" class="h-9">
          <Plus class="h-4 w-4" />
          <span>Нове</span>
        </Button>
      </div>
    </div>

    <!-- Рядок 2: пошук + фільтр -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div class="relative flex-1">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder="Пошук за клієнтом, телефоном або адресою..."
          bind:value={search}
          class="h-9 pl-9 pr-9"
        />
        {#if search}
          <button
            onclick={() => (search = '')}
            class="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X class="h-4 w-4" />
          </button>
        {/if}
      </div>
      <Select.Root type="single" bind:value={statusFilter}>
        <Select.Trigger class="h-9 w-full sm:w-44">
          {currentStatusLabel}
        </Select.Trigger>
        <Select.Content>
          {#each statusOptions as option (option.value)}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- ── Стан помилки ── -->
  {#if error}
    <div
      class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-6 text-center"
    >
      <AlertCircle class="mx-auto h-8 w-8 text-red-500 mb-2" />
      <p class="font-medium text-red-700 dark:text-red-400">{error}</p>
      <Button variant="outline" size="sm" class="mt-3" onclick={loadOrders}>
        Спробувати знову
      </Button>
    </div>

    <!-- ── Порожній стан ── -->
  {:else if !loading && filteredOrders.length === 0}
    <div class="rounded-xl border bg-card p-16 text-center shadow-sm">
      <ClipboardList class="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
      <p class="text-lg font-semibold">
        {search || statusFilter !== 'ALL'
          ? 'Нічого не знайдено'
          : 'Замовлень ще немає'}
      </p>
      <p class="text-sm text-muted-foreground mt-1">
        {search || statusFilter !== 'ALL'
          ? 'Спробуйте змінити фільтри або пошуковий запит'
          : 'Створіть перше замовлення, натиснувши кнопку вище'}
      </p>
      {#if search || statusFilter !== 'ALL'}
        <Button
          variant="outline"
          size="sm"
          class="mt-4"
          onclick={() => {
            search = ''
            statusFilter = 'ALL'
          }}
        >
          Скинути фільтри
        </Button>
      {/if}
    </div>

    <!-- ── Таблиця (десктоп) ── -->
  {:else if !loading}
    <div
      class="hidden lg:block rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50 hover:bg-muted/50">
            <Table.Head class="font-semibold text-foreground pl-5"
              >Дата та час</Table.Head
            >
            <Table.Head class="font-semibold text-foreground">Клієнт</Table.Head
            >
            <Table.Head class="font-semibold text-foreground"
              >Послуги</Table.Head
            >
            <Table.Head class="font-semibold text-foreground">Статус</Table.Head
            >
            <Table.Head class="font-semibold text-foreground">Клінер</Table.Head
            >
            <Table.Head class="font-semibold text-foreground text-right pr-5"
              >Сума</Table.Head
            >
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {#each filteredOrders as order (order.id)}
            {@const cfg = statusConfig[order.status] ?? statusConfig.PENDING}
            <!-- ✅ Весь рядок клікабельний -->
            <Table.Row
              class="group hover:bg-muted/30 transition-colors cursor-pointer"
              onclick={() => goto(`/orders/${order.id}`)}
            >
              <Table.Cell class="pl-5">
                <div class="flex items-start gap-2">
                  <Calendar
                    class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                  />
                  <div>
                    <p class="font-medium text-sm">
                      {format(new Date(order.scheduledDate), 'd MMM yyyy', {
                        locale: uk,
                      })}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {format(new Date(order.scheduledDate), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </Table.Cell>

              <Table.Cell>
                <div class="flex items-center gap-2.5">
                  <div
                    class="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    {getInitials(order.customer.name)}
                  </div>
                  <div>
                    <p class="font-medium text-sm leading-tight">
                      {order.customer.name}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {order.customer.phone}
                    </p>
                  </div>
                </div>
              </Table.Cell>

              <Table.Cell class=" ">
                <span class="text-sm text-muted-foreground truncate block">
                  {order.items.length > 0
                    ? order.items.map((i) => i.service.name).join(', ')
                    : '—'}
                </span>
              </Table.Cell>

              <Table.Cell>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {cfg.class}"
                >
                  <span class="h-1.5 w-1.5 rounded-full {cfg.dot}"></span>
                  <svelte:component this={cfg.icon} class="h-3 w-3" />
                  {cfg.label}
                </span>
              </Table.Cell>

              <Table.Cell>
                {@const allCleaners = [
                  ...(order.workers?.map((w) => w.user) ?? []),
                  ...(order.cleaner && !order.workers?.length
                    ? [order.cleaner]
                    : []),
                ]}
                {#if allCleaners.length > 0}
                  <div class="flex items-center gap-2">
                    <div class="flex -space-x-2">
                      {#each allCleaners.slice(0, 3) as c}
                        <div
                          title={c.name}
                          class="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold ring-1 ring-border shrink-0"
                        >
                          {getInitials(c.name)}
                        </div>
                      {/each}
                      {#if allCleaners.length > 3}
                        <div
                          class="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground ring-1 ring-border shrink-0"
                        >
                          +{allCleaners.length - 3}
                        </div>
                      {/if}
                    </div>
                    {#if allCleaners.length === 1}
                      <span class="text-sm truncate max-w-[90px]"
                        >{allCleaners[0].name.split(' ')[0]}</span
                      >
                    {:else}
                      <span class="text-xs text-muted-foreground"
                        >{allCleaners.length} клінери</span
                      >
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs text-muted-foreground/50 italic"
                    >Клінера не додано</span
                  >
                {/if}
              </Table.Cell>

              <Table.Cell class="text-right pr-5">
                <span class="font-semibold tabular-nums">
                  {formatAmount(order.totalAmount)} ₴
                </span>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <!-- МОБІЛЬНИЙ — картки -->
    <div class="grid gap-3 lg:hidden">
      {#each filteredOrders as order (order.id)}
        {@const cfg = statusConfig[order.status] ?? statusConfig.PENDING}
        <!-- ✅ Картка клікабельна -->
        <div
          class="rounded-xl border bg-card shadow-sm p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
          onclick={() => goto(`/orders/${order.id}`)}
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div
                class="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0"
              >
                {getInitials(order.customer.name)}
              </div>
              <div>
                <p class="font-semibold text-sm">{order.customer.name}</p>
                <p class="text-xs text-muted-foreground">
                  {order.customer.phone}
                </p>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 {cfg.class}"
            >
              <span class="h-1.5 w-1.5 rounded-full {cfg.dot}"></span>
              <svelte:component this={cfg.icon} class="h-3 w-3" />
              {cfg.label}
            </span>
          </div>

          <div class="h-px bg-border"></div>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <Calendar class="h-3.5 w-3.5 shrink-0" />
              <span
                >{format(new Date(order.scheduledDate), 'd MMM, HH:mm', {
                  locale: uk,
                })}</span
              >
            </div>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <MapPin class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate"
                >{order.property.street ?? order.property.address ?? '—'}</span
              >
            </div>
            {#if order.cleaner?.name}
              <div class="flex items-center gap-1.5 text-muted-foreground">
                <User class="h-3.5 w-3.5 shrink-0" />
                <span>{order.cleaner.name}</span>
              </div>
            {/if}
            {#if order.items.length > 0}
              <div
                class="flex items-center gap-1.5 text-muted-foreground col-span-2"
              >
                <Sparkles class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate"
                  >{order.items.map((i) => i.service.name).join(', ')}</span
                >
              </div>
            {/if}
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-base font-bold"
              >{formatAmount(order.totalAmount)} ₴</span
            >
            <span class="text-xs text-muted-foreground"
              >Натисніть щоб відкрити →</span
            >
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
