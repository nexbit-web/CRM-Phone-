<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import Calendar from '$lib/components/ui/calendar/calendar.svelte'
  import * as Popover from '$lib/components/ui/popover/index.js'
  import {
    ArrowLeft,
    Save,
    Calendar as CalendarIcon,
    User,
    MapPin,
    Banknote,
    StickyNote,
    Search,
    UserPlus,
    X,
    Check,
    Sparkles,
    UserCheck,
    ChevronRight,
    ChevronDown,
    AlertCircle,
    Hash,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import toast from 'svelte-hot-french-toast'
  import { onMount, tick } from 'svelte'
  import { getLocalTimeZone, today, CalendarDate } from '@internationalized/date'
  import type { DateValue } from '@internationalized/date'

  // ─── Типи ───────────────────────────────────────────────
  type Customer = {
    id: string
    name: string
    phone: string
    email?: string | null
    companyName?: string | null
  }
  type Cleaner = { id: string; name: string }

  // ─── Стан форми ─────────────────────────────────────────
  let selectedCustomer = $state<Customer | null>(null)
  let customerSearch = $state('')
  let customers = $state<Customer[]>([])
  let searchLoading = $state(false)
  let searchOpen = $state(false)
  let searchTimeout: ReturnType<typeof setTimeout>

  let cleaners = $state<Cleaner[]>([])
  let cleanerId = $state('')
  let address = $state('')

  // Дата як CalendarDate з @internationalized/date
  let scheduledDate = $state<DateValue | undefined>(today(getLocalTimeZone()))
  let calendarOpen = $state(false)
  let scheduledTime = $state('09:00')

  let cleaningType = $state('REGULAR')
  let notes = $state('')
  let totalAmount = $state<number | ''>('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  // ─── Форматування дати для кнопки ───────────────────────
  function formatDate(val: DateValue | undefined): string {
    if (!val) return 'Оберіть дату'
    const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
    return `${val.day} ${months[val.month - 1]} ${val.year}`
  }

  // ─── Валідація ──────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {}
    if (!selectedCustomer) e.customer = 'Оберіть клієнта'
    if (!address.trim() || address.trim().length < 5)
      e.address = 'Вкажіть адресу (мін. 5 символів)'
    if (!scheduledDate) e.date = 'Оберіть дату'
    if (totalAmount !== '' && Number(totalAmount) < 0)
      e.totalAmount = "Сума не може бути від'ємною"
    errors = e
    return Object.keys(e).length === 0
  }

  // ─── Пошук клієнтів ─────────────────────────────────────
  async function onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    customerSearch = val
    selectedCustomer = null
    clearTimeout(searchTimeout)
    if (!val.trim()) {
      customers = []
      searchOpen = false
      return
    }
    searchTimeout = setTimeout(async () => {
      searchLoading = true
      searchOpen = true
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        if (data.success) customers = data.customers
      } finally {
        searchLoading = false
      }
    }, 250)
  }

  function selectCustomer(c: Customer) {
    selectedCustomer = c
    customerSearch = ''
    searchOpen = false
    customers = []
    errors = { ...errors, customer: '' }
  }

  function clearCustomer() {
    selectedCustomer = null
    customerSearch = ''
    customers = []
    searchOpen = false
  }

  // ─── Завантаження ───────────────────────────────────────
  onMount(async () => {
    const res = await fetch('/api/cleaners')
    const data = await res.json()
    if (data.success) cleaners = data.cleaners

    const autoQ = $page.url.searchParams.get('q')
    if (autoQ) {
      customerSearch = autoQ
      searchLoading = true
      try {
        const r = await fetch(`/api/customers?q=${encodeURIComponent(autoQ)}`)
        const d = await r.json()
        if (d.success && d.customers.length === 1) {
          selectCustomer(d.customers[0])
        } else if (d.success && d.customers.length > 1) {
          customers = d.customers
          searchOpen = true
        }
      } finally {
        searchLoading = false
      }
    }
  })

  // ─── Збереження ─────────────────────────────────────────
  async function createOrder() {
    if (!validate()) {
      await tick()
      document
        .querySelector('[data-error]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    loading = true

    // Конвертуємо CalendarDate → JS Date з урахуванням часового поясу
    const tz = getLocalTimeZone()
    const baseDate = scheduledDate!.toDate(tz)
    const [h, m] = scheduledTime.split(':').map(Number)
    baseDate.setHours(h, m, 0, 0)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: selectedCustomer!.name,
          customerPhone: selectedCustomer!.phone,
          address: address.trim(),
          scheduledDate: baseDate.toISOString(),
          cleaningType,
          notes: notes.trim(),
          totalAmount: totalAmount === '' ? 0 : Number(totalAmount),
          cleanerId: cleanerId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Замовлення створено!')
        goto('/orders')
      } else {
        toast.error(data.error || 'Не вдалося створити замовлення')
      }
    } catch {
      toast.error('Помилка підключення до сервера')
    } finally {
      loading = false
    }
  }

  const cleaningTypes = [
    { value: 'REGULAR', label: 'Підтримуюча уборка' },
    { value: 'GENERAL', label: 'Генеральна уборка' },
    { value: 'AFTER_REPAIR', label: 'Після ремонту' },
    { value: 'OFFICE', label: 'Офісна уборка' },
    { value: 'DEEP_CLEAN', label: 'Глибоке прибирання' },
    { value: 'CARPET', label: 'Хімчистка меблів та килимів' },
    { value: 'WINDOW', label: 'Миття вікон' },
    { value: 'OTHER', label: 'Інше' },
  ]

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }
</script>

