<script lang="ts">
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Breadcrumb from '$lib/components/ui/breadcrumb'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import ModeToggle from './ModeToggle.svelte'
  import { page } from '$app/stores'
  import { ClipboardList } from 'lucide-svelte'

  const titles: Record<string, string> = {
    '/dashboard': 'Дашборд',
    '/orders': 'Замовлення',
    '/orders/new': 'Нове замовлення',
    '/catalog': 'Каталог',
    '/day': 'Закрити день',
    '/admin': 'Співробітники',
  }
</script>

<header
  class="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4"
>
  <div class="flex items-center h-full shrink-0 gap-2">
    <Sidebar.Trigger class="-ms-1" />
    <Separator orientation="vertical" class="me-2 h-4" />
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Page class="flex  gap-1">
            <div class="flex items-center gap-1 text-muted-foreground mb-1">
              <ClipboardList class="h-3.5 w-3.5" />
              <span>CRM</span>
              <span class="mx-0.5">/</span>
            </div>
            {titles[$page.url.pathname] ?? 'CRM'}
          </Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>

  <ModeToggle />
</header>
