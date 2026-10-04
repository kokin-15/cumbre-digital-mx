"""Servidor Flask de Cumbre Digital MX 2026 (registro de asistentes)."""
import os
import re

import psycopg
from dotenv import load_dotenv
from flask import Flask, abort, g, jsonify, redirect, render_template, request, url_for
from psycopg.rows import dict_row

# En local lee el archivo .env; en Render usa la variable de entorno del panel
load_dotenv()

app = Flask(__name__)

# Cadena de conexión a Supabase (PostgreSQL)
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "Falta la variable DATABASE_URL. Créala en el archivo .env (local) "
        "o en las variables de entorno de Render."
    )

# Columnas que se leen de la tabla (se renombran para que las plantillas sigan igual)
COLUMNAS = "id, nombre AS nombre_completo, email, empresa, area_interes, numero_registro, fecha_registro"

# Áreas de interés permitidas (igual que en el formulario)
AREAS = ["Tecnología", "Marketing", "Negocios", "Emprendimiento"]

# Mensajes de error (en español) para campos vacíos
MENSAJES_VACIO = {
    "nombre": "Por favor escribe tu nombre completo.",
    "email": "Por favor escribe tu correo electrónico.",
    "empresa": "Por favor escribe el nombre de tu empresa u organización.",
    "area": "Por favor selecciona tu área de interés.",
}


# ===== Base de datos =====
def obtener_bd():
    """Abre (una sola vez por petición) la conexión a PostgreSQL."""
    if "bd" not in g:
        # dict_row: cada fila se devuelve como diccionario (columna -> valor)
        g.bd = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return g.bd


@app.teardown_appcontext
def cerrar_bd(_error):
    """Cierra la conexión al terminar cada petición."""
    bd = g.pop("bd", None)
    if bd is not None:
        bd.close()


def formato_registro(numero):
    """Convierte el id en número de registro: 7 -> REG-0007."""
    return f"REG-{numero:04d}"


app.jinja_env.filters["registro"] = formato_registro


# ===== Validación =====
def validar(datos):
    """Devuelve un diccionario {campo: mensaje} con los errores encontrados."""
    errores = {}
    for campo, mensaje in MENSAJES_VACIO.items():
        if not datos[campo]:
            errores[campo] = mensaje

    if "email" not in errores and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]{2,}", datos["email"]):
        errores["email"] = "El correo no tiene un formato válido (ej. nombre@empresa.com)."

    if "area" not in errores and datos["area"] not in AREAS:
        errores["area"] = "El área de interés seleccionada no es válida."

    return errores


# ===== Rutas =====
@app.get("/")
def inicio():
    """Muestra el formulario de registro."""
    return render_template("index.html", areas=AREAS, datos={}, errores={})


@app.post("/registro")
def registro():
    """Valida el formulario, guarda al asistente y redirige a la confirmación."""
    datos = {
        "nombre": request.form.get("nombre", "").strip(),
        "email": request.form.get("email", "").strip().lower(),
        "empresa": request.form.get("empresa", "").strip(),
        "area": request.form.get("area", "").strip(),
    }
    errores = validar(datos)

    if not errores:
        try:
            bd = obtener_bd()
            # numero_registro es obligatorio: se toma el siguiente id de la secuencia
            # y con él se arma el código (7 -> REG-0007) en la misma sentencia
            nuevo_id = bd.execute(
                "WITH n AS (SELECT nextval(pg_get_serial_sequence('asistentes', 'id')) AS id) "
                "INSERT INTO asistentes (id, nombre, email, empresa, area_interes, numero_registro) "
                "SELECT id, %s, %s, %s, %s, 'REG-' || lpad(id::text, 4, '0') FROM n "
                "RETURNING id",
                (datos["nombre"], datos["email"], datos["empresa"], datos["area"]),
            ).fetchone()["id"]
            bd.commit()
            return redirect(url_for("confirmacion", id=nuevo_id))
        except psycopg.errors.UniqueViolation:
            bd.rollback()  # limpia la transacción fallida
            errores["email"] = "Este correo ya está registrado."

    # Si hubo errores, se vuelve a mostrar el formulario con lo que escribió la persona
    return render_template("index.html", areas=AREAS, datos=datos, errores=errores), 400


@app.get("/confirmacion/<int:id>")
def confirmacion(id):
    """Muestra el número de registro del asistente."""
    asistente = obtener_bd().execute(
        f"SELECT {COLUMNAS} FROM asistentes WHERE id = %s", (id,)
    ).fetchone()
    if asistente is None:
        abort(404)
    return render_template("confirmacion.html", asistente=asistente)


@app.get("/admin")
def admin():
    """Lista de asistentes con total y conteo por área (sin login por ahora)."""
    bd = obtener_bd()
    asistentes = bd.execute(f"SELECT {COLUMNAS} FROM asistentes ORDER BY id DESC").fetchall()
    por_area = bd.execute(
        "SELECT area_interes, COUNT(*) AS total FROM asistentes GROUP BY area_interes"
    ).fetchall()
    return render_template("admin.html", asistentes=asistentes, por_area=por_area)


@app.get("/api/asistentes")
def api_asistentes():
    """Lista de asistentes en JSON (útil para pruebas automáticas)."""
    filas = obtener_bd().execute(f"SELECT {COLUMNAS} FROM asistentes ORDER BY id").fetchall()
    # fecha_registro es un datetime: se pasa a texto ISO para el JSON
    for fila in filas:
        fila["fecha_registro"] = fila["fecha_registro"].isoformat(sep=" ", timespec="seconds")
    return jsonify(filas)


@app.errorhandler(404)
def no_encontrado(_error):
    """Mensaje claro en español cuando la página no existe."""
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
