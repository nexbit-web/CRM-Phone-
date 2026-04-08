import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const properties = await prisma.property.findMany({
    where: { customerId: params.id },
    select: {
      id: true,
      street: true,
      apt: true,
      floor: true,
      city: true,
      area: true,
      type: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return json({ success: true, properties })
}
