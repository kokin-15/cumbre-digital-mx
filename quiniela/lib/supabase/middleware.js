// Renueva la sesión de Supabase en cada petición y protege las páginas privadas
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function actualizarSesion(request) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGuardar) {
          cookiesParaGuardar.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          respuesta = NextResponse.next({ request });
          cookiesParaGuardar.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida el token con Supabase (más seguro que getSession())
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;

  // Sin sesión solo se puede ver el login y la confirmación del correo
  const esPublica = ruta === "/login" || ruta.startsWith("/auth");
  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Con sesión, /login ya no hace falta: se va al ranking
  if (user && ruta === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return respuesta;
}
