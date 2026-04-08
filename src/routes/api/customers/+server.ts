import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

// ── GET: пошук клієнтів ─────────────────────────────────
export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const q = url.searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 1) {
    return json({ success: true, customers: [] })
  }

  // ✅ companyName прибрано — його немає в новій схемі Customer
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
    orderBy: { name: 'asc' },
    take: 10,
  })

  return json({ success: true, customers })
}

// ── POST: створення клієнта ──────────────────────────────
export const POST: RequestHandler = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return json(
        { success: false, error: 'Не авторизований' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { name, phone, email, notes } = body

    if (!name?.trim() || !phone?.trim()) {
      return json(
        { success: false, error: "Ім'я та телефон обов'язкові" },
        { status: 400 },
      )
    }

    const existing = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
    })

    if (existing) {
      return json(
        { success: false, error: 'Клієнт з таким телефоном вже існує' },
        { status: 409 },
      )
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return json({ success: true, customer: newCustomer })
  } catch (error) {
    console.error('Помилка створення клієнта:', error)
    return json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 },
    )
  }
}
