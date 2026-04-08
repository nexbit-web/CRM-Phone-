<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import {
    ArrowLeft,
    Save,
    User,
    Phone,
    Mail,
    MapPin,
    Home,
    Layers,
    Maximize2,
    StickyNote,
    AlertCircle,
    ChevronRight,
    Hash,
    Check,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import toast from 'svelte-hot-french-toast'

  // ─── Query-параметри ────────────────────────────────────
  const returnUrl = $derived($page.url.searchParams.get('return') ?? '/orders')
  const prefillName = $derived($page.url.searchParams.get('name') ?? '')

  // ─── Стан — клієнт ──────────────────────────────────────
  let name = $state(prefillName)
  let phone = $state('')
  let email = $state('')
  let notes = $state('')

  // ─── Стан — об'єкт ──────────────────────────────────────
  let street = $state('')
  let city = $state('')
  let apt = $state('')
  let floor = $state('')
  let area = $state('')
  let propType = $state('apartment')

  const propTypes = [
    { value: 'apartment', label: 'Квартира' },
    { value: 'house', label: 'Будинок' },
    { value: 'office', label: 'Офіс' },
    { value: 'commercial', label: 'Комерція' },
    { value: 'other', label: 'Інше' },
  ]

  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  // ─── Форматування телефону ──────────────────────────────
  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const d = digits.startsWith('380')
      ? digits
      : digits.startsWith('0')
        ? '38' + digits
        : '38' + digits
    const n = d.slice(0, 12)
    if (n.length <= 2) return '+' + n
    if (n.length <= 5) return `+${n.slice(0, 2)} (${n.slice(2)}`
    if (n.length <= 8)
      return `+${n.slice(0, 2)} (${n.slice(2, 5)}) ${n.slice(5)}`
    if (n.length <= 10)
      return `+${n.slice(0, 2)} (${n.slice(2, 5)}) ${n.slice(5, 8)}-${n.slice(8)}`
    return `+${n.slice(0, 2)} (${n.slice(2, 5)}) ${n.slice(5, 8)}-${n.slice(8, 10)}-${n.slice(10, 12)}`
  }

  function onPhoneInput(e: Event) {
    const input = e.target as HTMLInputElement
    const cursor = input.selectionStart ?? 0
    const raw = input.value
    const formatted = formatPhone(raw)
    phone = formatted
    errors = { ...errors, phone: '' }
    requestAnimationFrame(() => {
      const newCursor = Math.min(
        cursor + (formatted.length - raw.length),
        formatted.length,
      )
      input.setSelectionRange(newCursor, newCursor)
    })
  }

  // ─── Валідація ──────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2)
      e.name = "Ім'я має бути не менше 2 символів"
    const digits = phone.replace(/\D/g, '')
    if (!phone.trim()) e.phone = 'Вкажіть номер телефону'
    else if (digits.length < 10) e.phone = 'Номер телефону занадто короткий'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Невірний формат email'
    if (!street.trim() || street.trim().length < 5)
      e.street = 'Вкажіть вулицю та номер будинку'
    if (area && isNaN(Number(area))) e.area = 'Площа має бути числом'
    errors = e
    return Object.keys(e).length === 0
  }

  // ─── Створення клієнта + об'єкту ────────────────────────
  async function createCustomer() {
    if (!validate()) {
      setTimeout(() => {
        document
          .querySelector('[data-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    loading = true
    try {
      // 1. Клієнт
      const resC = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const dataC = await resC.json()

      if (!dataC.success) {
        toast.error(dataC.error || 'Не вдалося створити клієнта')
        return
      }

      // 2. Об'єкт нерухомості — ✅ відправляємо street окремо, як у новій схемі
      const resP = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: dataC.customer.id,
          street: street.trim(),
          city: city.trim() || '',
          apt: apt.trim() || null,
          floor: floor ? Number(floor) : null,
          area: area ? Number(area) : null,
          type: propType,
        }),
      })

      if (!resP.ok) {
        const dataP = await resP.json()
        console.warn("Помилка збереження об'єкта:", dataP.error)
        // Не блокуємо — клієнт вже створений, адресу можна додати пізніше
      }

      toast.success('Клієнт успішно створений!')

      // Повертаємось з пошуком по телефону щоб автовибрати клієнта
      const params = new URLSearchParams({ q: dataC.customer.phone })
      goto(`${returnUrl}?${params}`)
    } catch {
      toast.error('Помилка підключення до сервера')
    } finally {
      loading = false
    }
  }

  // ─── Похідні ────────────────────────────────────────────
  const selectedTypeName = $derived(
    propTypes.find((t) => t.value === propType)?.label ?? '',
  )
  const fullAddress = $derived(
    [
      street.trim(),
      apt.trim() ? `кв. ${apt.trim()}` : '',
      floor.trim() ? `${floor.trim()} пов.` : '',
      city.trim(),
    ]
      .filter(Boolean)
      .join(', '),
  )
