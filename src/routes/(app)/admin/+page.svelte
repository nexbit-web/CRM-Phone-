<script lang="ts">
  import { enhance } from '$app/forms'
  
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { Plus, Trash, UsersRound } from '@lucide/svelte'
  import Button from '$lib/components/ui/button/button.svelte'

  let { data, form } = $props()

  let name = $state('')
  let email = $state('')
  let password = $state('')
</script>

<div class="p-6 max-w-4xl mx-auto space-y-8">
  <!-- Создать сотрудника -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-1.5"
        ><Plus /> Додати співробітника</CardTitle
      >
    </CardHeader>
    <CardContent>
      <form method="POST" action="?/create" use:enhance class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>Имя</Label>
            <Input name="name" placeholder="Иван" bind:value={name} required />
          </div>
          <div class="space-y-2">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              placeholder="ivan@crm.com"
              bind:value={email}
              required
            />
          </div>
          <div class="space-y-2">
            <Label>Пароль</Label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              bind:value={password}
              required
            />
          </div>
        </div>

        {#if form?.error}
          <p class="text-sm text-destructive">{form.error}</p>
        {/if}

        <Button type="submit" class="flex items-center gap-1.5"><Plus /> Додати</Button>
      </form>
    </CardContent>
  </Card>

  <!-- Список сотрудников -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-1.5"
        ><UsersRound /> Співробітники ({data.users.length})</CardTitle
      >
    </CardHeader>
    <CardContent>
      <div class="space-y-3">
        {#each data.users as user}
          <div class="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p class="font-medium">{user.name}</p>
              <p class="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div class="flex items-center gap-3">
              <Badge variant={user.role === 'OWNER' ? 'default' : 'secondary'}>
                {user.role === 'admin' ? 'Адмін' : 'Співробітник'}
              </Badge>
              {#if user.role !== 'user'}
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={user.id} />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="submit"
                    class="flex items-center gap-1.5 bg-red-600"
                  >
                    <Trash />
                    Видалити
                  </Button>
                </form>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </CardContent>
  </Card>
</div>
