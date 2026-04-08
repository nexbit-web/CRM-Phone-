import prisma from '$lib/server/prisma'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Не авторизований')

  const cleaners = await prisma.user.findMany({
    where: { role: 'cleaner' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      banned: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return { cleaners }
}
