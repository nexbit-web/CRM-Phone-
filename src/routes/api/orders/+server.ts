import { json } from '@sveltejs/kit'
import prisma from '$lib/server/prisma'
import { auth } from '$lib/auth' 
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        property: true,
        cleaner: {
          select: { id: true, name: true, image: true },
        },
        items: {
          include: { service: true },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    })

    return json({ success: true, orders })
  } catch (error) {
    console.error('Помилка отримання замовлень:', error)
    return json(
      { success: false, error: 'Не вдалося завантажити замовлення' },
      { status: 500 },
    )
  }
}

// ====================== POST - Створення нового замовлення ======================
export const POST: RequestHandler = async ({ request }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user) {
			return json({ success: false, error: 'Не авторизований' }, { status: 401 });
		}

		const body = await request.json();

		const {
			customerName,
			customerPhone,
			address,
			scheduledDate,
			notes = '',
			totalAmount = 0
		} = body;

		// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
		if (!customerName?.trim() || !customerPhone?.trim() || !address?.trim() || !scheduledDate) {
			return json({ 
				success: false, 
				error: 'Заповніть ім’я клієнта, телефон, адресу та дату' 
			}, { status: 400 });
		}

		// Створюємо або знаходимо клієнта
		let customer = await prisma.customer.findUnique({
			where: { phone: customerPhone.trim() }
		});

		if (!customer) {
			customer = await prisma.customer.create({
				data: {
					name: customerName.trim(),      // ← беремо з форми
					phone: customerPhone.trim()     // ← беремо з форми
				}
			});
		}

		// Створюємо або знаходимо об'єкт
		let property = await prisma.property.findFirst({
			where: {
				customerId: customer.id,
				address: { contains: address.trim(), mode: 'insensitive' }
			}
		});

		if (!property) {
			property = await prisma.property.create({
				data: {
					customerId: customer.id,
					address: address.trim(),
					city: 'Київ'
				}
			});
		}

		const newOrder = await prisma.order.create({
			data: {
				scheduledDate: new Date(scheduledDate),
				status: 'PENDING',
				paymentStatus: 'UNPAID',
				customerId: customer.id,
				propertyId: property.id,
				totalAmount: Number(totalAmount),
				notes: notes.trim(),
				createdById: session.user.id,
			},
			include: {
				customer: true,
				property: true
			}
		});

		return json({
			success: true,
			message: 'Замовлення успішно створено!',
			order: newOrder
		});

	} catch (error) {
		console.error('Помилка створення замовлення:', error);
		return json({ success: false, error: 'Внутрішня помилка сервера' }, { status: 500 });
	}
};