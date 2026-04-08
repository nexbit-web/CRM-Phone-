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
    Clock,
    Building2,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import toast from 'svelte-hot-french-toast'
  import { onMount, tick } from 'svelte'
  import { getLocalTimeZone, today } from '@internationalized/date'
  import type { DateValue } from '@internationalized/date'

  // ─── Типи ───────────────────────────────────────────────
  type Customer = {
    id: string
    name: string
    phone: string
    email?: string | null
  }
  type Cleaner = { id: string; name: string }
  type Property = {
    id: string
    street: string
    apt?: string | null
    floor?: number | null
    city: string
    area?: number | null
  }

  // ─── Стан ───────────────────────────────────────────────
  let selectedCustomer = $state<Customer | null>(null)
  let customerSearch = $state('')
  let customers = $state<Customer[]>([])
  let searchLoading = $state(false)
  let searchOpen = $state(false)
  let searchTimeout: ReturnType<typeof setTimeout>

  // Об'єкти нерухомості клієнта
  let customerProperties = $state<Property[]>([])
  let selectedPropertyId = $state<string>('') // '' = нова адреса
  let propertiesLoading = $state(false)

  let cleaners = $state<Cleaner[]>([])
  let cleanerId = $state('')
  let address = $state('') // пряме введення якщо немає збережених
  let city = $state('')
  let scheduledDate = $state<DateValue | undefined>(today(getLocalTimeZone()))
  let calendarOpen = $state(false)
  let scheduledTime = $state('09:00')
  let cleaningType = $state('REGULAR')
  let notes = $state('')
  let totalAmount = $state<number | ''>('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  // ─── Хелпери ────────────────────────────────────────────
  const MONTHS = [
    'січ',
    'лют',
    'бер',
    'кві',
    'тра',
    'чер',
    'лип',
    'сер',
    'вер',
    'жов',
    'лис',
    'гру',
  ]
  function formatDate(val: DateValue | undefined) {
    if (!val) return 'Оберіть дату'
    return `${val.day} ${MONTHS[val.month - 1]} ${val.year}`
  }
  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }
  function formatPropertyLabel(p: Property) {
    const parts = [p.street]
    if (p.apt) parts.push(`кв. ${p.apt}`)
    if (p.floor) parts.push(`${p.floor} пов.`)
    if (p.city) parts.push(p.city)
    return parts.join(', ')
  }

  const cleaningTypes = [
    { value: 'REGULAR', label: 'Підтримуюча' },
    { value: 'GENERAL', label: 'Генеральна' },
    { value: 'AFTER_REPAIR', label: 'Після ремонту' },
    { value: 'OFFICE', label: 'Офісна' },
    { value: 'DEEP_CLEAN', label: 'Глибоке' },
    { value: 'CARPET', label: 'Хімчистка' },
    { value: 'WINDOW', label: 'Вікна' },
    { value: 'OTHER', label: 'Інше' },
  ]

  const selectedCleanerName = $derived(
    cleaners.find((c) => c.id === cleanerId)?.name ?? '',
  )
  const selectedTypeName = $derived(
    cleaningTypes.find((t) => t.value === cleaningType)?.label ?? '',
  )
  const selectedProperty = $derived(
    customerProperties.find((p) => p.id === selectedPropertyId),
  )

  // Адреса для підсумку і відправки
  const effectiveAddress = $derived(
    selectedProperty
      ? formatPropertyLabel(selectedProperty)
      : [address, city].filter(Boolean).join(', '),
  )

  // ─── Валідація ──────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {}
    if (!selectedCustomer) e.customer = 'Оберіть клієнта'
    if (!selectedPropertyId && (!address.trim() || address.trim().length < 5))
      e.address = 'Мін. 5 символів'
    if (!scheduledDate) e.date = 'Оберіть дату'
    if (totalAmount !== '' && Number(totalAmount) < 0)
      e.totalAmount = "Від'ємна сума"
    errors = e
    return Object.keys(e).length === 0
  }

  // ─── Пошук клієнтів ─────────────────────────────────────
  async function onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    customerSearch = val
    selectedCustomer = null
    customerProperties = []
    selectedPropertyId = ''
    address = ''
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
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(val.trim())}`,
        )
        const data = await res.json()
        if (data.success) customers = data.customers
      } finally {
        searchLoading = false
      }
    }, 250)
  }

  // ─── Вибір клієнта → завантаження об'єктів ──────────────
  async function selectCustomer(c: Customer) {
    selectedCustomer = c
    customerSearch = ''
    searchOpen = false
    customers = []
    errors = { ...errors, customer: '' }

    // Завантажуємо об'єкти клієнта
    propertiesLoading = true
    selectedPropertyId = ''
    address = ''
    try {
      const res = await fetch(`/api/customers/${c.id}/properties`)
      const data = await res.json()
      if (data.success) {
        customerProperties = data.properties
        // Автоматично вибираємо першу адресу якщо вона одна
        if (data.properties.length === 1) {
          selectedPropertyId = data.properties[0].id
        }
      }
    } finally {
      propertiesLoading = false
    }
  }

  function clearCustomer() {
    selectedCustomer = null
    customerSearch = ''
    customers = []
    searchOpen = false
    customerProperties = []
    selectedPropertyId = ''
    address = ''
    city = ''
  }

  // ─── Завантаження даних ─────────────────────────────────
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
        if (d.success && d.customers.length === 1)
          await selectCustomer(d.customers[0])
        else if (d.success && d.customers.length > 1) {
          customers = d.customers
          searchOpen = true
        }
      } finally {
        searchLoading = false
      }
    }
  })

  // ─── Створення замовлення ───────────────────────────────
  async function createOrder() {
    if (!validate()) {
      await tick()
      document
        .querySelector('[data-error]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    loading = true
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
          // Передаємо або готовий propertyId або нову адресу
          ...(selectedPropertyId
            ? { propertyId: selectedPropertyId }
            : { street: address.trim(), city: city.trim() }),
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
      } else toast.error(data.error || 'Не вдалося створити замовлення')
    } catch {
      toast.error('Помилка підключення')
    } finally {
      loading = false
    }
  }
</script>

<!-- ══ STICKY ТОП-БАР ════════════════════════════════════ -->
<div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">
    <div class="flex h-14 items-center justify-between gap-4">
      <div class="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onclick={() => goto('/orders')}
          class="cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Замовлення</span>
        </button>
        <ChevronRight class="h-4 w-4 text-muted-foreground/30 shrink-0" />
        <span class="text-sm font-medium text-foreground truncate"
          >Нове замовлення</span
        >
      </div>
      <Button
        size="sm"
        class="h-8 gap-1.5 cursor-pointer"
        onclick={createOrder}
        disabled={loading}
      >
        {#if loading}
          <span
            class="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          ></span>
          Створення...
        {:else}
          <Save class="h-3.5 w-3.5" />Створити
        {/if}
      </Button>
    </div>
  </div>
</div>

<!-- ══ КОНТЕНТ ════════════════════════════════════════════ -->
<div class="mx-auto max-w-2xl px-4 sm:px-6 py-8">
  <div class="mb-8">
    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
      <Hash class="h-3 w-3" /><span>CRM / Замовлення / Нове</span>
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Нове замовлення</h1>
    <p class="text-sm text-muted-foreground mt-1">
      Поля з <span class="text-destructive font-medium">*</span> обов'язкові
    </p>
  </div>

  <div class="space-y-5">
    <!-- ════ КЛІЄНТ ════════════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-visible shadow-sm">
      <div
        class="flex items-center justify-between px-4 py-3 border-b bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <User class="h-3.5 w-3.5 text-muted-foreground" />
          <span
            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Клієнт <span class="text-destructive">*</span>
          </span>
        </div>
        {#if errors.customer}
          <span
            class="flex items-center gap-1 text-xs text-destructive font-medium"
            data-error
          >
            <AlertCircle class="h-3 w-3" />{errors.customer}
          </span>
        {/if}
      </div>
      <div class="p-4">
        {#if selectedCustomer}
          <div
            class="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
          >
            <div
              class="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0"
            >
              {getInitials(selectedCustomer.name)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-tight">
                {selectedCustomer.name}
              </p>
              <p class="text-xs text-muted-foreground mt-0.5">
                {selectedCustomer.phone}
              </p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span
                class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
              >
                <Check class="h-3 w-3" /> Обрано
              </span>
              <button
                onclick={clearCustomer}
                class="cursor-pointer flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        {:else}
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              class="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {errors.customer
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              placeholder="Пошук за іменем або телефоном..."
              value={customerSearch}
              oninput={onSearchInput}
              onfocus={() => {
                if (customerSearch && customers.length) searchOpen = true
              }}
              onblur={() => setTimeout(() => (searchOpen = false), 150)}
              autocomplete="off"
            />
            {#if customerSearch}
              <button
                onclick={clearCustomer}
                class="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            {/if}
            {#if searchOpen}
              <div
                class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
              >
                {#if searchLoading}
                  <div
                    class="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground"
                  >
                    <span
                      class="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
                    ></span>Пошук...
                  </div>
                {:else if customers.length === 0}
                  <div class="px-4 py-4 text-center space-y-2">
                    <p class="text-xs text-muted-foreground">
                      Клієнта не знайдено
                    </p>
                    <button
                      class="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      onmousedown={() =>
                        goto(
                          `/clients/new?return=/orders/new&name=${encodeURIComponent(customerSearch)}`,
                        )}
                    >
                      <UserPlus class="h-3.5 w-3.5" /> Створити нового клієнта
                    </button>
                  </div>
                {:else}
                  <div class="max-h-52 overflow-y-auto">
                    {#each customers as c}
                      <button
                        class="cursor-pointer w-full flex items-center gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 last:border-0"
                        onmousedown={() => selectCustomer(c)}
                      >
                        <div
                          class="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0"
                        >
                          {getInitials(c.name)}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium truncate">{c.name}</p>
                          <p class="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                        <ChevronRight
                          class="h-3.5 w-3.5 shrink-0 text-muted-foreground/30"
                        />
                      </button>
                    {/each}
                  </div>
                  <div class="border-t bg-muted/20 px-3 py-2">
                    <button
                      class="cursor-pointer flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      onmousedown={() =>
                        goto(
                          `/clients/new?return=/orders/new&name=${encodeURIComponent(customerSearch)}`,
                        )}
                    >
                      <UserPlus class="h-3.5 w-3.5" /> Створити нового клієнта
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          <p class="mt-2.5 text-xs text-muted-foreground">
            Клієнта немає?
            <button
              onclick={() => goto('/clients/new?return=/orders/new')}
              class="cursor-pointer text-primary underline underline-offset-2 hover:no-underline"
              >Створити нового</button
            >
          </p>
        {/if}
      </div>
    </div>

    <!-- ════ АДРЕСА ════════════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div
        class="flex items-center justify-between px-4 py-3 border-b bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <MapPin class="h-3.5 w-3.5 text-muted-foreground" />
          <span
            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Адреса <span class="text-destructive">*</span>
          </span>
        </div>
        {#if errors.address}
          <span
            class="flex items-center gap-1 text-xs text-destructive font-medium"
            data-error
          >
            <AlertCircle class="h-3 w-3" />{errors.address}
          </span>
        {/if}
      </div>
      <div class="p-4 space-y-3">
        {#if propertiesLoading}
          <!-- Завантаження об'єктів -->
          <div
            class="flex items-center gap-2 py-2 text-xs text-muted-foreground"
          >
            <span
              class="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            ></span>
            Завантаження адрес клієнта...
          </div>
        {:else if customerProperties.length > 0}
          <!-- Збережені адреси клієнта -->
          <div class="space-y-1.5">
            <p class="text-xs text-muted-foreground mb-2">
              Оберіть збережену адресу або введіть нову:
            </p>
            {#each customerProperties as prop}
              <button
                onclick={() => {
                  selectedPropertyId = prop.id
                  errors = { ...errors, address: '' }
                }}
                class="cursor-pointer w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all
                  {selectedPropertyId === prop.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-input hover:bg-muted/30'}"
              >
                <div
                  class="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{prop.street}</p>
                  <p class="text-xs text-muted-foreground">
                    {[
                      prop.apt ? `кв. ${prop.apt}` : '',
                      prop.floor ? `${prop.floor} пов.` : '',
                      prop.city,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    {#if prop.area}
                      · {prop.area} м²{/if}
                  </p>
                </div>
                {#if selectedPropertyId === prop.id}
                  <Check class="h-4 w-4 text-primary shrink-0" />
                {/if}
              </button>
            {/each}

            <!-- Нова адреса -->
            <button
              onclick={() => {
                selectedPropertyId = ''
                address = ''
              }}
              class="cursor-pointer w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all
                {selectedPropertyId === ''
                ? 'border-primary/40 bg-primary/5'
                : 'border-dashed border-input hover:bg-muted/30 text-muted-foreground'}"
            >
              <div
                class="h-8 w-8 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0"
              >
                <MapPin class="h-4 w-4 text-muted-foreground/50" />
              </div>
              <span class="text-xs font-medium">Ввести нову адресу</span>
              {#if selectedPropertyId === ''}
                <Check class="h-4 w-4 text-primary shrink-0 ml-auto" />
              {/if}
            </button>
          </div>

          <!-- Поле нової адреси — тільки якщо вибрали "нова" -->
          {#if selectedPropertyId === ''}
            <div class="space-y-2">
              <div class="relative">
                <MapPin
                  class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  bind:value={address}
                  placeholder="вул. Хрещатик, 22, кв. 45"
                  class="h-9 pl-9 text-sm {errors.address
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''}"
                  oninput={() => (errors = { ...errors, address: '' })}
                />
              </div>
              <Input
                bind:value={city}
                placeholder="Місто (напр. Київ)"
                disabled={!selectedCustomer}
                class="h-9 text-sm mt-2"
              />
            </div>
          {/if}
        {:else}
          <!-- Немає збережених адрес або клієнт не вибраний -->
          <div class="relative">
            <MapPin
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              bind:value={address}
              placeholder={selectedCustomer
                ? 'вул. Хрещатик, 22, кв. 45'
                : 'Спочатку оберіть клієнта...'}
              disabled={!selectedCustomer}
              class="h-9 pl-9 text-sm {errors.address
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              oninput={() => (errors = { ...errors, address: '' })}
            />
          </div>
          <Input
            bind:value={city}
            placeholder="Місто (напр. Київ)"
            disabled={!selectedCustomer}
            class="h-9 text-sm mt-2"
          />
          {#if selectedCustomer && customerProperties.length === 0}
            <p class="text-xs text-muted-foreground">
              У клієнта немає збережених адрес
            </p>
          {/if}
        {/if}
      </div>
    </div>

    <!-- ════ ДАТА ТА ЧАС ═══════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div
        class="flex items-center justify-between px-4 py-3 border-b bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <CalendarIcon class="h-3.5 w-3.5 text-muted-foreground" />
          <span
            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Дата та час <span class="text-destructive">*</span>
          </span>
        </div>
        {#if errors.date}
          <span
            class="flex items-center gap-1 text-xs text-destructive font-medium"
            data-error
          >
            <AlertCircle class="h-3 w-3" />{errors.date}
          </span>
        {/if}
      </div>
      <div class="p-4 grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Дата</Label>
          <Popover.Root bind:open={calendarOpen}>
            <Popover.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  class="cursor-pointer flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {errors.date
                    ? 'border-destructive'
                    : ''}"
                >
                  <span class="flex items-center gap-2">
                    <CalendarIcon class="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(scheduledDate)}
                  </span>
                  <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              {/snippet}
            </Popover.Trigger>
            <Popover.Content class="w-auto p-0" align="start">
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
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Час початку</Label>
          <div class="relative">
            <Clock
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="time"
              bind:value={scheduledTime}
              class="h-9 cursor-pointer pl-9 text-sm"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ════ ТИП ТА ВАРТІСТЬ ════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div class="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Sparkles class="h-3.5 w-3.5 text-muted-foreground" />
        <span
          class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >Тип та вартість</span
        >
      </div>
      <div class="p-4 space-y-3">
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Тип прибирання</Label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {#each cleaningTypes as type}
              <button
                onclick={() => (cleaningType = type.value)}
                class="cursor-pointer rounded-md border px-3 py-2 text-xs font-medium text-left transition-all
                  {cleaningType === type.value
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-input hover:border-muted-foreground/40 hover:bg-muted/30 text-muted-foreground'}"
              >
                {type.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Сума (₴)</Label>
          <div class="relative">
            <Banknote
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="number"
              min="0"
              step="50"
              bind:value={totalAmount}
              placeholder="0"
              class="h-9 pl-9 text-sm {errors.totalAmount
                ? 'border-destructive'
                : ''}"
              oninput={() => (errors = { ...errors, totalAmount: '' })}
            />
          </div>
          {#if errors.totalAmount}
            <p
              class="flex items-center gap-1 text-xs text-destructive"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.totalAmount}
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- ════ КЛІНЕР ════════════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div
        class="flex items-center justify-between px-4 py-3 border-b bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <UserCheck class="h-3.5 w-3.5 text-muted-foreground" />
          <span
            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >Клінер</span
          >
        </div>
        <span class="text-xs text-muted-foreground/50">необов'язково</span>
      </div>
      <div class="p-4">
        {#if cleaners.length === 0}
          <p class="text-xs text-muted-foreground italic">
            Немає доступних клінерів — призначте пізніше
          </p>
        {:else}
          <div class="grid grid-cols-1 gap-1.5">
            <button
              onclick={() => (cleanerId = '')}
              class="cursor-pointer flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all text-left
                {cleanerId === ''
                ? 'border-muted-foreground/30 bg-muted/40'
                : 'border-transparent text-muted-foreground hover:bg-muted/20'}"
            >
              <div
                class="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0"
              >
                <X class="h-3 w-3 text-muted-foreground/40" />
              </div>
              <span class="text-xs">Без клінера</span>
              {#if cleanerId === ''}<Check
                  class="h-3.5 w-3.5 ml-auto text-muted-foreground"
                />{/if}
            </button>
            {#each cleaners as cl}
              <button
                onclick={() => (cleanerId = cl.id)}
                class="cursor-pointer flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all text-left
                  {cleanerId === cl.id
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:bg-muted/20'}"
              >
                <div
                  class="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0"
                >
                  {getInitials(cl.name)}
                </div>
                <span class="text-sm font-medium">{cl.name}</span>
                {#if cleanerId === cl.id}<Check
                    class="h-3.5 w-3.5 ml-auto text-primary"
                  />{/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ════ НОТАТКИ ═══════════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div
        class="flex items-center justify-between px-4 py-3 border-b bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <StickyNote class="h-3.5 w-3.5 text-muted-foreground" />
          <span
            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >Нотатки</span
          >
        </div>
        <span class="text-xs text-muted-foreground/50">необов'язково</span>
      </div>
      <div class="p-4">
        <Textarea
          bind:value={notes}
          placeholder="Особливі побажання, код домофону, є собака..."
          rows={3}
          class="resize-none border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
    </div>

    <!-- ════ ПІДСУМОК ══════════════════════════════════════ -->
    <div class="rounded-xl border bg-muted/30 overflow-hidden shadow-sm">
      <div class="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
        <Hash class="h-3.5 w-3.5 text-muted-foreground" />
        <span
          class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >Підсумок</span
        >
      </div>
      <div class="p-4">
        <dl class="space-y-2.5">
          {#each [{ label: 'Клієнт', value: selectedCustomer?.name ?? '—' }, { label: 'Телефон', value: selectedCustomer?.phone ?? '—' }, { label: 'Адреса', value: effectiveAddress || '—' }, { label: 'Дата', value: `${formatDate(scheduledDate)}, ${scheduledTime}` }, { label: 'Тип', value: selectedTypeName || '—' }, { label: 'Клінер', value: selectedCleanerName || 'Не призначено' }, { label: 'Сума', value: `${totalAmount === '' ? '0' : Number(totalAmount).toLocaleString('uk-UA')} ₴` }] as row}
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-xs text-muted-foreground shrink-0">
                {row.label}
              </dt>
              <dd class="text-xs font-medium text-right truncate max-w-[200px]">
                {row.value}
              </dd>
            </div>
          {/each}
        </dl>
      </div>
    </div>

    <!-- ════ КНОПКА ═══════════════════════════════════════ -->
    <div class="pb-8">
      <Button
        class="w-full h-11 text-sm font-medium cursor-pointer gap-2"
        onclick={createOrder}
        disabled={loading}
      >
        {#if loading}
          <span
            class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          ></span>
          Створення замовлення...
        {:else}
          <Save class="h-4 w-4" />Створити замовлення
        {/if}
      </Button>
    </div>
  </div>
</div>
