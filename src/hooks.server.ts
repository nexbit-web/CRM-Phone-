import { auth } from '$lib/auth'
import { redirect } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  })

  event.locals.session = session?.session ?? null
  event.locals.user = session?.user ?? null

  const isAuthRoute = event.url.pathname.startsWith('/login')
  const isApiRoute = event.url.pathname.startsWith('/api')
  const isAdminRoute = event.url.pathname.startsWith('/admin')
  const isRootRoute = event.url.pathname === '/'

  // Не авторизован — на логін
  if (!session && !isAuthRoute && !isApiRoute) {
    throw redirect(303, '/login')
  }

  // Авторизован — не пускати на логін і root
  if (session && (isAuthRoute || isRootRoute)) {
    throw redirect(303, '/orders')
  }

  // Тільки OWNER може заходити в /admin
  if (isAdminRoute && session?.user?.role !== 'admin') {
    throw redirect(303, '/orders')
  }

  const response = await resolve(event)

  // Забороняємо браузеру кешувати сторінки
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')

  return response
}
