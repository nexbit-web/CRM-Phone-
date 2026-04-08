import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

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
    const { customerId, street, apt, floor, area, type, city } = body

    if (!customerId || !street?.trim()) {
      return json(
        { success: false, error: "customerId та вулиця обов'язкові" },
        { status: 400 },
      )
    }

    // Маппінг типу на enum PropertyType
    const typeMap: Record<string, string> = {
      apartment: 'APARTMENT',
      house: 'HOUSE',
      office: 'OFFICE',
      commercial: 'COMMERCIAL',
      other: 'OTHER',
    }

    const property = await prisma.property.create({
      data: {
        customerId,
        street: street.trim(),
        apt: apt?.trim() || null,
        floor: floor ? Number(floor) : null,
        area: area ? Number(area) : null,
        type: (typeMap[type] ?? 'APARTMENT') as any,
        city: city?.trim() || '',
      },
    })

    return json({ success: true, property })
  } catch (error) {
    console.error("Помилка створення об'єкта:", error)
    return json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 },
    )
  }
}
