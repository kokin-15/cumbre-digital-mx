"use client";

import { useActionState } from "react";
import { actualizarPartido, crearPartido } from "./actions";

// Formulario para crear un partido nuevo
export function FormularioNuevoPartido() {
  const [estado, accion, guardando] = useActionState(crearPartido, null);

  return (
    <form action={accion} className="tarjeta formulario" key={estado?.ok ? Date.now() : "nuevo"}>
      <label>
        Equipo local
        <input name="home_team" type="text" maxLength={60} placeholder="Ej. México" required />
      </label>
      <label>
        Equipo visitante
        <input name="away_team" type="text" maxLength={60} placeholder="Ej. Argentina" required />
      </label>
      <label>
        Fecha y hora (hora de México)
        <input name="match_date" type="datetime-local" required />
      </label>

      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? "Creando…" : "Crear partido"}
      </button>

      {estado && (
        <p className={estado.ok ? "aviso aviso-ok" : "aviso aviso-error"} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

// Formulario de un partido existente: estado y marcador
export function FormularioResultado({ partido }) {
  const [estado, accion, guardando] = useActionState(actualizarPartido, null);

  return (
    <form action={accion} className="resultado">
      <input type="hidden" name="match_id" value={partido.id} />

      <label className="campo-estado">
        Estado
        <select name="status" defaultValue={partido.status}>
          <option value="scheduled">Abierto (sin empezar)</option>
          <option value="live">En curso</option>
          <option value="finished">Terminado</option>
        </select>
      </label>

      <div className="marcador-admin">
        <input
          name="score_home"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          defaultValue={partido.score_home ?? ""}
          aria-label={`Goles de ${partido.home_team}`}
        />
        <span aria-hidden="true">–</span>
        <input
          name="score_away"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          defaultValue={partido.score_away ?? ""}
          aria-label={`Goles de ${partido.away_team}`}
        />
      </div>

      <button type="submit" className="boton boton-chico" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>

      {estado && (
        <p className={estado.ok ? "aviso aviso-ok" : "aviso aviso-error"} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
