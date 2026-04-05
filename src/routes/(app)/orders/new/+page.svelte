<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import * as Select from '$lib/components/ui/select'
  import { Calendar } from '$lib/components/ui/calendar'
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import {
    ArrowLeft, Save, Calendar as CalendarIcon,
    User, MapPin, Banknote, StickyNote,
    Search, UserPlus, X, Check, Sparkles,
    UserCheck, ChevronRight, AlertCircle,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import toast from 'svelte-hot-french-toast'
  import { onMount, tick } from 'svelte'

  type Customer = { id: string; name: string; phone: string; email?: string | null; companyName?: string | null }
  type Cleaner  = { id: string; name: string }

  let selectedCustomer = $state<Customer | null>(null)
  let customerSearch   = $state('')
  let customers        = $state<Customer[]>([])
  let searchLoading    = $state(false)
  let searchOpen       = $state(false)
  let searchTimeout: ReturnType<typeof setTimeout>

  let cleaners      = $state<Cleaner[]>([])
  let cleanerId     = $state<string>('')
  let address       = $state('')
  let scheduledDate = $state<Date>(new Date())
  let scheduledTime = $state('09:00')
  let cleaningType  = $state('REGULAR')
  let notes         = $state('')
  let totalAmount   = $state<number | ''>('')
  let loading       = $state(false)
  let errors        = $state<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!selectedCustomer) e.customer = "Оберіть або створіть клієнта"
    if (!address.trim() || address.trim().length < 5) e.address = "Вкажіть адресу (не менше 5 символів)"
    if (totalAmount !== '' && (isNaN(Number(totalAmount)) || Number(totalAmount) < 0))
      e.totalAmount = "Сума не може бути від'ємною"
    errors = e
    return Object.keys(e).length === 0
  }

  async function onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    customerSearch = val
    selectedCustomer = null
    clearTimeout(searchTimeout)
    if (!val.trim()) { customers = []; searchOpen = false; return }
    searchTimeout = setTimeout(async () => {
      searchLoading = true
      searchOpen = true
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        if (data.success) customers = data.customers
      } finally { searchLoading = false }
    }, 250)
  }

  function selectCustomer(c: Customer) {
    selectedCustomer = c
    customerSearch = ''
    searchOpen = false
    customers = []
    errors.customer = ''
  }

  function clearCustomer() {
    selectedCustomer = null
    customerSearch = ''
    customers = []
    searchOpen = false
  }

  import { page } from '$app/stores'

  onMount(async () => {
    // Завантажуємо клінерів
    const res = await fetch('/api/cleaners')
    const data = await res.json()
    if (data.success) cleaners = data.cleaners

    // Якщо повернулися зі сторінки клієнта — автоматично знаходимо його
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
      } finally { searchLoading = false }
    }
  })

  async function createOrder() {
    if (!validate()) {
      await tick()
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    loading = true
    const dateTime = new Date(scheduledDate)
    const [h, m] = scheduledTime.split(':').map(Number)
    dateTime.setHours(h, m, 0, 0)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:  selectedCustomer!.name,
          customerPhone: selectedCustomer!.phone,
          address:       address.trim(),
          scheduledDate: dateTime.toISOString(),
          cleaningType,
          notes:         notes.trim(),
          totalAmount:   totalAmount === '' ? 0 : Number(totalAmount),
          cleanerId:     cleanerId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) { toast.success('Замовлення успішно створено!'); goto('/orders') }
      else toast.error(data.error || 'Не вдалося створити замовлення')
    } catch { toast.error('Помилка підключення до сервера') }
    finally { loading = false }
  }

  const cleaningTypes = [
    { value: 'REGULAR',      label: 'Підтримуюча уборка' },
    { value: 'GENERAL',      label: 'Генеральна уборка' },
    { value: 'AFTER_REPAIR', label: 'Після ремонту' },
    { value: 'OFFICE',       label: 'Офісна уборка' },
    { value: 'DEEP_CLEAN',   label: 'Глибоке прибирання' },
    { value: 'CARPET',       label: 'Хімчистка меблів та килимів' },
    { value: 'WINDOW',       label: 'Миття вікон' },
    { value: 'OTHER',        label: 'Інше' },
  ]

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
  }
