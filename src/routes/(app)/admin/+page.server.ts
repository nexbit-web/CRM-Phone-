import { auth } from '$lib/auth'
import prisma from '$lib/server/prisma'
import { fail, error } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

// ✅ Хелпер — перевіряє що запит від адміна, інакше кидає 403
async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) {
    throw error(401, 'Не авторизований')
  }

  if (session.user.role !== 'admin') {
    throw error(403, 'Доступ заборонено')
  }

  return session.user
}

// ====================== LOAD ======================
export const load: PageServerLoad = async ({ request }) => {
  // ✅ Перевірка ролі також на load — захист від прямого SSR-запиту
  await requireAdmin(request)

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

// ====================== ACTIONS ======================
export const actions: Actions = {
  create: async ({ request }) => {
    // ✅ Перевірка ролі перед створенням
    await requireAdmin(request)

    const data = await request.formData()
    const name = data.get('name') as string
    const email = data.get('email') as string
    const password = data.get('password') as string

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return fail(400, { error: 'Заповніть всі поля' })
    }

    if (password.length < 8) {
      return fail(400, { error: 'Пароль має бути не менше 8 символів' })
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim() },
    })
    if (existing) {
      return fail(400, { error: 'Email вже використовується' })
    }

    await auth.api.createUser({
      body: {
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'user',
      },
    })

    return { success: true }
  },

  delete: async ({ request }) => {
    // ✅ Перевірка ролі перед видаленням
    const admin = await requireAdmin(request)

    const data = await request.formData()
    const id = data.get('id') as string

    if (!id) {
      return fail(400, { error: 'ID користувача не вказано' })
    }

    // ✅ Захист від самовидалення
    if (id === admin.id) {
      return fail(400, { error: 'Не можна видалити самого себе' })
    }

    await prisma.user.delete({ where: { id } })

    return { success: true }
  },
}
