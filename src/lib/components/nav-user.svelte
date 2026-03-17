<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { useSidebar } from '$lib/components/ui/sidebar/index.js'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import { signOut } from '$lib/auth-client'
  import { goto } from '$app/navigation'

  let { user }: { user: { name: string; email: string } } = $props()

  const sidebar = useSidebar()

  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          goto('/login', { replaceState: true })
        },
      },
    })
  }

  // Ініціали для аватара
  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            <Avatar.Root class="size-8 rounded-lg">
              <Avatar.Fallback class="rounded-lg">
                {getInitials(user.name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon class="ms-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar.Root class="size-8 rounded-lg">
              <Avatar.Fallback class="rounded-lg">
                {getInitials(user.name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenu.Label>

        <DropdownMenu.Separator />

        <DropdownMenu.Item onclick={handleLogout}>
          <LogOutIcon />
          Вийти
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
