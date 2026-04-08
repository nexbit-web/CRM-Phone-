import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  const { banned } = await request.json()

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { banned },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      banned: true,
      createdAt: true,
    },
  })

  return json({ success: true, user })
}

export const DELETE: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return json({ success: false, error: 'Не авторизований' }, { status: 401 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return json({ success: true })
}
