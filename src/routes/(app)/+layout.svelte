<script lang="ts">
  import AppSidebar from '$lib/components/app-sidebar.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import Header from '$lib/components/Header.svelte'

  let { children } = $props()

  const titles: Record<string, string> = {
    '/dashboard': 'Дашборд',
    '/orders': 'Замовлення',
    '/orders/new': 'Нове замовлення',
    '/catalog': 'Каталог',
    '/day': 'Закрити день',
    '/admin': 'Співробітники',
  }
</script>

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    <Header />

    <main class="p-6">
      {@render children()}
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>
