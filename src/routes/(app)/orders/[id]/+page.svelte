<script lang="ts">
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import * as Select from '$lib/components/ui/select'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import { Spinner } from '$lib/components/ui/spinner/index.js'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import toast from 'svelte-hot-french-toast'
  import {
    ArrowLeft,
    Calendar,
    MapPin,
    User,
    Phone,
    Banknote,
    ClipboardList,
    Pencil,
    Check,
    X,
    Hourglass,
    CheckCircle2,
    Wrench,
    Sparkles,
    Ban,
    CreditCard,
    UserCheck,
    Save,
    Clock,
    Hash,
    Building2,
    StickyNote,
    ChevronRight,
  } from 'lucide-svelte'

  let { data } = $props()

  let order = $state({ ...data.order })
  let cleaners = $state(data.cleaners)
  let saving = $state(false)
  let editMode = $state(false)

  let editCustomerName = $state(order.customer.name)
  let editCustomerPhone = $state(order.customer.phone)
  let editAddress = $state(order.property.address)
  let editScheduledDate = $state(
    format(new Date(order.scheduledDate), "yyyy-MM-dd'T'HH:mm"),
  )
  let editTotalAmount = $state(parseFloat(String(order.totalAmount)))
  let editNotes = $state(order.notes ?? '')

  type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELED'
  type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

  const statusConfig: Record<
    OrderStatus,
    {
      label: string
      icon: any
      bg: string
      text: string
      border: string
      dot: string
    }
  > = {
    PENDING: {
      label: 'Нове',
      icon: Hourglass,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-400',
    },
    CONFIRMED: {
      label: 'Підтверджено',
      icon: CheckCircle2,
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-800',
      dot: 'bg-sky-400',
    },
    IN_PROGRESS: {
      label: 'В роботі',
      icon: Wrench,
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      text: 'text-violet-700 dark:text-violet-400',
      border: 'border-violet-200 dark:border-violet-800',
      dot: 'bg-violet-400',
    },
    COMPLETED: {
      label: 'Виконано',
      icon: Sparkles,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-400',
    },
    CANCELED: {
      label: 'Скасовано',
      icon: Ban,
      bg: 'bg-red-50 dark:bg-red-950/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      dot: 'bg-red-400',
    },
  }

  const paymentConfig: Record<
    PaymentStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    UNPAID: {
      label: 'Не оплачено',
      bg: 'bg-red-50 dark:bg-red-950/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
    PARTIALLY_PAID: {
      label: 'Частково',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    PAID: {
      label: 'Оплачено',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
  }

  const statusOptions: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED',
  ]
  const paymentOptions: PaymentStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID']

  async function patch(payload: Record<string, unknown>) {
    saving = true
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        order = data.order
        return true
      }
      toast.error(data.error || 'Помилка збереження')
      return false
    } catch {
      toast.error('Помилка підключення')
      return false
    } finally {
      saving = false
    }
  }

  async function changeStatus(status: OrderStatus) {
    const ok = await patch({ status })
    if (ok) toast.success(`Статус: ${statusConfig[status].label}`)
  }

  async function changePayment(paymentStatus: PaymentStatus) {
    const ok = await patch({ paymentStatus })
    if (ok) toast.success(`Оплата: ${paymentConfig[paymentStatus].label}`)
  }

  async function changeCleaner(cleanerId: string | null) {
    const ok = await patch({ cleanerId })
    if (ok) {
      const name = cleaners.find((c) => c.id === cleanerId)?.name ?? ''
      toast.success(cleanerId ? `Клінер: ${name}` : 'Клінер знятий')
    }
  }

  async function saveEdit() {
    const ok = await patch({
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      address: editAddress,
      scheduledDate: new Date(editScheduledDate).toISOString(),
      totalAmount: editTotalAmount,
      notes: editNotes,
    })
    if (ok) {
      editMode = false
      toast.success('Збережено')
    }
  }

  function cancelEdit() {
    editCustomerName = order.customer.name
    editCustomerPhone = order.customer.phone
    editAddress = order.property.address
    editScheduledDate = format(
      new Date(order.scheduledDate),
      "yyyy-MM-dd'T'HH:mm",
    )
    editTotalAmount = parseFloat(String(order.totalAmount))
    editNotes = order.notes ?? ''
    editMode = false
  }

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

  const currentCleanerId = $derived(order.cleaner?.id ?? '')
  const currentCleanerLabel = $derived(
    order.cleaner?.name ?? 'Призначити клінера...',
  )
  const currentStatusCfg = $derived(
    statusConfig[order.status as OrderStatus] ?? statusConfig.PENDING,
  )
  const currentPaymentCfg = $derived(
    paymentConfig[order.paymentStatus as PaymentStatus] ?? paymentConfig.UNPAID,
  )
