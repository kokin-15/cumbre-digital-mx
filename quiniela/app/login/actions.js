"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

// Redirige a /login mostrando un mensaje (error o aviso) en la dirección
function volverAlLogin(tipo, texto, modo = "") {
  const parametros = new URLSearchParams({ [tipo]: texto });
  if (modo) parametros.set("modo", modo);
  redirect(`/login?${parametros.toString()}`);
}

export async function iniciarSesion(formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    volverAlLogin("error", "Escribe tu correo y tu contraseña.");
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    volverAlLogin("error", "Correo o contraseña incorrectos.");
  }

  redirect("/pronosticos");
}

export async function registrarse(formData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!nombre || !email || !password) {
    volverAlLogin("error", "Completa tu nombre, correo y contraseña.", "registro");
  }
  if (password.length < 6) {
    volverAlLogin("error", "La contraseña debe tener al menos 6 caracteres.", "registro");
  }

  // Dirección a la que vuelve la persona después de confirmar su correo
  const origen = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger handle_new_user toma full_name para crear el perfil
      data: { full_name: nombre },
      emailRedirectTo: `${origen}/auth/callback`,
    },
  });

  if (error) {
    volverAlLogin("error", "No se pudo crear la cuenta: " + error.message, "registro");
  }

  // Si Supabase pide confirmar el correo, todavía no hay sesión
  if (!data.session) {
    volverAlLogin("mensaje", "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
  }

  redirect("/pronosticos");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
