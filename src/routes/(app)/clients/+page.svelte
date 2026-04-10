<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Table from '$lib/components/ui/table'
  import * as Pagination from '$lib/components/ui/pagination/index.js'
  import {
    Search,
    X,
    Plus,
    Users,
    Phone,
    Mail,
    ClipboardList,
    ChevronRight,
  } from 'lucide-svelte'
  import { format } from 'date-fns'
  import { uk } from 'date-fns/locale'

  let { data } = $props()

  let search = $state(data.q)
  let searchTimeout: ReturnType<typeof setTimeout>

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    search = val
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      const params = new URLSearchParams($page.url.searchParams)
      if (val.trim()) {
        params.set('q', val.trim())
      } else {
        params.delete('q')
      }
      params.set('page', '1')
      goto(`?${params}`, { replaceState: true })
    }, 300)
  }

  function clearSearch() {
    search = ''
    const params = new URLSearchParams($page.url.searchParams)
    params.delete('q')
    params.set('page', '1')
    goto(`?${params}`, { replaceState: true })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams($page.url.searchParams)
    params.set('page', String(p))
    goto(`?${params}`)
  }

  const totalPages = $derived(Math.ceil(data.total / data.perPage))
</script>

<div class="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-5">
  <!-- Заголовок -->
  <div class="flex items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight leading-none">
        Клієнти
        <span class="ml-1 text-base font-normal text-muted-foreground">
          ({data.total})
        </span>
      </h1>
    </div>
    <Button href="/clients/new" size="sm" class="h-9">
      <Plus class="h-4 w-4" />
      <span>Новий клієнт</span>
    </Button>
  </div>

  <!-- Пошук -->

  <div class="relative max-w-5xl">
    <Search
      class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
    />
    <Input
      placeholder="Пошук за іменем, телефоном, email..."
      value={search}
      oninput={onSearchInput}
      class="h-9 pl-9 pr-9"
    />
    {#if search}
      <button
        onclick={clearSearch}
        class="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>

  <!-- Порожній стан -->
  {#if data.customers.length === 0}
    <div class="rounded-xl border bg-card p-16 text-center shadow-sm">
      <Users class="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
      <p class="text-lg font-semibold">
        {data.q ? 'Нічого не знайдено' : 'Клієнтів ще немає'}
      </p>
      <p class="text-sm text-muted-foreground mt-1">
        {data.q
          ? 'Спробуйте змінити пошуковий запит'
          : 'Додайте першого клієнта, натиснувши кнопку вище'}
      </p>
      {#if data.q}
        <Button variant="outline" size="sm" class="mt-4" onclick={clearSearch}>
          Скинути пошук
        </Button>
      {/if}
    </div>
  {:else}
    <!-- Таблиця (десктоп) -->
    <div
      class="hidden lg:block rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50 hover:bg-muted/50">
            <Table.Head class="font-semibold text-foreground pl-5"
              >Клієнт</Table.Head
            >
            <Table.Head class="font-semibold text-foreground"
              >Телефон</Table.Head
            >
            <Table.Head class="font-semibold text-foreground">Email</Table.Head>
            <Table.Head class="font-semibold text-foreground"
              >Замовлень</Table.Head
            >
            <Table.Head class="font-semibold text-foreground"
              >Дата реєстрації</Table.Head
            >
            <Table.Head class="pr-5"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.customers as customer (customer.id)}
            <Table.Row
              class="hover:bg-muted/30 transition-colors cursor-pointer"
              onclick={() => goto(`/clients/${customer.id}`)}
            >
              <Table.Cell class="pl-5">
                <div class="flex items-center gap-3">
                  <div
                    class="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <p class="font-medium text-sm">{customer.name}</p>
                    {#if customer.notes}
                      <p
                        class="text-xs text-muted-foreground truncate max-w-[200px]"
                      >
                        {customer.notes}
                      </p>
                    {/if}
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div
                  class="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Phone class="h-3.5 w-3.5 shrink-0" />
                  {customer.phone}
                </div>
              </Table.Cell>
              <Table.Cell>
                {#if customer.email}
                  <div
                    class="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Mail class="h-3.5 w-3.5 shrink-0" />
                    {customer.email}
                  </div>
                {:else}
                  <span class="text-muted-foreground/40 text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-1.5">
                  <ClipboardList class="h-3.5 w-3.5 text-muted-foreground" />
                  <span class="text-sm font-medium"
                    >{customer._count.orders}</span
                  >
                </div>
              </Table.Cell>
              <Table.Cell>
                <span class="text-sm text-muted-foreground">
                  {format(new Date(customer.createdAt), 'd MMM yyyy', {
                    locale: uk,
                  })}
                </span>
              </Table.Cell>
              <Table.Cell class="pr-5 text-right">
                <ChevronRight
                  class="h-4 w-4 text-muted-foreground/40 ml-auto"
                />
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <!-- Мобільні картки -->
    <div class="grid gap-3 lg:hidden">
      {#each data.customers as customer (customer.id)}
        <div
          class="rounded-xl border bg-card shadow-sm p-4 cursor-pointer hover:border-primary/40 transition-colors"
          onclick={() => goto(`/clients/${customer.id}`)}
        >
          <div class="flex items-center gap-3">
            <div
              class="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0"
            >
              {getInitials(customer.name)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm">{customer.name}</p>
              <p class="text-xs text-muted-foreground">{customer.phone}</p>
            </div>
            <div
              class="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            >
              <ClipboardList class="h-3.5 w-3.5" />
              {customer._count.orders}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Пагінація -->
    {#if totalPages > 1}
      <div class="flex justify-center pt-2">
        <Pagination.Root
          count={data.total}
          perPage={data.perPage}
          page={data.page}
        >
          {#snippet children({ pages, currentPage })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.PrevButton
                  onclick={() => goToPage(data.page - 1)}
                />
              </Pagination.Item>
              {#each pages as p (p.key)}
                {#if p.type === 'ellipsis'}
                  <Pagination.Item>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                {:else}
                  <Pagination.Item>
                    <Pagination.Link
                      page={p}
                      isActive={currentPage === p.value}
                      onclick={() => goToPage(p.value)}
                    >
                      {p.value}
                    </Pagination.Link>
                  </Pagination.Item>
                {/if}
              {/each}
              <Pagination.Item>
                <Pagination.NextButton
                  onclick={() => goToPage(data.page + 1)}
                />
              </Pagination.Item>
            </Pagination.Content>
          {/snippet}
        </Pagination.Root>
      </div>
    {/if}
  {/if}
</div>
