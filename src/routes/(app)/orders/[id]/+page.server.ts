import prisma from '$lib/server/prisma'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Не авторизований')
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      property: true,
      cleaner: { select: { id: true, name: true, image: true } },
      items: { include: { service: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!order) {
    throw error(404, 'Замовлення не знайдено')
  }

  const cleaners = await prisma.user.findMany({
    where: { role: 'cleaner', banned: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // ✅ Конвертуємо Decimal → number, бо SvelteKit не може серіалізувати Prisma Decimal
  return {
    order: {
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      paidAmount: parseFloat(order.paidAmount.toString()),
      items: order.items.map((item) => ({
        ...item,
        price: parseFloat(item.price.toString()),
        service: {
          ...item.service,
          basePrice: parseFloat(item.service.basePrice.toString()),
        },
      })),
    },
    cleaners,
  }
}
