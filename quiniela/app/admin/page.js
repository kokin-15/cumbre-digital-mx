import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import Navegacion from "../componentes/Navegacion";
import { FormularioNuevoPartido, FormularioResultado } from "./FormulariosAdmin";

export const metadata = { title: "Administración — Quiniela" };

function formatearFecha(fecha) {
  if (!fecha) return "Fecha por confirmar";
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}

export default async function PaginaAdmin() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Solo los administradores pueden entrar; los demás vuelven al ranking
  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.is_admin) redirect("/");

  const { data: partidos, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, match_date, status, score_home, score_away")
    .order("match_date", { ascending: false });

  return (
    <main className="contenedor">
      <Navegacion actual="admin" />

      <header className="encabezado-pagina">
        <h1>Administración</h1>
        <p className="saludo">Crea partidos y captura los resultados. Al terminar un partido, los puntos se calculan solos.</p>
      </header>

      <section aria-labelledby="titulo-nuevo">
        <h2 id="titulo-nuevo">Nuevo partido</h2>
        <FormularioNuevoPartido />
      </section>

      <section aria-labelledby="titulo-partidos">
        <h2 id="titulo-partidos">Partidos</h2>

        {error && (
          <p className="aviso aviso-error" role="alert">No se pudieron cargar los partidos.</p>
        )}
        {!error && (partidos ?? []).length === 0 && <p className="vacio">Todavía no hay partidos.</p>}

        <ul className="lista">
          {(partidos ?? []).map((partido) => (
            <li key={partido.id} className="tarjeta">
              <p className="fecha">{formatearFecha(partido.match_date)}</p>
              <p className="duelo">
                {partido.home_team} vs {partido.away_team}
              </p>
              <FormularioResultado partido={partido} />
            </li>
          ))}
        </ul>

        <p className="detalle nota">
          Si reabres un partido que ya estaba terminado, los puntos que se calcularon antes se quedan
          hasta que lo vuelvas a terminar.
        </p>
      </section>
    </main>
  );
}
