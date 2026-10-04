"use client";

import { useActionState } from "react";
import { guardarPronostico } from "./actions";

// Formulario de un partido: dos marcadores y un botón para guardar
export default function FormularioPronostico({ partido, pronostico }) {
  const [estado, accion, guardando] = useActionState(guardarPronostico, null);

  return (
    <form action={accion} className="pronostico">
      <input type="hidden" name="match_id" value={partido.id} />

      <label className="equipo equipo-local">
        <span>{partido.home_team}</span>
        <input
          name="predicted_home"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          defaultValue={pronostico?.predicted_home ?? ""}
          aria-label={`Goles de ${partido.home_team}`}
          required
        />
      </label>

      <span className="guion" aria-hidden="true">–</span>

      <label className="equipo equipo-visitante">
        <input
          name="predicted_away"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          defaultValue={pronostico?.predicted_away ?? ""}
          aria-label={`Goles de ${partido.away_team}`}
          required
        />
        <span>{partido.away_team}</span>
      </label>

      <button type="submit" className="boton boton-chico" disabled={guardando}>
        {guardando ? "Guardando…" : pronostico ? "Actualizar" : "Guardar"}
      </button>

      {estado && (
        <p className={estado.ok ? "aviso aviso-ok" : "aviso aviso-error"} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
