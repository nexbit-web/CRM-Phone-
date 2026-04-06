import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const cleaners = await prisma.user.findMany({
    where: { role: 'cleaner', banned: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return json({ success: true, cleaners })
}
