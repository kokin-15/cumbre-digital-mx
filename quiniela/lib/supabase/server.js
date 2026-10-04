// Cliente de Supabase para usar en el SERVIDOR (páginas, acciones y rutas)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteServidor() {
  // En Next.js 15 cookies() es asíncrono
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesParaGuardar) {
          try {
            cookiesParaGuardar.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            );
          } catch {
            // Si se llama desde un Server Component no se pueden escribir cookies.
            // No pasa nada: el middleware ya renueva la sesión.
          }
        },
      },
    }
  );
}
