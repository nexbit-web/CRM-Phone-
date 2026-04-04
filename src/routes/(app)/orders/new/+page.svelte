<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Label } from '$lib/components/ui/label'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Select from '$lib/components/ui/select'
  import { Calendar } from '$lib/components/ui/calendar'
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '$lib/components/ui/popover'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import { Calendar as CalendarIcon, Save, ArrowLeft } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import toast from 'svelte-hot-french-toast'

  // Реактивні змінні Svelte 5
  let customerName = $state('')
  let customerPhone = $state('')
  let address = $state('')
  let scheduledDate = $state<Date>(new Date())
  let scheduledTime = $state('09:00')
  let cleaningType = $state('REGULAR')
  let notes = $state('')
  let totalAmount = $state(0)
  let loading = $state(false)

  const cleaningTypes = [
    { value: 'REGULAR', label: 'Підтримуюча уборка' },
    { value: 'GENERAL', label: 'Генеральна уборка' },
    { value: 'AFTER_REPAIR', label: 'Після ремонту' },
    { value: 'OFFICE', label: 'Офісна уборка' },
    { value: 'DEEP_CLEAN', label: 'Глибоке прибирання' },
    { value: 'CARPET', label: 'Хімчистка меблів' },
    { value: 'WINDOW', label: 'Миття вікон' },
  ]

  async function createOrder() {
    if (!customerName || !customerPhone || !address) {
      toast.error('Будь ласка, заповніть обов’язкові поля')
      return
    }

    loading = true

    // Комбінуємо дату і час
    const dateTime = new Date(scheduledDate)
    const [hours, minutes] = scheduledTime.split(':').map(Number)
    dateTime.setHours(hours, minutes)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          address,
          scheduledDate: dateTime.toISOString(),
          cleaningType,
          notes,
          totalAmount,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Замовлення успішно створено!')
        goto('/orders')
      } else {
        toast.error(data.error || 'Не вдалося створити замовлення')
      }
    } catch (err) {
      toast.error('Помилка підключення до сервера')
      console.error(err)
    } finally {
      loading = false
    }
  }
</script>

<div class="p-6 max-w-4xl mx-auto">
  <div class="flex items-center gap-4 mb-8">
    <Button variant="ghost" onclick={() => goto('/orders')}>
      <ArrowLeft class="mr-2 h-4 w-4" />
      Назад до замовлень
    </Button>
    <h1 class="text-3xl font-semibold">Нове замовлення</h1>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Інформація про замовлення</CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Клієнт -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label for="customerName">Ім’я клієнта *</Label>
          <Input
            id="customerName"
            bind:value={customerName}
            placeholder="Олександр Іванов"
          />
        </div>
        <div class="space-y-2">
          <Label for="customerPhone">Телефон клієнта *</Label>
          <Input
            id="customerPhone"
            bind:value={customerPhone}
            placeholder="+380 XX XXX XX XX"
          />
        </div>
      </div>

      <!-- Адреса -->
      <div class="space-y-2">
        <Label for="address">Адреса об’єкта *</Label>
        <Input
          id="address"
          bind:value={address}
          placeholder="вул. Хрещатик, 22, кв. 45"
        />
      </div>

      <!-- Дата та час уборки -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label>Дата уборки</Label>
          <Popover>
  <PopoverTrigger>
    <Button
      variant="outline"
      class="w-full justify-start text-left font-normal"
    >
      <CalendarIcon class="mr-2 h-4 w-4" />
      {format(scheduledDate, 'dd MMMM yyyy', { locale: uk })}
    </Button>
  </PopoverTrigger>

  <PopoverContent class="w-auto p-0">
    <Calendar type="single" bind:value={scheduledDate} />
  </PopoverContent>
</Popover>
        </div>

        <div class="space-y-2">
          <Label for="time">Час уборки</Label>
          <Input id="time" type="time" bind:value={scheduledTime} />
        </div>
      </div>

      <!-- Тип уборки -->
      <div class="space-y-2">
        <Label>Тип уборки</Label>
        <Select.Root bind:value={cleaningType}>
          <Select.Trigger class="w-full">
            {cleaningTypes.find((t) => t.value === cleaningType)?.label ||
              'Оберіть тип'}
          </Select.Trigger>
          <Select.Content>
            {#each cleaningTypes as type}
              <Select.Item value={type.value}>{type.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Сума та примітки -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label for="totalAmount">Сума замовлення (₴)</Label>
          <Input
            id="totalAmount"
            type="number"
            bind:value={totalAmount}
            placeholder="1500"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="notes">Додаткові примітки</Label>
        <Textarea
          id="notes"
          bind:value={notes}
          placeholder="Клієнт просить особливу увагу на кухню..."
          rows={4}
        />
      </div>

      <!-- Кнопки -->
      <div class="flex justify-end gap-3 pt-6">
        <Button variant="outline" onclick={() => goto('/orders')}>
          Скасувати
        </Button>
        <Button onclick={createOrder} disabled={loading}>
          {#if loading}
            Створення...
          {:else}
            <Save class="mr-2 h-4 w-4" />
            Створити замовлення
          {/if}
        </Button>
      </div>
    </CardContent>
  </Card>
</div>
