import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const year = Number(url.searchParams.get('year') ?? new Date().getFullYear())
  const month = Number(
    url.searchParams.get('month') ?? new Date().getMonth() + 1,
  )

  // Беремо весь місяць + кілька днів з боків для відображення
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59)

  const orders = await prisma.order.findMany({
    where: {
      scheduledDate: { gte: from, lte: to },
    },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      customer: { select: { name: true, phone: true } },
      property: { select: { street: true, apt: true, city: true } },
      cleaner: { select: { name: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  })

  // Серіалізуємо Decimal
  const serialized = orders.map((o) => ({
    ...o,
    totalAmount: parseFloat(o.totalAmount.toString()),
  }))

  return json({ success: true, orders: serialized })
}
