<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import toast from 'svelte-hot-french-toast'
  import {
    Users,
    UserPlus,
    Phone,
    Mail,
    Ban,
    CheckCircle2,
    Trash2,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'

  let { data } = $props()
  let cleaners = $state([...data.cleaners])

  function getInitials(n: string) {
    return n
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }

  async function toggleBan(id: string, banned: boolean) {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned: !banned }),
    })
    const data = await res.json()
    if (data.success) {
      cleaners = cleaners.map((c) =>
        c.id === id ? { ...c, banned: !banned } : c,
      )
      toast.success(!banned ? 'Клінера деактивовано' : 'Клінера активовано')
    }
  }

  async function deleteCleaner(id: string, name: string) {
    if (!confirm(`Видалити ${name}?`)) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      cleaners = cleaners.filter((c) => c.id !== id)
      toast.success('Клінера видалено')
    }
  }
</script>

<div class="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Персонал</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Клінерів: {cleaners.length}
      </p>
    </div>
    <Button onclick={() => goto('/staff/new')} size="sm" class="gap-1.5">
      <UserPlus class="h-4 w-4" /> Додати клінера
    </Button>
  </div>

  {#if cleaners.length === 0}
    <div class="rounded-xl border bg-card p-16 text-center shadow-sm">
      <Users class="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
      <p class="text-lg font-semibold">Клінерів ще немає</p>
      <p class="text-sm text-muted-foreground mt-1">Додайте першого клінера</p>
      <Button onclick={() => goto('/staff/new')} size="sm" class="mt-4 gap-1.5">
        <UserPlus class="h-4 w-4" /> Додати
      </Button>
    </div>
  {:else}
    <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div class="divide-y">
        {#each cleaners as cleaner (cleaner.id)}
          <div
            class="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
          >
            <div
              class="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 {cleaner.banned
                ? 'opacity-40'
                : ''}"
            >
              {getInitials(cleaner.name)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p
                  class="text-sm font-semibold {cleaner.banned
                    ? 'line-through text-muted-foreground'
                    : ''}"
                >
                  {cleaner.name}
                </p>
                {#if cleaner.banned}
                  <span
                    class="text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                    >Деактивовано</span
                  >
                {:else}
                  <span
                    class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                    >Активний</span
                  >
                {/if}
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                {#if cleaner.email && !cleaner.email.includes('@internal.local')}
                  <span
                    class="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Mail class="h-3 w-3" />{cleaner.email}
                  </span>
                {/if}
                {#if cleaner.phone}
                  <span
                    class="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Phone class="h-3 w-3" />{cleaner.phone}
                  </span>
                {/if}
              </div>
            </div>
            <div class="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {format(new Date(cleaner.createdAt), 'd MMM yyyy', {
                locale: uk,
              })}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                onclick={() => toggleBan(cleaner.id, cleaner.banned)}
                title={cleaner.banned ? 'Активувати' : 'Деактивувати'}
                class="cursor-pointer h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                {#if cleaner.banned}
                  <CheckCircle2 class="h-4 w-4 text-emerald-500" />
                {:else}
                  <Ban class="h-4 w-4" />
                {/if}
              </button>
              <button
                onclick={() => deleteCleaner(cleaner.id, cleaner.name)}
                class="cursor-pointer h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
