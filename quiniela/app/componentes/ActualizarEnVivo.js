"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Refresca la página sola cuando cambian los pronósticos o los partidos.
// Además la refresca cada 30 segundos por si se pierde la conexión en vivo.
export default function ActualizarEnVivo() {
  const router = useRouter();
  const [enVivo, setEnVivo] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => {
    const supabase = crearClienteNavegador();

    // Si llegan varios cambios seguidos, se refresca una sola vez
    function refrescar() {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => router.refresh(), 400);
    }

    const canal = supabase
      .channel("ranking-en-vivo")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, refrescar)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refrescar)
      .subscribe((estado) => setEnVivo(estado === "SUBSCRIBED"));

    const intervalo = setInterval(() => router.refresh(), 30000);

    // Al salir de la página se cierra todo
    return () => {
      clearTimeout(temporizador.current);
      clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return (
    <span className={enVivo ? "indicador indicador-vivo" : "indicador"} role="status">
      {enVivo ? "En vivo" : "Conectando…"}
    </span>
  );
}
