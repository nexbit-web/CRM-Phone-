<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { page } from '$app/stores'
  import type { Component } from 'svelte'
  import type { IconProps } from '@lucide/svelte'

  type NavItem = {
    title: string
    url: string
    icon: Component<IconProps>
  }

  let { items }: { items: NavItem[] } = $props()

  // Основна функція перевірки активної вкладки
  function isActive(url: string): boolean {
    const pathname = $page.url.pathname

    if (url === '/orders') {
      return (
        pathname === '/orders' ||
        (pathname.startsWith('/orders/') && !pathname.startsWith('/orders/new'))
      )
    }
    return pathname === url
  }
</script>

<Sidebar.Group>
  <Sidebar.GroupContent>
    <Sidebar.Menu>
      {#each items as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive={isActive(item.url)}>
            {#snippet child({ props })}
              <a href={item.url} {...props}>
                <item.icon />
                <span>{item.title}</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
