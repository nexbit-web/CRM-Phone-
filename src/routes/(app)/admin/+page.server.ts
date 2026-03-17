import { auth } from '$lib/auth'
import prisma from '$lib/prisma'
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return { users }
}

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name') as string
    const email = data.get('email') as string
    const password = data.get('password') as string

    if (!name || !email || !password) {
      return fail(400, { error: 'Заполните все поля' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return fail(400, { error: 'Email уже используется' })
    }

    // Better-Auth сам шифрует пароль ✅
    await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: 'user',
      },
    })

    return { success: true }
  },

  delete: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string

    await prisma.user.delete({ where: { id } })
    return { success: true }
  },
}
