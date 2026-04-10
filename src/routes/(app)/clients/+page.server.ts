import prisma from '$lib/server/prisma'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const PER_PAGE = 20

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw error(401, 'Не авторизований')

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const q = url.searchParams.get('q')?.trim() ?? ''

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.customer.count({ where }),
  ])

  return {
    customers,
    total,
    page,
    perPage: PER_PAGE,
    q,
  }
}
