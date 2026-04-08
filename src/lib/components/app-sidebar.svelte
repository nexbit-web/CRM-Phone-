<script lang="ts" module>
  import type { Component } from 'svelte'
  import type { IconProps } from '@lucide/svelte'
  import {
    ClipboardList,
    PackagePlus,
    CalendarDays,
    Contact,
    Users,
    Wallet,
    Sparkles,
    Settings,
    ShieldUser,
    UserPlus,
  } from '@lucide/svelte'

  type NavItem = {
    title: string
    url: string
    icon: Component<IconProps>
  }

  const navItems: NavItem[] = [
    { title: 'Замовлення', url: '/orders', icon: ClipboardList },
    { title: 'Нове замовлення', url: '/orders/new', icon: PackagePlus },
    { title: 'Календар', url: '/calendar', icon: CalendarDays },
    { title: 'Клієнти', url: '/clients', icon: Contact },
    { title: 'Додати клієнта', url: '/clients/new', icon: UserPlus },
    { title: 'Персонал', url: '/staff', icon: Users },
    { title: 'Фінанси', url: '/finance', icon: Wallet },
    { title: 'Послуги та ціни', url: '/services', icon: Sparkles },
    { title: 'Адмін', url: '/admin', icon: ShieldUser },
    { title: 'Налаштування', url: '/settings', icon: Settings },
  ]
</script>

<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { GalleryVerticalEnd } from '@lucide/svelte'
  import { useSession } from '$lib/auth-client'
  import type { ComponentProps } from 'svelte'
  import NavMain from './nav-main.svelte'
  import NavUser from './nav-user.svelte'

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
        <p
          class="scroll-m-20 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
        >
          ProClean
        </p>
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
