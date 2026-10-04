import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import ActualizarEnVivo from "./componentes/ActualizarEnVivo";
import Navegacion from "./componentes/Navegacion";

export const metadata = { title: "Ranking — Quiniela" };

// Medalla para los tres primeros lugares
function medalla(posicion) {
  if (posicion === 1) return "🥇";
  if (posicion === 2) return "🥈";
  if (posicion === 3) return "🥉";
  return `${posicion}`;
}

export default async function PaginaRanking() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // La vista leaderboard ya viene ordenada por puntos, marcadores exactos y nombre
  const { data: filas, error } = await supabase
    .from("leaderboard")
    .select("user_id, full_name, total_points, exact_matches, correct_outcomes, total_predictions");

  const ranking = filas ?? [];

  // Posición con empates: quien tiene los mismos puntos y exactos comparte lugar
  let posicion = 0;
  let anterior = null;
  const conPosicion = ranking.map((fila, indice) => {
    const clave = `${fila.total_points}-${fila.exact_matches}`;
    if (clave !== anterior) {
      posicion = indice + 1;
      anterior = clave;
    }
    return { ...fila, posicion };
  });

  return (
    <main className="contenedor">
      <Navegacion actual="ranking" />

      <header className="encabezado-pagina">
        <h1>
          Ranking <ActualizarEnVivo />
        </h1>
        <p className="saludo">2 puntos por marcador exacto · 1 punto por acertar quién gana o el empate</p>
      </header>

      {error && (
        <p className="aviso aviso-error" role="alert">
          No se pudo cargar el ranking. Intenta de nuevo en un momento.
        </p>
      )}

      {!error && conPosicion.length === 0 && (
        <p className="vacio">Todavía no hay jugadores registrados.</p>
      )}

      <ol className="ranking">
        {conPosicion.map((fila) => (
          <li
            key={fila.user_id}
            className={fila.user_id === user.id ? "fila-ranking fila-yo" : "fila-ranking"}
          >
            <span className="lugar">{medalla(fila.posicion)}</span>
            <div className="jugador">
              <strong>
                {fila.full_name ?? "Jugador"}
                {fila.user_id === user.id && <span className="etiqueta-yo"> (tú)</span>}
              </strong>
              <span className="detalle">
                {fila.exact_matches} exactos · {fila.correct_outcomes} acertados · {fila.total_predictions} pronósticos
              </span>
            </div>
            <span className="total">
              {fila.total_points}
              <small> pts</small>
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
