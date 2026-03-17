<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { page } from '$app/stores'
  import type { Component } from 'svelte'
  import type { Icon } from '@lucide/svelte'

  type NavItem = {
    title: string
    url: string
    icon: Component<Icon>
  }

  let { items }: { items: NavItem[] } = $props()
</script>

<Sidebar.Group>
  <Sidebar.GroupContent>
    <Sidebar.Menu>
      {#each items as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive={$page.url.pathname === item.url}>
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
