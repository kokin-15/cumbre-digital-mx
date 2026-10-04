"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

const ESTADOS = ["scheduled", "live", "finished"];
const MENSAJE_SIN_PERMISO = "No tienes permiso de administrador.";

// Devuelve el cliente de Supabase solo si la persona con sesión es administradora
async function obtenerAdministrador() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return perfil?.is_admin ? supabase : null;
}

// Convierte un texto en entero entre 0 y 99 (o null si no es válido)
function marcador(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^\d{1,2}$/.test(texto)) return null;
  return Number(texto);
}

// Crea un partido nuevo. La hora que escribe el administrador es hora de México (UTC-6)
export async function crearPartido(_estadoPrevio, formData) {
  const supabase = await obtenerAdministrador();
  if (!supabase) return { ok: false, mensaje: MENSAJE_SIN_PERMISO };

  const local = String(formData.get("home_team") ?? "").trim();
  const visitante = String(formData.get("away_team") ?? "").trim();
  const fecha = String(formData.get("match_date") ?? "").trim();

  if (!local || !visitante) {
    return { ok: false, mensaje: "Escribe el nombre de los dos equipos." };
  }
  if (local.length > 60 || visitante.length > 60) {
    return { ok: false, mensaje: "Los nombres de los equipos son muy largos (máximo 60 letras)." };
  }
  if (local.toLowerCase() === visitante.toLowerCase()) {
    return { ok: false, mensaje: "Los dos equipos no pueden ser el mismo." };
  }

  const fechaCompleta = fecha.length === 16 ? `${fecha}:00` : fecha;
  const momento = new Date(`${fechaCompleta}-06:00`);
  if (!fecha || Number.isNaN(momento.getTime())) {
    return { ok: false, mensaje: "Elige la fecha y la hora del partido." };
  }

  const { error } = await supabase.from("matches").insert({
    home_team: local,
    away_team: visitante,
    match_date: momento.toISOString(),
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo crear el partido. Intenta de nuevo." };
  }

  revalidatePath("/admin");
  revalidatePath("/pronosticos");
  return { ok: true, mensaje: "Partido creado." };
}

// Cambia el estado y el marcador de un partido. Al ponerlo en "finished"
// el trigger de la base de datos calcula los puntos de todos automáticamente.
export async function actualizarPartido(_estadoPrevio, formData) {
  const supabase = await obtenerAdministrador();
  if (!supabase) return { ok: false, mensaje: MENSAJE_SIN_PERMISO };

  const id = Number(formData.get("match_id"));
  const estado = String(formData.get("status") ?? "");
  const local = marcador(formData.get("score_home"));
  const visitante = marcador(formData.get("score_away"));
  const escribioMarcador = String(formData.get("score_home") ?? "").trim() !== "" ||
    String(formData.get("score_away") ?? "").trim() !== "";

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, mensaje: "Partido no válido." };
  }
  if (!ESTADOS.includes(estado)) {
    return { ok: false, mensaje: "Estado no válido." };
  }

  let scoreHome = null;
  let scoreAway = null;

  if (estado === "finished") {
    if (local === null || visitante === null) {
      return { ok: false, mensaje: "Para terminar el partido escribe el marcador de 0 a 99 de los dos equipos." };
    }
    scoreHome = local;
    scoreAway = visitante;
  } else if (escribioMarcador) {
    if (local === null || visitante === null) {
      return { ok: false, mensaje: "El marcador debe ser un número de 0 a 99 en los dos equipos." };
    }
    scoreHome = local;
    scoreAway = visitante;
  }

  const { data: filas, error } = await supabase
    .from("matches")
    .update({ status: estado, score_home: scoreHome, score_away: scoreAway })
    .eq("id", id)
    .select("id");

  if (error || !filas || filas.length === 0) {
    return { ok: false, mensaje: "No se pudo actualizar el partido." };
  }

  revalidatePath("/admin");
  revalidatePath("/pronosticos");
  revalidatePath("/todos");
  revalidatePath("/");
  return {
    ok: true,
    mensaje: estado === "finished" ? "Partido terminado. Los puntos ya se calcularon." : "Partido actualizado.",
  };
}
