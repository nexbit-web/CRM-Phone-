import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import { z } from 'zod'
import type { RequestHandler } from './$types'

const CreateStaffSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim().optional(),
  phone: z.string().max(25).trim().optional(),
})

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateStaffSchema.safeParse(body)

  if (!parsed.success) {
    return json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 },
    )
  }

  const { name, email, phone } = parsed.data

  try {
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return json(
          { success: false, error: 'Користувач з таким email вже існує' },
          { status: 400 },
        )
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email || `cleaner_${Date.now()}@internal.local`,
        phone: phone || null,
        role: 'cleaner',
        emailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        banned: true,
        createdAt: true,
      },
    })

    return json({ success: true, user })
  } catch (error) {
    console.error(error)
    return json({ success: false, error: 'Помилка сервера' }, { status: 500 })
  }
}
