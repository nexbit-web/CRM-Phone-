import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import { z } from 'zod'
import type { RequestHandler } from './$types'

// ── GET: список замовлень ────────────────────────────────
export const GET: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        property: true,
        cleaner: { select: { id: true, name: true, image: true } },
        items: { include: { service: true } },
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

// ── Zod схема ────────────────────────────────────────────
const CreateOrderSchema = z.object({
  customerName: z.string().min(2).max(100).trim(),
  customerPhone: z.string().min(7).max(25).trim(),
  // Підтримуємо обидва варіанти: address (стара) і street (нова схема)
  address: z.string().min(3).max(300).trim().optional(),
  street: z.string().min(3).max(300).trim().optional(),
  city: z.string().max(100).trim().optional().default(''),
  propertyId: z.string().optional(), // якщо передаємо готовий ID
  scheduledDate: z.string(),
  notes: z.string().max(1000).trim().optional().default(''),
  totalAmount: z.number().nonnegative().max(1_000_000).optional().default(0),
  cleanerId: z.string().optional(),
  cleaningType: z.string().optional(),
})

// ── POST: створення замовлення ───────────────────────────
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
    const parsed = CreateOrderSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Zod errors:', parsed.error.issues)
      return json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const {
      customerName,
      customerPhone,
      address,
      street,
      city,
      propertyId,
      scheduledDate,
      notes,
      totalAmount,
      cleanerId,
    } = parsed.data

    // street або address — береємо що прийшло
    const streetValue = (street ?? address ?? '').trim()

    if (!streetValue && !propertyId) {
      return json(
        { success: false, error: "Вкажіть адресу або оберіть об'єкт" },
        { status: 400 },
      )
    }

    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Клієнт
      let customer = await tx.customer.findUnique({
        where: { phone: customerPhone },
      })
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: customerName, phone: customerPhone },
        })
      }

      // 2. Об'єкт нерухомості
      let property
      if (propertyId) {
        // Якщо передали готовий ID — використовуємо його
        property = await tx.property.findUnique({ where: { id: propertyId } })
        if (!property) throw new Error("Об'єкт не знайдено")
      } else {
        // ✅ Шукаємо по street (нова схема)
        property = await tx.property.findFirst({
          where: {
            customerId: customer.id,
            street: { contains: streetValue, mode: 'insensitive' },
          },
        })
        if (!property) {
          // ✅ Створюємо з полем street (нова схема)
          property = await tx.property.create({
            data: {
              customerId: customer.id,
              street: streetValue,
              city: city,
            },
          })
        }
      }

      return tx.order.create({
        data: {
          scheduledDate: new Date(scheduledDate),
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          customerId: customer.id,
          propertyId: property.id,
          totalAmount: Number(totalAmount),
          notes: notes.trim(),
          createdById: session.user.id,
          ...(cleanerId ? { cleanerId } : {}),
        },
        include: { customer: true, property: true },
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
