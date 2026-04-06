<script lang="ts">
  import AppSidebar from '$lib/components/app-sidebar.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import Header from '$lib/components/Header.svelte'
  import { useSession } from '$lib/auth-client'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  let { children } = $props()

  const session = useSession()

  onMount(() => {
    const unsubscribe = session.subscribe((s) => {
      if (s.isPending) return
      if (!s.data?.user) {
        goto('/login', { replaceState: true })
      }
    })
    return unsubscribe
  })
</script>

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    <Header />
    <main class="p-3">
      {@render children()}
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>
