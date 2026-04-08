import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import { z } from 'zod'
import type { RequestHandler } from './$types'

const UpdateOrderSchema = z.object({
  status: z
    .enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
    .optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID']).optional(),
  cleanerId: z.string().nullable().optional(),
  scheduledDate: z.string().optional(),
  totalAmount: z.number().nonnegative().max(1_000_000).optional(),
  notes: z.string().max(1000).trim().optional(),
  customerName: z.string().min(2).max(100).trim().optional(),
  street: z.string().min(5).max(300).trim().optional(),
  city: z.string().max(100).trim().optional(),
  customerPhone: z
    .string()
    .min(7, 'Телефон занадто короткий')
    .max(25)
    .trim()
    .optional(),
})

export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      property: true,
      cleaner: { select: { id: true, name: true, image: true } },
      items: { include: { service: true } },
      createdBy: { select: { id: true, name: true } },
      reminders: { orderBy: { sentAt: 'desc' }, take: 5 },
    },
  })

  if (!order) {
    return json(
      { success: false, error: 'Замовлення не знайдено' },
      { status: 404 },
    )
  }

  // Список клінерів для селекту
  const cleaners = await prisma.user.findMany({
    where: { role: 'cleaner', banned: false },
    select: { id: true, name: true, image: true },
    orderBy: { name: 'asc' },
  })

  return json({ success: true, order, cleaners })
}

export const PATCH: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const body = await request.json()
  console.log('PATCH body:', JSON.stringify(body))

  const parsed = UpdateOrderSchema.safeParse(body)

  if (!parsed.success) {
    console.error('Zod errors:', parsed.error.issues)
    const firstError = parsed.error.issues[0].message
    return json({ success: false, error: firstError }, { status: 400 })
  }

  const {
    status,
    paymentStatus,
    cleanerId,
    scheduledDate,
    totalAmount,
    notes,
    customerName,
    customerPhone,
    street,
    city,
  } = parsed.data

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: params.id },
        include: { customer: true, property: true },
      })

      if (!existingOrder) throw new Error('Замовлення не знайдено')

      if (customerName || customerPhone) {
        await tx.customer.update({
          where: { id: existingOrder.customerId },
          data: {
            ...(customerName && { name: customerName }),
            ...(customerPhone && { phone: customerPhone }),
          },
        })
      }

      if (street || city) {
        await tx.property.update({
          where: { id: existingOrder.propertyId },
          data: {
            ...(street && { street }),
            ...(city !== undefined && { city }),
          },
        })
      }

      return tx.order.update({
        where: { id: params.id },
        data: {
          ...(status && { status }),
          ...(paymentStatus && { paymentStatus }),
          ...(cleanerId !== undefined && { cleanerId }),
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          customer: true,
          property: true,
          cleaner: { select: { id: true, name: true, image: true } },
          items: { include: { service: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })
    })

    return json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Помилка оновлення замовлення:', error)
    return json(
      { success: false, error: 'Не вдалося оновити замовлення' },
      { status: 500 },
    )
  }
}
