<script lang="ts">
  import { onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Table from '$lib/components/ui/table'
  import { Badge } from '$lib/components/ui/badge'
  import * as Select from '$lib/components/ui/select'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'
  import {
    Plus,
    Search,
    X,
    Eye,
    Edit2,
    Calendar,
    User,
    MapPin,
    DollarSign,
    Clock,
    CheckCircle,
    AlertCircle,
    Ban,
  } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'

  // Типи
  type Order = {
    id: string
    scheduledDate: string
    status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
    totalAmount: string | number
    customer: { name: string; phone: string }
    property: { address: string; city: string }
    cleaner?: { name: string }
    items: Array<{ service: { name: string }; qty: number }>
  }

  let orders = $state<Order[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  let search = $state('')
  let statusFilter = $state<string>('ALL')

  const statusOptions = [
    { value: 'ALL', label: 'Всі статуси' },
    { value: 'PENDING', label: 'Нове' },
    { value: 'CONFIRMED', label: 'Підтверджено' },
    { value: 'IN_PROGRESS', label: 'В роботі' },
    { value: 'COMPLETED', label: 'Виконано' },
    { value: 'CANCELED', label: 'Скасовано' },
  ]

  const currentStatusLabel = $derived(
    statusOptions.find((s) => s.value === statusFilter)?.label ?? 'Всі статуси',
  )

  // Окрема функція для очищення пошуку
  function clearSearch() {
    search = ''
  }

  async function loadOrders() {
    try {
      loading = true
      const res = await fetch('/api/orders')
      const data = await res.json()

      if (data.success) {
        orders = data.orders
      } else {
        error = data.error || 'Не вдалося завантажити замовлення'
      }
    } catch (err) {
      error = 'Помилка підключення'
      console.error(err)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadOrders()
  })

  let filteredOrders = $derived(
    orders.filter((order) => {
      const matchesSearch =
        order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        order.property.address.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.phone.includes(search)

      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter

      return matchesSearch && matchesStatus
    }),
  )

  // Функція для статусу з іконками та кольорами
  function getStatusInfo(status: string) {
    const info: Record<string, { label: string; variant: any; icon: any }> = {
      PENDING: {
        label: 'Нове',
        variant: 'outline',
        icon: AlertCircle,
      },
      CONFIRMED: {
        label: 'Підтверджено',
        variant: 'default',
        icon: CheckCircle,
      },
      IN_PROGRESS: {
        label: 'В роботі',
        variant: 'default',
        icon: Clock,
      },
      COMPLETED: {
        label: 'Виконано',
        variant: 'secondary',
        icon: CheckCircle,
      },
      CANCELED: {
        label: 'Скасовано',
        variant: 'destructive',
        icon: Ban,
      },
    }
    return (
      info[status] || { label: status, variant: 'outline', icon: AlertCircle }
    )
  }

  function formatAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return isNaN(num) ? '0' : num.toLocaleString('uk-UA')
  }
</script>

<div class="p-6 space-y-6">
  <!-- Хедер -->
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <h1 class="text-2xl font-semibold tracking-tight">
      Замовлення ({filteredOrders.length})
    </h1>

    <div class="flex flex-1 max-w-3xl items-center gap-3">
      <!-- Пошуковий інпут -->
      <div class="relative flex-1">
        <Search
          class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5"
        />

        <Input
          placeholder="Пошук за клієнтом або адресою..."
          bind:value={search}
          class="pl-11 "
        />

        {#if search}
          <button
            onclick={clearSearch}
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X class="w-5 h-5" />
          </button>
        {/if}
      </div>

      <!-- Фільтр по статусу -->
      <Select.Root type="single" bind:value={statusFilter}>
        <Select.Trigger class="h-80">
          {currentStatusLabel}
        </Select.Trigger>
        <Select.Content>
          {#each statusOptions as option (option.value)}
            <Select.Item value={option.value}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <!-- Кнопка Нове замовлення -->
      <Button href="/orders/new">
        <Plus class="mr-2 h-5 w-5" />
        Нове замовлення
      </Button>
    </div>
  </div>

  <!-- Таблиця -->
  <div class="overflow-x-auto rounded-2xl border">
    <Table.Root>
      <Table.Header class="bg-muted sticky top-0 z-10">
        <Table.Row>
          <Table.Head>Дата та час</Table.Head>
          <Table.Head>Клієнт</Table.Head>
          <Table.Head>Адреса</Table.Head>
          <Table.Head>Послуги</Table.Head>
          <Table.Head>Статус</Table.Head>
          <Table.Head class="text-right">Сума</Table.Head>
          <Table.Head>Клінер</Table.Head>
          <Table.Head class="w-24">Дії</Table.Head>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {#if loading}
          <Table.Row>
            <Table.Cell colspan={8} class="py-20 text-center"
              >Завантаження...</Table.Cell
            >
          </Table.Row>
        {:else if error}
          <Table.Row>
            <Table.Cell colspan={8} class="py-20 text-center text-red-500"
              >{error}</Table.Cell
            >
          </Table.Row>
        {:else if filteredOrders.length === 0}
          <Table.Row>
            <Table.Cell
              colspan={8}
              class="py-20 text-center text-muted-foreground"
            >
              Нічого не знайдено
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each filteredOrders as order}
            {@const statusInfo = getStatusInfo(order.status)}
            <Table.Row>
              <Table.Cell>
                <div class="flex flex-col">
                  <span class="font-medium">
                    {format(new Date(order.scheduledDate), 'dd MMMM yyyy', {
                      locale: uk,
                    })}
                  </span>
                  <span class="text-sm text-muted-foreground">
                    {format(new Date(order.scheduledDate), 'HH:mm')}
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div>
                  <p class="font-medium">{order.customer.name}</p>
                  <p class="text-sm text-muted-foreground">
                    {order.customer.phone}
                  </p>
                </div>
              </Table.Cell>
              <Table.Cell class="max-w-[260px]">
                {order.property.address}
              </Table.Cell>
              <Table.Cell>
                {order.items.map((i) => i.service.name).join(', ') || '—'}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={statusInfo.variant}
                  class="flex items-center gap-1.5"
                >
                  <svelte:component this={statusInfo.icon} class="w-4 h-4" />
                  {statusInfo.label}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-right font-semibold">
                {formatAmount(order.totalAmount)} ₴
              </Table.Cell>
              <Table.Cell>
                {#if order.cleaner?.name}
                  {order.cleaner.name}
                {:else}
                  <span class="text-muted-foreground">Не призначено</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit2 class="h-4 w-4" />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>
</div>
