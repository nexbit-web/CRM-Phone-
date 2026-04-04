<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { ArrowLeft, Save, User } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import toast from 'svelte-hot-french-toast'
 

  let name = $state('')
  let phone = $state('')
  let email = $state('')
  let companyName = $state('')
  let notes = $state('')
  let loading = $state(false)

  async function createCustomer() {
    if (!name.trim() || !phone.trim()) {
      toast.error('Ім’я та телефон є обов’язковими полями')
      return
    }

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
        goto('/clients')
      } else {
        toast.error(data.error || 'Не вдалося створити клієнта')
      }
    } catch (err) {
      toast.error('Помилка підключення до сервера')
      console.error(err)
    } finally {
      loading = false
    }
  }
</script>

<div class="p-6 max-w-2xl mx-auto">
  <div class="flex items-center gap-4 mb-8">
    <Button variant="ghost" onclick={() => goto('/clients')}>
      <ArrowLeft class="mr-2 h-4 w-4" />
      Назад до клієнтів
    </Button>
    <h1 class="text-3xl font-semibold">Новий клієнт</h1>
  </div>

  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <User class="h-5 w-5" />
        Інформація про клієнта
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label for="name">Ім’я клієнта *</Label>
          <Input id="name" bind:value={name} placeholder="Олександр Іванов" />
        </div>

        <div class="space-y-2">
          <Label for="phone">Телефон *</Label>
          <Input
            id="phone"
            bind:value={phone}
            placeholder="+380 XX XXX XX XX"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          bind:value={email}
          placeholder="example@email.com"
        />
      </div>

      <div class="space-y-2">
        <Label for="companyName">Назва компанії (якщо є)</Label>
        <Input
          id="companyName"
          bind:value={companyName}
          placeholder="ТОВ 'Ромашка'"
        />
      </div>

      <div class="space-y-2">
        <Label for="notes">Додаткові примітки</Label>
        <Textarea
          id="notes"
          bind:value={notes}
          placeholder="Алергія на миючі засоби, має собаку, тощо..."
          rows={4}
        />
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="outline" onclick={() => goto('/clients')}>
          Скасувати
        </Button>
        <Button onclick={createCustomer} disabled={loading} class="min-w-32">
          {#if loading}
            Створення...
          {:else}
            <Save class="mr-2 h-4 w-4" />
            Створити клієнта
          {/if}
        </Button>
      </div>
    </CardContent>
  </Card>
</div>
