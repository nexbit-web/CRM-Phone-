import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

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

    const { name, phone, email, companyName, notes } = body

    if (!name?.trim() || !phone?.trim()) {
      return json(
        { success: false, error: 'Ім’я та телефон обов’язкові' },
        { status: 400 },
      )
    }

    // Перевіряємо, чи вже існує клієнт з таким телефоном
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
    })

    if (existingCustomer) {
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
        companyName: companyName?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return json({
      success: true,
      message: 'Клієнт успішно створений',
      customer: newCustomer,
    })
  } catch (error) {
    console.error('Помилка створення клієнта:', error)
    return json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 },
    )
  }
}
