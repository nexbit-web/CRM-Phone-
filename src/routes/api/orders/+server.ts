import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import { z } from 'zod'
import type { RequestHandler } from './$types'

// ====================== ZOD СХЕМА (сумісна з zod v4) ======================
const CreateOrderSchema = z.object({
  customerName: z
    .string()
    .min(2, "Ім'я має бути не менше 2 символів")
    .max(100, "Ім'я занадто довге")
    .trim(),

  customerPhone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Невірний формат телефону')
    .trim(),

  address: z
    .string()
    .min(5, 'Адреса занадто коротка')
    .max(300, 'Адреса занадто довга')
    .trim(),

  scheduledDate: z.string().datetime({ message: 'Невірний формат дати' }),

  notes: z
    .string()
    .max(1000, 'Нотатки занадто довгі')
    .trim()
    .optional()
    .default(''),

  totalAmount: z
    .number({ error: 'Сума має бути числом' })
    .nonnegative("Сума не може бути від'ємною")
    .max(1_000_000, 'Сума занадто велика')
    .optional()
    .default(0),
})

// ====================== GET - Список замовлень ======================
export const GET: RequestHandler = async ({ request }) => {
  // ✅ Перевірка авторизації
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        property: true,
        cleaner: {
          select: { id: true, name: true, image: true },
        },
        items: {
          include: { service: true },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    })

    return json({ success: true, orders })
  } catch (error) {
    console.error('Помилка отримання замовлень:', error)
    return json(
      { success: false, error: 'Не вдалося завантажити замовлення' },
      { status: 500 },
    )
  }
}

// ====================== POST - Створення нового замовлення ======================
export const POST: RequestHandler = async ({ request }) => {
  try {
    // ✅ Перевірка авторизації
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return json(
        { success: false, error: 'Не авторизований' },
        { status: 401 },
      )
    }

    const body = await request.json()

    // ✅ Zod валідація
    const parsed = CreateOrderSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0].message
      return json({ success: false, error: firstError }, { status: 400 })
    }

    const {
      customerName,
      customerPhone,
      address,
      scheduledDate,
      notes,
      totalAmount,
    } = parsed.data

    // ✅ Транзакція — всі кроки або виконуються, або відкочуються
    const newOrder = await prisma.$transaction(async (tx) => {
      // Знаходимо або створюємо клієнта
      let customer = await tx.customer.findUnique({
        where: { phone: customerPhone },
      })

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerName,
            phone: customerPhone,
          },
        })
      }

      // Знаходимо або створюємо об'єкт нерухомості
      let property = await tx.property.findFirst({
        where: {
          customerId: customer.id,
          address: { contains: address, mode: 'insensitive' },
        },
      })

      if (!property) {
        property = await tx.property.create({
          data: {
            customerId: customer.id,
            address: address,
            city: 'Київ',
          },
        })
      }

      // Створюємо замовлення
      return tx.order.create({
        data: {
          scheduledDate: new Date(scheduledDate),
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          customerId: customer.id,
          propertyId: property.id,
          totalAmount: totalAmount,
          notes: notes,
          createdById: session.user.id,
        },
        include: {
          customer: true,
          property: true,
        },
      })
    })

    return json({
      success: true,
      message: 'Замовлення успішно створено!',
      order: newOrder,
    })
  } catch (error) {
    console.error('Помилка створення замовлення:', error)
    return json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 },
    )
  }
}
