import Link from "next/link";
import { iniciarSesion, registrarse } from "./actions";

export const metadata = { title: "Entrar — Quiniela" };

export default async function PaginaLogin({ searchParams }) {
  // En Next.js 15 searchParams es una promesa
  const { error, mensaje, modo } = await searchParams;
  const esRegistro = modo === "registro";

  return (
    <main className="contenedor contenedor-angosto">
      <header className="encabezado">
        <h1>Quiniela</h1>
        <p>{esRegistro ? "Crea tu cuenta para pronosticar" : "Entra para capturar tus pronósticos"}</p>
      </header>

      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
      {mensaje && <p className="aviso aviso-ok" role="status">{mensaje}</p>}

      <form action={esRegistro ? registrarse : iniciarSesion} className="tarjeta formulario">
        {esRegistro && (
          <label>
            Nombre completo
            <input name="nombre" type="text" placeholder="Ej. María López García" autoComplete="name" required />
          </label>
        )}

        <label>
          Correo electrónico
          <input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
        </label>

        <label>
          Contraseña
          <input
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete={esRegistro ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </label>

        <button type="submit" className="boton">
          {esRegistro ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <p className="cambio-modo">
        {esRegistro ? (
          <>¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></>
        ) : (
          <>¿Eres nuevo? <Link href="/login?modo=registro">Crea tu cuenta</Link></>
        )}
      </p>
    </main>
  );
}
