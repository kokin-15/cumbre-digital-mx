import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import Navegacion from "../componentes/Navegacion";
import FormularioPronostico from "./FormularioPronostico";

export const metadata = { title: "Mis pronósticos — Quiniela" };

// Muestra la fecha del partido en hora de México
function formatearFecha(fecha) {
  if (!fecha) return "Fecha por confirmar";
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}

// Texto de los puntos ganados en un partido terminado
function textoPuntos(puntos) {
  if (puntos === 2) return "¡Marcador exacto! +2 puntos";
  if (puntos === 1) return "Acertaste el resultado. +1 punto";
  if (puntos === 0) return "Sin puntos";
  return "Puntos pendientes";
}

export default async function PaginaPronosticos() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Las tres consultas son independientes: se hacen al mismo tiempo
  const [perfil, partidos, pronosticos] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("matches")
      .select("id, home_team, away_team, match_date, status, score_home, score_away")
      .order("match_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("predictions")
      .select("match_id, predicted_home, predicted_away, points_awarded")
      .eq("user_id", user.id),
  ]);

  const hayError = partidos.error || pronosticos.error;
  const nombre = perfil.data?.full_name ?? user.email;

  // Diccionario { id del partido -> pronóstico de esta persona }
  const porPartido = new Map((pronosticos.data ?? []).map((p) => [p.match_id, p]));

  const ahora = Date.now();
  const lista = partidos.data ?? [];
  // Se puede pronosticar solo si no ha empezado
  const abiertos = lista.filter(
    (m) => m.status === "scheduled" && (!m.match_date || new Date(m.match_date).getTime() > ahora)
  );
  const cerrados = lista.filter((m) => !abiertos.includes(m));

  return (
    <main className="contenedor">
      <Navegacion actual="pronosticos" />

      <header className="encabezado-pagina">
        <h1>Mis pronósticos</h1>
        <p className="saludo">Hola, {nombre}</p>
      </header>

      {hayError && (
        <p className="aviso aviso-error" role="alert">
          No se pudieron cargar los partidos. Revisa que las políticas de seguridad (RLS) estén creadas.
        </p>
      )}

      <section aria-labelledby="titulo-abiertos">
        <h2 id="titulo-abiertos">Próximos partidos</h2>
        {abiertos.length === 0 && !hayError && (
          <p className="vacio">No hay partidos abiertos para pronosticar por ahora.</p>
        )}
        <ul className="lista">
          {abiertos.map((partido) => (
            <li key={partido.id} className="tarjeta">
              <p className="fecha">{formatearFecha(partido.match_date)}</p>
              <FormularioPronostico partido={partido} pronostico={porPartido.get(partido.id)} />
            </li>
          ))}
        </ul>
      </section>

      {cerrados.length > 0 && (
        <section aria-labelledby="titulo-cerrados">
          <h2 id="titulo-cerrados">Partidos cerrados</h2>
          <ul className="lista">
            {cerrados.map((partido) => {
              const mio = porPartido.get(partido.id);
              const terminado = partido.status === "finished";
              return (
                <li key={partido.id} className="tarjeta tarjeta-cerrada">
                  <p className="fecha">
                    {formatearFecha(partido.match_date)} · {terminado ? "Finalizado" : "En curso"}
                  </p>
                  <p className="duelo">
                    {partido.home_team}
                    {terminado ? ` ${partido.score_home} – ${partido.score_away} ` : " vs "}
                    {partido.away_team}
                  </p>
                  <p className="detalle">
                    {mio
                      ? `Tu pronóstico: ${mio.predicted_home} – ${mio.predicted_away}`
                      : "No hiciste pronóstico"}
                  </p>
                  {terminado && mio && (
                    <p className={mio.points_awarded > 0 ? "puntos" : "puntos puntos-cero"}>
                      {textoPuntos(mio.points_awarded)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
