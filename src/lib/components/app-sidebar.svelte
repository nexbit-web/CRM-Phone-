<script lang="ts" module>
  import PackagePlusIcon from '@lucide/svelte/icons/package-plus'
  import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list'
  import WrenchIcon from '@lucide/svelte/icons/wrench'
  import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check'
  import UsersIcon from '@lucide/svelte/icons/users'

  const navItems = [
    { title: 'Замовлення', url: '/orders', icon: ClipboardListIcon },
    { title: 'Нове замовлення', url: '/orders/new', icon: PackagePlusIcon },
    { title: 'Каталог', url: '/catalog', icon: WrenchIcon },
    { title: 'Закрити день', url: '/day', icon: CalendarCheckIcon },
    { title: 'Співробітники', url: '/admin', icon: UsersIcon },
  ]

  const data = {
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg',
    },
  }
</script>

<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { useSession } from '$lib/auth-client'
  import type { ComponentProps } from 'svelte'
  import NavMain from './nav-main.svelte'
  import NavUser from './nav-user.svelte'
  import { GalleryVerticalEnd } from '@lucide/svelte'

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()

  const session = useSession()
</script>

<Sidebar.Root {collapsible} {...restProps} bind:ref>
  <Sidebar.Header>
    <div class="flex items-center gap-2 px-2 py-2">
      <GalleryVerticalEnd />
      <div class="group-data-[collapsible=icon]:hidden">
        <p class="font-semibold text-sm">CRM Ремонт</p>
      </div>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <NavMain items={navItems} />
  </Sidebar.Content>
  <Sidebar.Footer>
    {#if $session?.data?.user}
      <NavUser
        user={{
          name: $session.data.user.name,
          email: $session.data.user.email,
        }}
      />
    {/if}
  </Sidebar.Footer>

  <Sidebar.Rail />
</Sidebar.Root>
