"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

const MENSAJE_PARTIDO_CERRADO =
  "No se pudo guardar: el partido ya empezó o no tienes permiso.";

// Convierte un texto en entero entre 0 y 99 (o null si no es válido)
function marcador(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^\d{1,2}$/.test(texto)) return null;
  return Number(texto);
}

// Guarda (crea o actualiza) el pronóstico de la persona para un partido
export async function guardarPronostico(_estadoPrevio, formData) {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión venció. Vuelve a iniciar sesión." };
  }

  const idPartido = Number(formData.get("match_id"));
  const local = marcador(formData.get("predicted_home"));
  const visitante = marcador(formData.get("predicted_away"));

  if (!Number.isInteger(idPartido) || idPartido <= 0) {
    return { ok: false, mensaje: "Partido no válido." };
  }
  if (local === null || visitante === null) {
    return { ok: false, mensaje: "Escribe un marcador de 0 a 99 para cada equipo." };
  }

  // ¿Ya existe un pronóstico de esta persona para este partido?
  const { data: existente, error: errorBusqueda } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("match_id", idPartido)
    .maybeSingle();

  if (errorBusqueda) {
    return { ok: false, mensaje: "No se pudo consultar tu pronóstico. Intenta de nuevo." };
  }

  if (existente) {
    // Solo se pueden cambiar los marcadores (así lo permiten los permisos de la base)
    const { data: filas, error } = await supabase
      .from("predictions")
      .update({
        predicted_home: local,
        predicted_away: visitante,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select("id");

    // Si la política RLS no deja pasar la fila, Supabase no marca error: devuelve 0 filas
    if (error || !filas || filas.length === 0) {
      return { ok: false, mensaje: MENSAJE_PARTIDO_CERRADO };
    }
  } else {
    const { error } = await supabase.from("predictions").insert({
      user_id: user.id,
      match_id: idPartido,
      predicted_home: local,
      predicted_away: visitante,
    });

    if (error) {
      return { ok: false, mensaje: MENSAJE_PARTIDO_CERRADO };
    }
  }

  revalidatePath("/pronosticos");
  return { ok: true, mensaje: "Pronóstico guardado." };
}
