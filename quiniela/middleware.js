import { actualizarSesion } from "@/lib/supabase/middleware";

export async function middleware(request) {
  return actualizarSesion(request);
}

export const config = {
  // Se ejecuta en todas las rutas, menos archivos estáticos e imágenes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