</script>

<!-- ══ STICKY ТОП-БАР ════════════════════════════════════ -->
<div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">
    <div class="flex h-14 items-center justify-between gap-4">
      <div class="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onclick={() => goto(returnUrl)}
          class="cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Назад</span>
        </button>
        <ChevronRight class="h-4 w-4 text-muted-foreground/30 shrink-0" />
        <span class="text-sm font-medium text-foreground truncate"
          >Новий клієнт</span
        >
      </div>
      <Button
        size="sm"
        class="h-8 gap-1.5 cursor-pointer"
        onclick={createCustomer}
        disabled={loading}
      >
        {#if loading}
          <span
            class="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          ></span>
          Збереження...
        {:else}
          <Save class="h-3.5 w-3.5" />
          Зберегти
        {/if}
      </Button>
    </div>
  </div>
</div>

<!-- ══ КОНТЕНТ ════════════════════════════════════════════ -->
<div class="mx-auto max-w-2xl px-4 sm:px-6 py-8">
  <div class="mb-8">
    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
      <Hash class="h-3 w-3" />
      <span>CRM / Клієнти / Новий</span>
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Новий клієнт</h1>
    <p class="text-sm text-muted-foreground mt-1">
      Поля з <span class="text-destructive font-medium">*</span> обов'язкові
    </p>
  </div>

  <div class="space-y-5">
    <!-- ════ КОНТАКТИ ═════════════════════════════════════ -->
    <div class="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div class="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <User class="h-3.5 w-3.5 text-muted-foreground" />
        <span
          class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Контактна інформація
        </span>
      </div>
      <div class="p-4 space-y-4">
        <!-- Ім'я -->
        <div class="space-y-1.5">
          <Label for="name" class="text-xs font-medium">
            Ім'я клієнта <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <User
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              id="name"
              class="pl-9 h-9 text-sm {errors.name
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              bind:value={name}
              placeholder="Олександр Іванов"
              oninput={() => (errors = { ...errors, name: '' })}
            />
          </div>
          {#if errors.name}
            <p
              class="text-xs text-destructive flex items-center gap-1"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.name}
            </p>
          {/if}
        </div>

        <!-- Телефон -->
        <div class="space-y-1.5">
          <Label for="phone" class="text-xs font-medium">
            Телефон <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <Phone
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <input
              id="phone"
              type="tel"
              class="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {errors.phone
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              value={phone}
              oninput={onPhoneInput}
              placeholder="+38 (0XX) XXX-XX-XX"
              autocomplete="tel"
            />
          </div>
          {#if errors.phone}
            <p
              class="text-xs text-destructive flex items-center gap-1"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.phone}
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              Формат: +38 (0XX) XXX-XX-XX
            </p>
          {/if}
        </div>

        <!-- Email -->
        <div class="space-y-1.5">
          <Label for="email" class="text-xs font-medium">Email</Label>
          <div class="relative">
            <Mail
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              id="email"
              type="email"
              class="pl-9 h-9 text-sm {errors.email
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              bind:value={email}
              placeholder="example@email.com"
              oninput={() => (errors = { ...errors, email: '' })}
            />
          </div>
          {#if errors.email}
            <p
              class="text-xs text-destructive flex items-center gap-1"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.email}
            </p>
          {/if}
        </div>
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
            Адреса об'єкта <span class="text-destructive">*</span>
          </span>
        </div>
        <span class="text-xs text-muted-foreground/50">де прибираємо</span>
      </div>
      <div class="p-4 space-y-4">
        <!-- Тип об'єкта -->
        <div class="space-y-1.5">
          <Label class="text-xs text-muted-foreground">Тип об'єкта</Label>
          <div class="flex flex-wrap gap-2">
            {#each propTypes as pt}
              <button
                onclick={() => (propType = pt.value)}
                class="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-all
                  {propType === pt.value
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-input hover:border-muted-foreground/40 hover:bg-muted/30 text-muted-foreground'}"
              >
                {#if propType === pt.value}
                  <Check class="inline h-3 w-3 mr-1" />
                {/if}
                {pt.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Місто -->
        <div class="space-y-1.5">
          <Label for="city" class="text-xs font-medium">Місто</Label>
          <div class="relative">
            <MapPin
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              id="city"
              class="pl-9 h-9 text-sm"
              bind:value={city}
              placeholder="Київ"
            />
          </div>
        </div>

        <!-- Вулиця -->
        <div class="space-y-1.5">
          <Label for="street" class="text-xs font-medium">
            Вулиця та будинок <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <MapPin
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              id="street"
              class="pl-9 h-9 text-sm {errors.street
                ? 'border-destructive focus-visible:ring-destructive'
                : ''}"
              bind:value={street}
              placeholder="вул. Хрещатик, 22"
              oninput={() => (errors = { ...errors, street: '' })}
            />
          </div>
          {#if errors.street}
            <p
              class="text-xs text-destructive flex items-center gap-1"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.street}
            </p>
          {/if}
        </div>

        <!-- Квартира + Поверх -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="apt" class="text-xs font-medium">Квартира / офіс</Label>
            <div class="relative">
              <Home
                class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              />
              <Input
                id="apt"
                class="pl-9 h-9 text-sm"
                bind:value={apt}
                placeholder="45"
              />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="floor" class="text-xs font-medium">Поверх</Label>
            <div class="relative">
              <Layers
                class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              />
              <Input
                id="floor"
                type="number"
                min="0"
                class="pl-9 h-9 text-sm"
                bind:value={floor}
                placeholder="7"
              />
            </div>
          </div>
        </div>

        <!-- Площа -->
        <div class="space-y-1.5">
          <Label for="area" class="text-xs font-medium">Площа (м²)</Label>
          <div class="relative">
            <Maximize2
              class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              id="area"
              type="number"
              min="1"
              class="pl-9 h-9 text-sm {errors.area ? 'border-destructive' : ''}"
              bind:value={area}
              placeholder="65"
              oninput={() => (errors = { ...errors, area: '' })}
            />
          </div>
          {#if errors.area}
            <p
              class="text-xs text-destructive flex items-center gap-1"
              data-error
            >
              <AlertCircle class="h-3 w-3" />{errors.area}
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              Потрібно для розрахунку вартості
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- ════ НОТАТКИ ══════════════════════════════════════ -->
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
          placeholder="Алергія на засоби, є собака, зручний час — вранці, код домофону 1234..."
          rows={3}
          class="resize-none border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
    </div>

    <!-- ════ ПІДСУМОК ═════════════════════════════════════ -->
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
          {#each [{ label: "Ім'я", value: name || '—' }, { label: 'Телефон', value: phone || '—' }, { label: 'Email', value: email || '—' }, { label: 'Тип', value: selectedTypeName }, { label: 'Адреса', value: fullAddress || '—' }, { label: 'Площа', value: area ? `${area} м²` : '—' }] as row}
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-xs text-muted-foreground shrink-0">
                {row.label}
              </dt>
              <dd class="text-xs font-medium text-right truncate max-w-[220px]">
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
        onclick={createCustomer}
        disabled={loading}
      >
        {#if loading}
          <span
            class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          ></span>
          Збереження клієнта...
        {:else}
          <Save class="h-4 w-4" />
          Зберегти клієнта
        {/if}
      </Button>
    </div>
  </div>
</div>