<!-- ══ ТОП-БАР ═══════════════════════════════════════════ -->
<div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="flex h-14 items-center justify-between gap-4">
      <div class="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onclick={() => goto('/orders')}
          class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Замовлення</span>
        </button>
        <ChevronRight class="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <span class="font-semibold text-foreground truncate">Нове замовлення</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-muted-foreground"
          onclick={() => goto('/orders')}
        >
          <X class="h-3.5 w-3.5 mr-1" />Скасувати
        </Button>
        <Button size="sm" class="h-8 min-w-36" onclick={createOrder} disabled={loading}>
          {#if loading}
            <span class="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5"></span>
            Створення...
          {:else}
            <Save class="h-3.5 w-3.5 mr-1.5" />Створити замовлення
          {/if}
        </Button>
      </div>
    </div>
  </div>
</div>

<!-- ══ ФОРМА ══════════════════════════════════════════════ -->
<div class="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-1">
  <!-- Заголовок -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <Hash class="h-3.5 w-3.5" />
      <span>Нове замовлення</span>
    </div>
    <h1 class="text-xl font-semibold">Створення замовлення</h1>
    <p class="text-sm text-muted-foreground mt-1">
      Заповніть обов'язкові поля, позначені <span class="text-destructive">*</span>
    </p>
  </div>

  <!-- ── КЛІЄНТ ── -->
  <section>
    <div class="flex items-center gap-2 py-2 mb-1">
      <User class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Клієнт <span class="text-destructive">*</span>
      </span>
      {#if errors.customer}
        <span class="ml-auto flex items-center gap-1 text-xs text-destructive" data-error>
          <AlertCircle class="h-3 w-3" />{errors.customer}
        </span>
      {/if}
    </div>

    {#if selectedCustomer}
      <div class="rounded-lg border bg-card p-3 flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-primary/20">
          {getInitials(selectedCustomer.name)}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold">{selectedCustomer.name}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{selectedCustomer.phone}</p>
          {#if selectedCustomer.companyName}
            <p class="text-xs text-muted-foreground/60">{selectedCustomer.companyName}</p>
          {/if}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-0.5 font-medium">
            <Check class="h-3 w-3" />Обрано
          </span>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={clearCustomer}>
            <X class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    {:else}
      <div class="rounded-lg border bg-card p-3 space-y-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            class="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {errors.customer ? 'border-destructive focus-visible:ring-destructive' : ''}"
            placeholder="Ім'я або номер телефону..."
            value={customerSearch}
            oninput={onSearchInput}
            onfocus={() => { if (customerSearch && customers.length) searchOpen = true }}
            onblur={() => setTimeout(() => (searchOpen = false), 200)}
            autocomplete="off"
          />
          {#if customerSearch}
            <button
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onclick={clearCustomer}
            >
              <X class="h-3.5 w-3.5" />
            </button>
          {/if}

          {#if searchOpen}
            <div class="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
              {#if searchLoading}
                <div class="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span class="h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></span>
                  Пошук...
                </div>
              {:else if customers.length === 0}
                <div class="px-4 py-3 space-y-2 text-center">
                  <p class="text-xs text-muted-foreground">Клієнта не знайдено</p>
                  <button
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    onmousedown={() => goto(`/clients/new?return=/orders/new&name=${encodeURIComponent(customerSearch)}`)}
                  >
                    <UserPlus class="h-3.5 w-3.5" />Створити нового клієнта
                  </button>
                </div>
              {:else}
                <div class="max-h-56 overflow-y-auto">
                  {#each customers as c}
                    <button
                      class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors border-b last:border-0"
                      onmousedown={() => selectCustomer(c)}
                    >
                      <div class="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{c.name}</p>
                        <p class="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      {#if c.companyName}
                        <span class="text-xs text-muted-foreground/50 truncate max-w-[90px]">{c.companyName}</span>
                      {/if}
                      <ChevronRight class="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    </button>
                  {/each}
                </div>
                <div class="px-3 py-2 border-t bg-muted/20">
                  <button
                    class="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    onmousedown={() => goto(`/clients/new?return=/orders/new&name=${encodeURIComponent(customerSearch)}`)}
                  >
                    <UserPlus class="h-3.5 w-3.5" />Створити нового клієнта
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <p class="text-xs text-muted-foreground">
          Введіть ім'я або телефон. Клієнта немає?
          <button
            class="text-primary underline underline-offset-2 hover:no-underline"
            onclick={() => goto('/clients/new?return=/orders/new')}
          >
            Створити нового
          </button>
        </p>
      </div>
    {/if}
  </section>

  <!-- ── АДРЕСА ── -->
  <section class="pt-4">
    <div class="flex items-center gap-2 py-2 mb-1">
      <MapPin class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Адреса <span class="text-destructive">*</span>
      </span>
      {#if errors.address}
        <span class="ml-auto flex items-center gap-1 text-xs text-destructive" data-error>
          <AlertCircle class="h-3 w-3" />{errors.address}
        </span>
      {/if}
    </div>
    <div class="rounded-lg border bg-card p-3">
      <div class="relative">
        <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          class="pl-9 h-9 text-sm {errors.address ? 'border-destructive focus-visible:ring-destructive' : ''}"
          bind:value={address}
          placeholder="вул. Хрещатик, 22, кв. 45"
          oninput={() => (errors = { ...errors, address: '' })}
        />
      </div>
    </div>
  </section>

  <!-- ── ДАТА І ЧАС ── -->
  <section class="pt-4">
    <div class="flex items-center gap-2 py-2 mb-1">
      <CalendarIcon class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Дата та час <span class="text-destructive">*</span>
      </span>
      {#if errors.date}
        <span class="ml-auto flex items-center gap-1 text-xs text-destructive" data-error>
          <AlertCircle class="h-3 w-3" />{errors.date}
        </span>
      {/if}
    </div>
    <div class="rounded-lg border bg-card p-3">
      <div class="grid grid-cols-2 gap-3">
        <!-- DATE PICKER з shadcn-svelte Calendar + Popover -->
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Дата</Label>
          <Popover.Root bind:open={calendarOpen}>
            <Popover.Trigger>
              {#snippet child({ props })}
                <Button
                  {...props}
                  variant="outline"
                  class="w-full justify-between font-normal h-9 text-sm {errors.date ? 'border-destructive' : ''} {!scheduledDate ? 'text-muted-foreground' : ''}"
                >
                  <span class="flex items-center gap-2">
                    <CalendarIcon class="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(scheduledDate)}
                  </span>
                  <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              {/snippet}
            </Popover.Trigger>
            <Popover.Content class="w-auto overflow-hidden p-0" align="start">
              <Calendar
                type="single"
                bind:value={scheduledDate}
                onValueChange={() => {
                  calendarOpen = false
                  errors = { ...errors, date: '' }
                }}
                captionLayout="dropdown"
              />
            </Popover.Content>
          </Popover.Root>
        </div>

        <!-- TIME INPUT -->
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Час початку</Label>
          <Input
            type="time"
            bind:value={scheduledTime}
            class="h-9 text-sm appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ── ТИП ТА СУМА ── -->
  <section class="pt-4">
    <div class="flex items-center gap-2 py-2 mb-1">
      <Sparkles class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Тип та вартість</span>
    </div>
    <div class="rounded-lg border bg-card p-3 space-y-3">
      <div class="space-y-1.5">
        <Label class="text-xs text-muted-foreground">Тип прибирання</Label>
        <select
          bind:value={cleaningType}
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {#each cleaningTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs text-muted-foreground">Сума (₴)</Label>
        <div class="relative">
          <Banknote class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="number"
            min="0"
            step="50"
            class="pl-9 h-9 text-sm {errors.totalAmount ? 'border-destructive' : ''}"
            bind:value={totalAmount}
            placeholder="0"
            oninput={() => (errors = { ...errors, totalAmount: '' })}
          />
        </div>
        {#if errors.totalAmount}
          <p class="text-xs text-destructive flex items-center gap-1" data-error>
            <AlertCircle class="h-3 w-3" />{errors.totalAmount}
          </p>
        {/if}
      </div>
    </div>
  </section>

  <!-- ── КЛІНЕР ── -->
  <section class="pt-4">
    <div class="flex items-center gap-2 py-2 mb-1">
      <UserCheck class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Клінер</span>
      <span class="ml-auto text-xs text-muted-foreground/60">необов'язково</span>
    </div>
    <div class="rounded-lg border bg-card p-3">
      {#if cleaners.length === 0}
        <p class="text-xs text-muted-foreground italic">Немає доступних клінерів. Призначте пізніше.</p>
      {:else}
        <select
          bind:value={cleanerId}
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Без клінера —</option>
          {#each cleaners as cl}
            <option value={cl.id}>{cl.name}</option>
          {/each}
        </select>
      {/if}
    </div>
  </section>

  <!-- ── НОТАТКИ ── -->
  <section class="pt-4">
    <div class="flex items-center gap-2 py-2 mb-1">
      <StickyNote class="h-3.5 w-3.5 text-muted-foreground/60" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Нотатки</span>
      <span class="ml-auto text-xs text-muted-foreground/60">необов'язково</span>
    </div>
    <div class="rounded-lg border bg-card p-3">
      <Textarea
        bind:value={notes}
        placeholder="Особливі побажання, деталі доступу, тварини в квартирі..."
        rows={3}
        class="text-sm resize-none border-0 p-0 focus-visible:ring-0 bg-transparent shadow-none"
      />
    </div>
  </section>

  <!-- ── ПІДСУМОК і КНОПКА ── -->
  <div class="pt-6 pb-8">
    <div class="rounded-lg border bg-muted/30 p-4 mb-4 space-y-2">
      <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Підсумок</p>
      <div class="grid grid-cols-2 gap-y-2 text-sm">
        <span class="text-muted-foreground">Клієнт</span>
        <span class="font-medium text-right">{selectedCustomer?.name ?? '—'}</span>
        <span class="text-muted-foreground">Адреса</span>
        <span class="font-medium text-right truncate">{address || '—'}</span>
        <span class="text-muted-foreground">Дата</span>
        <span class="font-medium text-right">{formatDate(scheduledDate)}, {scheduledTime}</span>
        <span class="text-muted-foreground">Сума</span>
        <span class="font-semibold text-right">
          {totalAmount === '' ? '0' : Number(totalAmount).toLocaleString('uk-UA')} ₴
        </span>
      </div>
    </div>

    <Button class="w-full h-10 text-sm" onclick={createOrder} disabled={loading}>
      {#if loading}
        <span class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
        Створення замовлення...
      {:else}
        <Save class="h-4 w-4 mr-2" />
        Створити замовлення
      {/if}
    </Button>
  </div>
</div>