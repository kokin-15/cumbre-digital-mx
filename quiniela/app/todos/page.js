import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import ActualizarEnVivo from "../componentes/ActualizarEnVivo";
import Navegacion from "../componentes/Navegacion";

export const metadata = { title: "Todos los pronósticos — Quiniela" };

function formatearFecha(fecha) {
  if (!fecha) return "Fecha por confirmar";
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}

export default async function PaginaTodos() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Solo partidos cerrados: ya terminaron o ya empezaron.
  // Así nadie puede ver (ni copiar) pronósticos de partidos que siguen abiertos.
  const ahora = new Date().toISOString();
  const { data: partidos, error } = await supabase
    .from("matches")
    .select(
      `id, home_team, away_team, match_date, status, score_home, score_away,
       predictions ( user_id, predicted_home, predicted_away, points_awarded, profiles ( full_name ) )`
    )
    .or(`status.neq.scheduled,match_date.lte.${ahora}`)
    .order("match_date", { ascending: false });

  const lista = partidos ?? [];

  return (
    <main className="contenedor">
      <Navegacion actual="todos" />

      <header className="encabezado-pagina">
        <h1>
          Todos los pronósticos <ActualizarEnVivo />
        </h1>
        <p className="saludo">Aquí ves lo que pronosticó cada quien en los partidos que ya empezaron.</p>
      </header>

      {error && (
        <p className="aviso aviso-error" role="alert">
          No se pudieron cargar los pronósticos. Intenta de nuevo en un momento.
        </p>
      )}

      {!error && lista.length === 0 && (
        <p className="vacio">Todavía no hay partidos cerrados. Vuelve cuando empiece el primero.</p>
      )}

      <ul className="lista">
        {lista.map((partido) => {
          const terminado = partido.status === "finished";
          // Primero quien más puntos sacó; después por nombre
          const pronosticos = [...(partido.predictions ?? [])].sort(
            (a, b) =>
              (b.points_awarded ?? -1) - (a.points_awarded ?? -1) ||
              (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? "", "es")
          );

          return (
            <li key={partido.id} className="tarjeta">
              <p className="fecha">
                {formatearFecha(partido.match_date)} · {terminado ? "Finalizado" : "En curso"}
              </p>
              <p className="duelo">
                {partido.home_team}
                {terminado ? ` ${partido.score_home} – ${partido.score_away} ` : " vs "}
                {partido.away_team}
              </p>

              {pronosticos.length === 0 ? (
                <p className="detalle">Nadie hizo pronóstico en este partido.</p>
              ) : (
                <div className="tabla-envoltura">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th>Pronóstico</th>
                        <th>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pronosticos.map((p) => (
                        <tr key={p.user_id} className={p.user_id === user.id ? "fila-yo-tabla" : undefined}>
                          <td>
                            {p.profiles?.full_name ?? "Jugador"}
                            {p.user_id === user.id && <span className="etiqueta-yo"> (tú)</span>}
                          </td>
                          <td>
                            {p.predicted_home} – {p.predicted_away}
                          </td>
                          <td>{terminado ? (p.points_awarded ?? 0) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
