import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cerrarSesion } from "../login/actions";

// Menú de arriba: Ranking, Mis pronósticos, Todos, Admin (solo administradores) y Salir
export default async function Navegacion({ actual }) {
  // Se consulta si la persona es administradora para mostrar el enlace "Admin"
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let esAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    esAdmin = Boolean(perfil?.is_admin);
  }

  return (
    <nav className="navegacion" aria-label="Principal">
      <div className="enlaces">
        <Link href="/" aria-current={actual === "ranking" ? "page" : undefined}>
          Ranking
        </Link>
        <Link href="/pronosticos" aria-current={actual === "pronosticos" ? "page" : undefined}>
          Mis pronósticos
        </Link>
        <Link href="/todos" aria-current={actual === "todos" ? "page" : undefined}>
          Todos
        </Link>
        {esAdmin && (
          <Link href="/admin" aria-current={actual === "admin" ? "page" : undefined}>
            Admin
          </Link>
        )}
      </div>
      <form action={cerrarSesion}>
        <button type="submit" className="boton boton-secundario boton-chico">Salir</button>
      </form>
    </nav>
  );
}
