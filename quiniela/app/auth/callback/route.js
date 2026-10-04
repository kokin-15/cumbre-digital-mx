import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Supabase manda aquí a la persona después de confirmar su correo (con ?code=...)
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) {
      return NextResponse.redirect(`${origin}/pronosticos`);
    }
  }

  const mensaje = encodeURIComponent("El enlace de confirmación no es válido o ya venció.");
  return NextResponse.redirect(`${origin}/login?error=${mensaje}`);
}
