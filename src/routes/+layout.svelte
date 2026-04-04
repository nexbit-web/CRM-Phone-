<script lang="ts">
  import 'nprogress/nprogress.css'
  import './layout.css'
  import { Toaster } from 'svelte-hot-french-toast'
  import favicon from '$lib/assets/favicon.svg'
  import { ModeWatcher } from 'mode-watcher'

  import { beforeNavigate, afterNavigate } from '$app/navigation'
  import NProgress from 'nprogress'

  let { children } = $props()

  NProgress.configure({
    showSpinner: false,
  })

  beforeNavigate(() => {
    NProgress.start()
  })

  afterNavigate(() => {
    NProgress.done()
  })
</script>

<Toaster
  position="top-center"
  reverseOrder={false}
  toastOptions={{ duration: 4000 }}
/>
<ModeWatcher />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
