<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { ArrowLeft, Save, User, Phone, Mail, Building2, StickyNote, AlertCircle } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import toast from 'svelte-hot-french-toast'

  // Зчитуємо query-параметри (return URL та prefill name)
  const returnUrl  = $derived($page.url.searchParams.get('return') ?? '/orders')
  const prefillName = $derived($page.url.searchParams.get('name') ?? '')

  let name        = $state(prefillName)
  let phone       = $state('')
  let email       = $state('')
  let companyName = $state('')
  let notes       = $state('')
  let loading     = $state(false)
  let errors      = $state<Record<string, string>>({})

  // Форматування телефону
  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const d = digits.startsWith('380') ? digits
            : digits.startsWith('0')   ? '38' + digits
            : '38' + digits
    const n = d.slice(0, 12)
    if (n.length <= 2)  return '+' + n
    if (n.length <= 5)  return `+${n.slice(0,2)} (${n.slice(2)}`
    if (n.length <= 8)  return `+${n.slice(0,2)} (${n.slice(2,5)}) ${n.slice(5)}`
    if (n.length <= 10) return `+${n.slice(0,2)} (${n.slice(2,5)}) ${n.slice(5,8)}-${n.slice(8)}`
    return `+${n.slice(0,2)} (${n.slice(2,5)}) ${n.slice(5,8)}-${n.slice(8,10)}-${n.slice(10,12)}`
  }

  function onPhoneInput(e: Event) {
    const input = e.target as HTMLInputElement
    const cursor = input.selectionStart ?? 0
    const raw = input.value
    const formatted = formatPhone(raw)
    phone = formatted
    errors.phone = ''
    // Відновлення курсора
    requestAnimationFrame(() => {
      const newCursor = Math.min(cursor + (formatted.length - raw.length), formatted.length)
      input.setSelectionRange(newCursor, newCursor)
    })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = "Ім'я має бути не менше 2 символів"
    const digits = phone.replace(/\D/g, '')
    if (!phone.trim()) e.phone = 'Вкажіть номер телефону'
    else if (digits.length < 10) e.phone = 'Номер телефону занадто короткий'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Невірний формат email'
    errors = e
    return Object.keys(e).length === 0
  }

  async function createCustomer() {
    if (!validate()) return
    loading = true
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          companyName: companyName.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Клієнт успішно створений!')
        // Повертаємося з phone у query щоб сторінка замовлення могла одразу знайти клієнта
        const params = new URLSearchParams({ q: data.customer.phone })
        goto(`${returnUrl}?${params}`)
      } else {
        toast.error(data.error || 'Не вдалося створити клієнта')
      }
    } catch {
      toast.error('Помилка підключення до сервера')
    } finally {
      loading = false
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-5">

  <div class="flex items-center gap-3">
    <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={() => goto(returnUrl)}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Новий клієнт</h1>
      <p class="text-xs text-muted-foreground mt-0.5">Заповніть інформацію про клієнта</p>
    </div>
  </div>

  <Card class="overflow-hidden">
    <CardHeader class="px-4 py-3 border-b bg-muted/30">
      <CardTitle class="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <User class="h-3.5 w-3.5" /> Інформація про клієнта
      </CardTitle>
    </CardHeader>
    <CardContent class="p-4 space-y-4">

      <!-- Ім'я -->
      <div class="space-y-1.5">
        <Label for="name" class="text-xs font-medium">
          Ім'я клієнта <span class="text-destructive">*</span>
        </Label>
        <div class="relative">
          <User class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="name"
            class="pl-9 h-9 text-sm {errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}"
            bind:value={name}
            placeholder="Олександр Іванов"
            oninput={() => (errors.name = '')}
          />
        </div>
        {#if errors.name}
          <p class="text-xs text-destructive flex items-center gap-1">
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
          <Phone class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            id="phone"
            type="tel"
            class="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}"
            value={phone}
            oninput={onPhoneInput}
            placeholder="+38 (0XX) XXX-XX-XX"
            autocomplete="tel"
          />
        </div>
        {#if errors.phone}
          <p class="text-xs text-destructive flex items-center gap-1">
            <AlertCircle class="h-3 w-3" />{errors.phone}
          </p>
        {:else}
          <p class="text-xs text-muted-foreground">Формат: +38 (0XX) XXX-XX-XX</p>
        {/if}
      </div>

      <!-- Email -->
      <div class="space-y-1.5">
        <Label for="email" class="text-xs font-medium">Email</Label>
        <div class="relative">
          <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            class="pl-9 h-9 text-sm {errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}"
            bind:value={email}
            placeholder="example@email.com"
            oninput={() => (errors.email = '')}
          />
        </div>
        {#if errors.email}
          <p class="text-xs text-destructive flex items-center gap-1">
            <AlertCircle class="h-3 w-3" />{errors.email}
          </p>
        {/if}
      </div>

      <!-- Компанія -->
      <div class="space-y-1.5">
        <Label for="companyName" class="text-xs font-medium">Назва компанії</Label>
        <div class="relative">
          <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="companyName"
            class="pl-9 h-9 text-sm"
            bind:value={companyName}
            placeholder="ТОВ 'Ромашка' (якщо є)"
          />
        </div>
      </div>

      <!-- Нотатки -->
      <div class="space-y-1.5">
        <Label for="notes" class="text-xs font-medium flex items-center gap-1.5">
          <StickyNote class="h-3.5 w-3.5" /> Примітки
        </Label>
        <Textarea
          id="notes"
          bind:value={notes}
          placeholder="Алергія на миючі засоби, є собака, зручний час — вранці..."
          rows={3}
          class="text-sm resize-none"
        />
      </div>

    </CardContent>
  </Card>

  <div class="flex items-center justify-between gap-3 pb-6">
    <Button variant="outline" onclick={() => goto(returnUrl)} class="gap-2">
      <ArrowLeft class="h-4 w-4" /> Скасувати
    </Button>
    <Button onclick={createCustomer} disabled={loading} class="gap-2 min-w-40">
      {#if loading}
        <span class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        Створення...
      {:else}
        <Save class="h-4 w-4" /> Створити клієнта
      {/if}
    </Button>
  </div>

</div>