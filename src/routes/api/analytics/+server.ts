import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

function toNum(d: unknown): number {
  return parseFloat(String(d ?? 0)) || 0
}

export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const period = url.searchParams.get('period') ?? 'month'
  const year = parseInt(
    url.searchParams.get('year') ?? String(new Date().getFullYear()),
  )
  const month = parseInt(
    url.searchParams.get('month') ?? String(new Date().getMonth() + 1),
  )

  // ─── Діапазон дат ───────────────────────────────────────
  let from: Date
  let to: Date

  if (period === 'week') {
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
    from = new Date(now)
    from.setDate(now.getDate() - dow)
    from.setHours(0, 0, 0, 0)
    to = new Date(from)
    to.setDate(from.getDate() + 6)
    to.setHours(23, 59, 59, 999)
  } else if (period === 'month') {
    from = new Date(year, month - 1, 1)
    to = new Date(year, month, 0, 23, 59, 59, 999)
  } else {
    from = new Date(year, 0, 1)
    to = new Date(year, 11, 31, 23, 59, 59, 999)
  }

  // ─── Запити до БД паралельно ────────────────────────────
  const [orders, generalExpenses] = await Promise.all([
    prisma.order.findMany({
      where: { scheduledDate: { gte: from, lte: to } },
      include: {
        customer: { select: { name: true } },
        property: { select: { street: true, city: true } },
        expenses: { select: { amount: true } },
        workers: {
          select: {
            user: { select: { name: true } },
            workerPay: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { orderId: null, date: { gte: from, lte: to } },
      select: { amount: true },
    }),
  ])

  // ─── Один прохід — розрахунок по кожному замовленню ────
  type OrderCalc = {
    id: string
    date: Date
    status: string
    paymentStatus: string
    customerId: string
    customerName: string
    address: string
    revenue: number
    expenses: number
    payroll: number
    workers: string[]
    monthKey: string
  }

  const calc: OrderCalc[] = orders.map((o) => {
    const d = new Date(o.scheduledDate)
    return {
      id: o.id,
      date: o.scheduledDate,
      status: o.status,
      paymentStatus: o.paymentStatus,
      customerId: o.customerId,
      customerName: o.customer.name,
      address: `${o.property.street}, ${o.property.city}`,
      revenue: toNum(o.totalAmount),
      expenses: o.expenses.reduce((s, e) => s + toNum(e.amount), 0),
      payroll: o.workers.reduce((s, w) => s + toNum(w.workerPay), 0),
      workers: o.workers.map((w) => w.user.name),
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    }
  })

  // ─── Зведені показники (один цикл) ──────────────────────
  let completedOrders = 0
  let canceledOrders = 0
  let totalRevenue = 0
  let orderExpenses = 0
  let totalPayroll = 0
  let pendingOrders = 0
  let confirmedOrders = 0
  let inProgressOrders = 0

  for (const o of calc) {
    // Виручку рахуємо тільки для виконаних замовлень
    if (o.status === 'COMPLETED') {
      totalRevenue += o.revenue
    }
    orderExpenses += o.expenses
    totalPayroll += o.payroll
    switch (o.status) {
      case 'COMPLETED':
        completedOrders++
        break
      case 'CANCELED':
        canceledOrders++
        break
      case 'PENDING':
        pendingOrders++
        break
      case 'CONFIRMED':
        confirmedOrders++
        break
      case 'IN_PROGRESS':
        inProgressOrders++
        break
    }
  }

  const totalOrders = calc.length
  const genExpenses = generalExpenses.reduce((s, e) => s + toNum(e.amount), 0)
  const totalExpenses = orderExpenses + genExpenses
  const profit = totalRevenue - totalExpenses - totalPayroll

  // ─── Динаміка по місяцях ────────────────────────────────
  const monthlyMap: Record<
    string,
    { revenue: number; expenses: number; orders: number }
  > = {}
  for (let m = 1; m <= 12; m++) {
    monthlyMap[`${year}-${String(m).padStart(2, '0')}`] = {
      revenue: 0,
      expenses: 0,
      orders: 0,
    }
  }

  for (const o of calc) {
    const slot = monthlyMap[o.monthKey]
    if (slot) {
      slot.orders++
      // Виручку по місяцях теж тільки для виконаних
      if (o.status === 'COMPLETED') {
        slot.revenue += o.revenue
      }
      slot.expenses += o.expenses
    }
  }

  const monthly = Object.entries(monthlyMap).map(([key, val]) => ({
    month: key,
    ...val,
    profit: val.revenue - val.expenses,
  }))

  // ─── Топ клієнти ────────────────────────────────────────
  const customerMap = new Map<
    string,
    { name: string; orders: number; revenue: number }
  >()

  for (const o of calc) {
    const existing = customerMap.get(o.customerId)
    if (existing) {
      existing.orders++
      // Виручку для топ клієнтів теж тільки для виконаних
      if (o.status === 'COMPLETED') {
        existing.revenue += o.revenue
      }
    } else {
      customerMap.set(o.customerId, {
        name: o.customerName,
        orders: 1,
        revenue: o.status === 'COMPLETED' ? o.revenue : 0,
      })
    }
  }

  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ─── Відповідь ──────────────────────────────────────────
  return json({
    success: true,
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      type: period,
      year,
      month,
    },
    summary: {
      totalOrders,
      completedOrders,
      canceledOrders,
      totalRevenue,
      totalExpenses,
      totalPayroll,
      profit,
      avgOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
    },
    monthly,
    topCustomers,
    statusBreakdown: {
      PENDING: pendingOrders,
      CONFIRMED: confirmedOrders,
      IN_PROGRESS: inProgressOrders,
      COMPLETED: completedOrders,
      CANCELED: canceledOrders,
    },
    orders: calc.map((o) => ({
      id: o.id,
      date: o.date,
      status: o.status,
      paymentStatus: o.paymentStatus,
      customer: o.customerName,
      address: o.address,
      revenue: o.revenue,
      expenses: o.expenses,
      payroll: o.payroll,
      workers: o.workers,
    })),
  })
}