</script>

<div class="min-h-screen">
  <!-- ══ ТОП-БАР ══════════════════════════════════════════ -->
  <div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex h-14 items-center justify-between gap-4">
        <!-- Ліво: навігація -->
        <div class="flex items-center gap-1 min-w-0">
          <button
            onclick={() => goto('/orders')}
            class="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft class="h-4 w-4" />
            <span class="hidden sm:inline">Замовлення</span>
          </button>
          <ChevronRight class="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <div class="flex items-center gap-2 min-w-0">
            <!-- Поточний статус як пілюля -->
            <span
              class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border
              {currentStatusCfg.bg} {currentStatusCfg.text} {currentStatusCfg.border}"
            >
              <span class="h-1.5 w-1.5 rounded-full {currentStatusCfg.dot}"
              ></span>
              {currentStatusCfg.label}
            </span>
            <span class="text-sm font-semibold text-foreground truncate">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <!-- Право: дії -->
        <div class="flex items-center gap-2 shrink-0">
          {#if editMode}
            <Button
              variant="ghost"
              size="sm"
              class="h-8 text-muted-foreground"
              onclick={cancelEdit}
              disabled={saving}
            >
              <X class="h-3.5 w-3.5 mr-1" />Скасувати
            </Button>
            <Button size="sm" class="h-8" onclick={saveEdit} disabled={saving}>
              {#if saving}
                <Spinner />
              {:else}
                <Save class="h-3.5 w-3.5 mr-1" />
                Зберегти
              {/if}
            </Button>
          {:else}
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              onclick={() => (editMode = true)}
            >
              <Pencil class="h-3.5 w-3.5 mr-1" />Редагувати
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- ══ ОСНОВНИЙ ВМІСТ ════════════════════════════════════ -->
  <div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">
    <div class="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
      <!-- ══ ЛІВА ЧАСТИНА ══════════════════════════════════ -->
      <div class="space-y-1">
        <!-- Заголовок замовлення -->
        <div class="mb-8">
          <div
            class="flex items-center gap-2 text-xs text-muted-foreground mb-2"
          >
            <Hash class="h-3.5 w-3.5" />
            <span class="font-mono">{order.id.slice(-8).toUpperCase()}</span>
            <span class="text-muted-foreground/40">·</span>
            <span
              >Створено {format(
                new Date(order.createdAt ?? order.scheduledDate),
                'd MMM yyyy',
                { locale: uk },
              )}</span
            >
            {#if order.createdBy?.name}
              <span class="text-muted-foreground/40">·</span>
              <span>{order.createdBy.name}</span>
            {/if}
          </div>
          <h1 class="text-xl font-semibold text-foreground">
            {order.customer.name} — {order.property.address}
          </h1>
        </div>

        <!-- ── СЕКЦІЯ: Клієнт ── -->
        <section class="group">
          <div class="flex items-center gap-2 py-2 mb-1">
            <User class="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >Клієнт</span
            >
          </div>

          {#if editMode}
            <div class="rounded-lg border bg-card p-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Ім'я</Label>
                  <Input bind:value={editCustomerName} class="h-9 text-sm" />
                </div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Телефон</Label>
                  <Input bind:value={editCustomerPhone} class="h-9 text-sm" />
                </div>
              </div>
            </div>
          {:else}
            <div
              class="rounded-lg border bg-card hover:bg-muted/20 transition-colors p-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-primary/20"
                >
                  {getInitials(order.customer.name)}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm">{order.customer.name}</p>
                  <div
                    class="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"
                  >
                    <Phone class="h-3 w-3" />
                    <span>{order.customer.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </section>

        <!-- ── СЕКЦІЯ: Адреса ── -->
        <section class="group pt-2">
          <div class="flex items-center gap-2 py-2 mb-1">
            <MapPin class="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >Адреса об'єкту</span
            >
          </div>

          {#if editMode}
            <div class="rounded-lg border bg-card p-4">
              <Input bind:value={editAddress} class="h-9 text-sm" />
            </div>
          {:else}
            <div
              class="rounded-lg border bg-card hover:bg-muted/20 transition-colors p-4"
            >
              <div class="flex items-start gap-3">
                <div
                  class="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p class="text-sm font-medium">{order.property.address}</p>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    {order.property.city}
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </section>

        <!-- ── СЕКЦІЯ: Дата і сума ── -->
        <section class="group pt-2">
          <div class="flex items-center gap-2 py-2 mb-1">
            <Calendar class="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >Деталі</span
            >
          </div>

          {#if editMode}
            <div class="rounded-lg border bg-card p-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground"
                    >Дата та час</Label
                  >
                  <Input
                    type="datetime-local"
                    bind:value={editScheduledDate}
                    class="h-9 text-sm"
                  />
                </div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Сума (₴)</Label>
                  <Input
                    type="number"
                    bind:value={editTotalAmount}
                    min="0"
                    class="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          {:else}
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg border bg-card p-4">
                <div
                  class="flex items-center gap-2 text-xs text-muted-foreground mb-2"
                >
                  <Clock class="h-3.5 w-3.5" />
                  <span>Дата прибирання</span>
                </div>
                <p class="text-sm font-semibold">
                  {format(new Date(order.scheduledDate), 'd MMMM yyyy', {
                    locale: uk,
                  })}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(order.scheduledDate), 'HH:mm')}
                </p>
              </div>
              <div class="rounded-lg border bg-card p-4">
                <div
                  class="flex items-center gap-2 text-xs text-muted-foreground mb-2"
                >
                  <Banknote class="h-3.5 w-3.5" />
                  <span>Сума замовлення</span>
                </div>
                <p class="text-2xl font-bold tabular-nums tracking-tight">
                  {formatAmount(order.totalAmount)}
                  <span class="text-sm font-normal text-muted-foreground ml-0.5"
                    >₴</span
                  >
                </p>
              </div>
            </div>
          {/if}
        </section>

        <!-- ── СЕКЦІЯ: Нотатки ── -->
        <section class="group pt-2">
          <div class="flex items-center gap-2 py-2 mb-1">
            <StickyNote class="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >Нотатки</span
            >
          </div>

          {#if editMode}
            <div class="rounded-lg border bg-card p-4">
              <Textarea
                bind:value={editNotes}
                rows={3}
                placeholder="Додаткова інформація..."
                class="resize-none text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
          {:else}
            <div class="rounded-lg border bg-card p-4 min-h-[72px]">
              {#if order.notes}
                <p class="text-sm text-foreground/80 leading-relaxed">
                  {order.notes}
                </p>
              {:else}
                <p class="text-sm text-muted-foreground/50 italic">
                  Нотатки відсутні
                </p>
              {/if}
            </div>
          {/if}
        </section>

        <!-- ── СЕКЦІЯ: Послуги ── -->
        {#if order.items.length > 0}
          <section class="group pt-2">
            <div class="flex items-center gap-2 py-2 mb-1">
              <Sparkles class="h-3.5 w-3.5 text-muted-foreground/60" />
              <span
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >Послуги</span
              >
            </div>
            <div class="rounded-lg border bg-card overflow-hidden divide-y">
              {#each order.items as item, i}
                <div
                  class="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="h-6 w-6 rounded-full bg-muted text-xs text-muted-foreground flex items-center justify-center font-medium"
                      >{i + 1}</span
                    >
                    <div>
                      <p class="text-sm font-medium">{item.service.name}</p>
                      {#if item.qty > 1}
                        <p class="text-xs text-muted-foreground">
                          × {item.qty}
                        </p>
                      {/if}
                    </div>
                  </div>
                  <span class="text-sm font-semibold tabular-nums"
                    >{formatAmount(item.price)} ₴</span
                  >
                </div>
              {/each}
              <div
                class="flex items-center justify-between px-4 py-3 bg-muted/30"
              >
                <span
                  class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >Разом</span
                >
                <span class="text-sm font-bold"
                  >{formatAmount(order.totalAmount)} ₴</span
                >
              </div>
            </div>
          </section>
        {/if}
      </div>

      <!-- ══ ПРАВА ПАНЕЛЬ ══════════════════════════════════ -->
      <div class="space-y-6">
        <!-- ── Властивості замовлення ── -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-4 py-3 border-b bg-muted/30">
            <p
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Властивості
            </p>
          </div>
          <div class="divide-y">
            <!-- Статус -->
            <div class="px-4 py-3">
              <p class="text-xs text-muted-foreground mb-2">Статус</p>
              <div class="space-y-1">
                {#each statusOptions as s}
                  {@const cfg = statusConfig[s]}
                  <button
                    onclick={() => changeStatus(s)}
                    disabled={saving}
                    class="w-full cursor-pointer flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all
                      {order.status === s
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} border`
                      : 'hover:bg-muted/60 text-muted-foreground'}"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full {order.status === s
                        ? cfg.dot
                        : 'bg-muted-foreground/30'} shrink-0"
                    ></span>
                    <svelte:component
                      this={cfg.icon}
                      class="h-3.5 w-3.5 shrink-0"
                    />
                    <span class="flex-1 text-left">{cfg.label}</span>
                    {#if order.status === s}
                      <Check class="h-3.5 w-3.5 shrink-0" />
                    {/if}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Оплата -->
            <div class="px-4 py-3">
              <p class="text-xs text-muted-foreground mb-2">Оплата</p>
              <div class="space-y-1">
                {#each paymentOptions as p}
                  {@const cfg = paymentConfig[p]}
                  <button
                    onclick={() => changePayment(p)}
                    disabled={saving}
                    class="w-full flex items-center cursor-pointer gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all
                      {order.paymentStatus === p
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} border`
                      : 'hover:bg-muted/60 text-muted-foreground'}"
                  >
                    <CreditCard class="h-3.5 w-3.5 shrink-0" />
                    <span class="flex-1 text-left">{cfg.label}</span>
                    {#if order.paymentStatus === p}
                      <Check class="h-3.5 w-3.5 shrink-0" />
                    {/if}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Клінер -->
            <div class="px-4 py-3">
              <p class="text-xs text-muted-foreground mb-2">Клінер</p>
              {#if order.cleaner}
                <div
                  class="flex items-center gap-2 mb-2 rounded-md bg-muted/40 px-2.5 py-2"
                >
                  <div
                    class="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0"
                  >
                    {getInitials(order.cleaner.name)}
                  </div>
                  <span class="text-xs font-medium">{order.cleaner.name}</span>
                </div>
              {/if}
              <Select.Root
                type="single"
                value={currentCleanerId}
                onValueChange={(val) => changeCleaner(val || null)}
              >
                <Select.Trigger
                  class="h-8 w-full text-xs border-dashed cursor-pointer"
                >
                  <UserCheck class="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  {currentCleanerLabel}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="" class="cursor-pointer">
                    <X class="h-3.5 w-3.5 mr-1.5" />
                    Зняти клінера
                  </Select.Item>
                  {#each cleaners as cleaner (cleaner.id)}
                    <Select.Item class="cursor-pointer" value={cleaner.id}
                      >{cleaner.name}</Select.Item
                    >
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        </div>

        <!-- ── Мета-інфо ── -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-4 py-3 border-b bg-muted/30">
            <p
              class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Інформація
            </p>
          </div>
          <div class="px-4 py-3 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs text-muted-foreground">ID</span>
              <span class="text-xs font-mono text-foreground/70"
                >{order.id.slice(-8).toUpperCase()}</span
              >
            </div>
            {#if order.createdBy?.name}
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs text-muted-foreground">Створив</span>
                <span class="text-xs font-medium">{order.createdBy.name}</span>
              </div>
            {/if}
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs text-muted-foreground">Дата</span>
              <span class="text-xs font-medium">
                {format(new Date(order.scheduledDate), 'd MMM yyyy', {
                  locale: uk,
                })}
              </span>
            </div>
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs text-muted-foreground">Час</span>
              <span class="text-xs font-medium">
                {format(new Date(order.scheduledDate), 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
