<script lang="ts">
  import * as Card from '$lib/components/ui/card/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { signIn } from '$lib/auth-client'
  import { goto } from '$app/navigation'
  import { Spinner } from './ui/spinner'

  let email = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  // Валідація
  let emailError = $derived(
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Невірний формат email'
      : '',
  )

  let passwordError = $derived(
    password.length > 0 && password.length < 6
      ? 'Пароль має бути не менше 6 символів'
      : '',
  )

  let isDisabled = $derived(
    loading || !email || !password || !!emailError || !!passwordError,
  )

  async function handleLogin() {
    loading = true
    error = ''

    const result = await signIn.email({ email, password })

    if (result.error) {
      error = 'Невірний email або пароль'
      loading = false
      return
    }

    goto('/orders')
  }
</script>

<div class="flex flex-col gap-6">
  <Card.Root class="overflow-hidden p-0 ">
    <Card.Content class="grid p-0 md:grid-cols-2 h-[75vh]">
      <!-- Форма -->
      <div class="p-8 flex flex-col justify-center">
        <div class="flex flex-col items-center gap-2 text-center mb-8">
          <h1 class="text-2xl font-bold">ProClean CRM</h1>
          <p class="text-muted-foreground text-sm">
            Введіть свої дані для входу
          </p>
        </div>

        <div class="flex flex-col gap-4">
          <!-- Email -->
          <div class="flex flex-col gap-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              bind:value={email}
              class={emailError ? 'border-destructive' : ''}
            />
            {#if emailError}
              <p class="text-xs text-destructive">{emailError}</p>
            {/if}
          </div>

          <!-- Пароль -->
          <div class="flex flex-col gap-1.5">
            <Label for="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              bind:value={password}
              class={passwordError ? 'border-destructive' : ''}
              onkeydown={(e) =>
                e.key === 'Enter' && !isDisabled && handleLogin()}
            />
            {#if passwordError}
              <p class="text-xs text-destructive">{passwordError}</p>
            {/if}
          </div>

          <!-- Загальна помилка -->
          {#if error}
            <div
              class="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md"
            >
              {error}
            </div>
          {/if}

          <!-- Кнопка -->
          <Button
            class="w-full mt-2"
            onclick={handleLogin}
            disabled={isDisabled}
          >
            {#if loading}
              <Spinner />
            {:else}
              Увійти
            {/if}
          </Button>
        </div>
      </div>
      <div class="bg-muted relative hidden md:block">
        <img
          src="/login-img.jpg"
          alt="placeholder"
          class="absolute inset-0 h-full w-full object-cover object-left dark:brightness-[0.9]  "
        />
      </div>
    </Card.Content>
  </Card.Root>
</div>