</script>

<div class="max-w-3xl mx-auto space-y-5">

  <!-- Хедер -->
  <div class="flex items-center gap-3">
    <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={() => goto('/orders')}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Нове замовлення</h1>
      <p class="text-xs text-muted-foreground mt-0.5">Заповніть інформацію для створення замовлення</p>
    </div>
  </div>

  <!-- КЛІЄНТ -->
  <section class="rounded-xl border bg-card overflow-hidden">
    <div class="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
      <User class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Клієнт</span>
      {#if errors.customer}
        <span class="ml-auto flex items-center gap-1 text-xs text-destructive" data-error>
          <AlertCircle class="h-3 w-3" />{errors.customer}
        </span>
      {/if}
    </div>
    <div class="p-4 space-y-3">
      {#if selectedCustomer}
        <div class="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
          <div class="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {getInitials(selectedCustomer.name)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{selectedCustomer.name}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{selectedCustomer.phone}</p>
            {#if selectedCustomer.companyName}
              <p class="text-xs text-muted-foreground/60 mt-0.5">{selectedCustomer.companyName}</p>
            {/if}
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-0.5 font-medium">
              <Check class="h-3 w-3" /> Обрано
            </span>
            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={clearCustomer}>
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      {:else}
        <div class="relative">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 {errors.customer ? 'border-destructive focus-visible:ring-destructive' : ''}"
              placeholder="Пошук за іменем або телефоном..."
              value={customerSearch}
              oninput={onSearchInput}
              onfocus={() => { if (customerSearch && customers.length) searchOpen = true }}
              onblur={() => setTimeout(() => (searchOpen = false), 200)}
              autocomplete="off"
            />
            {#if customerSearch}
              <button class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onclick={clearCustomer}>
                <X class="h-3.5 w-3.5" />
              </button>
            {/if}
          </div>

          {#if searchOpen}
            <div class="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden">
              {#if searchLoading}
                <div class="px-3 py-3 text-xs text-muted-foreground text-center">Пошук...</div>
              {:else if customers.length === 0}
                <div class="px-3 py-3 space-y-2">
                  <p class="text-xs text-muted-foreground text-center">Клієнта не знайдено</p>
                  <button
                    class="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline py-1"
                    onmousedown={() => goto(`/clients/new?return=/orders/new&name=${encodeURIComponent(customerSearch)}`)}
                  >
                    <UserPlus class="h-3.5 w-3.5" /> Створити нового клієнта
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
                    <UserPlus class="h-3.5 w-3.5" /> Створити нового клієнта
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        <p class="text-xs text-muted-foreground">
          Введіть ім'я або номер телефону. Якщо клієнта немає —
          <button class="text-primary underline underline-offset-2" onclick={() => goto('/clients/new?return=/orders/new')}>
            створіть нового
          </button>.
        </p>
      {/if}
    </div>
  </section>

  <!-- АДРЕСА ТА ЧАС -->
  <section class="rounded-xl border bg-card overflow-hidden">
    <div class="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
      <MapPin class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Адреса та час</span>
    </div>
    <div class="p-4 space-y-4">
      <div class="space-y-1.5">
        <Label for="address" class="text-xs font-medium">Адреса об'єкта <span class="text-destructive">*</span></Label>
        <div class="relative">
          <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="address"
            class="pl-9 h-9 text-sm {errors.address ? 'border-destructive focus-visible:ring-destructive' : ''}"
            bind:value={address}
            placeholder="вул. Хрещатик, 22, кв. 45"
            oninput={() => (errors.address = '')}
          />
        </div>
        {#if errors.address}
          <p class="text-xs text-destructive flex items-center gap-1" data-error>
            <AlertCircle class="h-3 w-3" />{errors.address}
          </p>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label class="text-xs font-medium">Дата уборки <span class="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger>
              <Button variant="outline" class="w-full justify-start text-left font-normal text-sm h-9">
                <CalendarIcon class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                {format(scheduledDate, 'd MMM yyyy', { locale: uk })}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0">
              <Calendar type="single" bind:value={scheduledDate} />
            </PopoverContent>
          </Popover>
        </div>
        <div class="space-y-1.5">
          <Label for="time" class="text-xs font-medium">Час <span class="text-destructive">*</span></Label>
          <Input id="time" type="time" class="h-9 text-sm" bind:value={scheduledTime} />
        </div>
      </div>
    </div>
  </section>

  <!-- ТИП ТА ВАРТІСТЬ -->
  <section class="rounded-xl border bg-card overflow-hidden">
    <div class="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
      <Sparkles class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Тип та вартість</span>
    </div>
    <div class="p-4 space-y-4">
      <div class="space-y-1.5">
        <Label class="text-xs font-medium">Тип уборки</Label>
        <Select.Root type="single" bind:value={cleaningType}>
          <Select.Trigger class="h-9 text-sm w-full">
            {cleaningTypes.find(t => t.value === cleaningType)?.label ?? 'Оберіть тип'}
          </Select.Trigger>
          <Select.Content>
            {#each cleaningTypes as type}
              <Select.Item value={type.value} class="text-sm">{type.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="space-y-1.5">
        <Label for="totalAmount" class="text-xs font-medium">Сума замовлення (₴)</Label>
        <div class="relative">
          <Banknote class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="totalAmount"
            type="number"
            min="0"
            step="50"
            class="pl-9 h-9 text-sm {errors.totalAmount ? 'border-destructive focus-visible:ring-destructive' : ''}"
            bind:value={totalAmount}
            placeholder="0"
            oninput={() => (errors.totalAmount = '')}
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

  <!-- КЛІНЕР -->
  <section class="rounded-xl border bg-card overflow-hidden">
    <div class="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
      <UserCheck class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Клінер</span>
      <span class="ml-auto text-xs text-muted-foreground">необов'язково</span>
    </div>
    <div class="p-4">
      {#if cleaners.length === 0}
        <p class="text-xs text-muted-foreground italic">Немає доступних клінерів</p>
      {:else}
        <Select.Root type="single" bind:value={cleanerId}>
          <Select.Trigger class="h-9 text-sm w-full">
            {#if cleanerId}
              {@const cl = cleaners.find(c => c.id === cleanerId)}
              <div class="flex items-center gap-2">
                <div class="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {getInitials(cl?.name ?? '')}
                </div>
                <span>{cl?.name}</span>
              </div>
            {:else}
              <span class="text-muted-foreground">Призначити клінера...</span>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="" class="text-sm text-muted-foreground">
              <X class="h-3.5 w-3.5 mr-2 inline" /> Без клінера
            </Select.Item>
            {#each cleaners as cl}
              <Select.Item value={cl.id} class="text-sm">
                <div class="flex items-center gap-2">
                  <div class="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {getInitials(cl.name)}
                  </div>
                  {cl.name}
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      {/if}
    </div>
  </section>

  <!-- ПРИМІТКИ -->
  <section class="rounded-xl border bg-card overflow-hidden">
    <div class="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
      <StickyNote class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Примітки</span>
      <span class="ml-auto text-xs text-muted-foreground">необов'язково</span>
    </div>
    <div class="p-4">
      <Textarea
        id="notes"
        bind:value={notes}
        placeholder="Клієнт просить особливу увагу на кухню, є кіт, домофон 47..."
        rows={3}
        class="text-sm resize-none"
      />
    </div>
  </section>

  <!-- КНОПКИ -->
  <div class="flex items-center justify-between gap-3 pb-6">
    <Button variant="outline" onclick={() => goto('/orders')} class="gap-2">
      <ArrowLeft class="h-4 w-4" /> Скасувати
    </Button>
    <Button onclick={createOrder} disabled={loading} class="gap-2 min-w-44">
      {#if loading}
        <span class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        Створення...
      {:else}
        <Save class="h-4 w-4" /> Створити замовлення
      {/if}
    </Button>
  </div>

</div>