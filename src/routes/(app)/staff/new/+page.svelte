<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    ArrowLeft,
    Save,
    User,
    Phone,
    Mail,
    ChevronRight,
    Hash,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import toast from 'svelte-hot-french-toast'

  let name = $state('')
  let email = $state('')
  let phone = $state('')
  let saving = $state(false)
  let errors = $state<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'Мін. 2 символи'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Невірний email'
    errors = e
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    saving = true
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Клінера додано!')
        goto('/staff')
      } else {
        toast.error(data.error || 'Помилка')
      }
    } catch {
      toast.error('Помилка підключення')
    } finally {
      saving = false
    }
  }
</script>

<div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">
    <div class="flex h-14 items-center justify-between gap-4">
      <div class="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onclick={() => goto('/staff')}
          class="cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Персонал</span>
        </button>
        <ChevronRight class="h-4 w-4 text-muted-foreground/30 shrink-0" />
        <span class="text-sm font-medium truncate">Новий клінер</span>
      </div>
      <Button
        size="sm"
        class="h-8 gap-1.5 cursor-pointer"
        onclick={save}
        disabled={saving}
      >
        {#if saving}
          <span
            class="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          ></span>
        {:else}
          <Save class="h-3.5 w-3.5" />
        {/if}
        Зберегти
      </Button>
    </div>
  </div>
</div>

<div class="mx-auto max-w-2xl px-4 sm:px-6 py-8">
  <div class="mb-8">
    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
      <Hash class="h-3 w-3" /><span>CRM / Персонал / Новий</span>
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Новий клінер</h1>
  </div>

  <div class="rounded-xl border bg-card shadow-sm p-5 space-y-4">
    <div class="space-y-1.5">
      <Label class="text-xs font-medium">Ім'я *</Label>
      <div class="relative">
        <User
          class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        />
        <Input
          bind:value={name}
          placeholder="Марія Іванова"
          class="pl-9 h-9 text-sm {errors.name ? 'border-destructive' : ''}"
          oninput={() => (errors = { ...errors, name: '' })}
        />
      </div>
      {#if errors.name}<p class="text-xs text-destructive">
          {errors.name}
        </p>{/if}
    </div>

    <div class="space-y-1.5">
      <Label class="text-xs font-medium">Телефон</Label>
      <div class="relative">
        <Phone
          class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        />
        <Input
          bind:value={phone}
          placeholder="+38 (0XX) XXX-XX-XX"
          class="pl-9 h-9 text-sm"
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <Label class="text-xs font-medium">Email</Label>
      <div class="relative">
        <Mail
          class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        />
        <Input
          bind:value={email}
          type="email"
          placeholder="maria@example.com"
          class="pl-9 h-9 text-sm {errors.email ? 'border-destructive' : ''}"
          oninput={() => (errors = { ...errors, email: '' })}
        />
      </div>
      {#if errors.email}<p class="text-xs text-destructive">
          {errors.email}
        </p>{/if}
    </div>
  </div>

  <div class="mt-5 pb-8">
    <Button
      class="w-full h-11 text-sm font-medium cursor-pointer gap-2"
      onclick={save}
      disabled={saving}
    >
      {#if saving}
        <span
          class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        ></span>
      {:else}
        <Save class="h-4 w-4" />
      {/if}
      Зберегти клінера
    </Button>
  </div>
</div>
