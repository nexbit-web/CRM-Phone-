import { auth } from "$lib/auth";
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  const isAuthRoute = event.url.pathname.startsWith("/login");
  const isApiRoute = event.url.pathname.startsWith("/api");
  const isAdminRoute = event.url.pathname.startsWith("/admin");

  // Не авторизован — на логин
  if (!session && !isAuthRoute && !isApiRoute) {
    throw redirect(303, "/login");
  }

  // Авторизован — не пускать на логин
  if (session && isAuthRoute) {
    throw redirect(303, "/dashboard");
  }

  // Только OWNER может заходить в /admin
  if (isAdminRoute && session?.user?.role !== "admin") {
    throw redirect(303, "/dashboard");
  }

  return resolve(event);
};
