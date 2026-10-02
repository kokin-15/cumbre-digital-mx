"""Servidor Flask de Cumbre Digital MX 2026 (registro de asistentes)."""
import os
import re
import sqlite3

from flask import Flask, abort, g, jsonify, redirect, render_template, request, url_for

app = Flask(__name__)

# Ruta absoluta a evento.db (en la raíz del proyecto, junto a este archivo)
RUTA_BD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evento.db")

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
    """Abre (una sola vez por petición) la conexión a SQLite."""
    if "bd" not in g:
        g.bd = sqlite3.connect(RUTA_BD)
        g.bd.row_factory = sqlite3.Row  # permite leer columnas por nombre
    return g.bd


@app.teardown_appcontext
def cerrar_bd(_error):
    """Cierra la conexión al terminar cada petición."""
    bd = g.pop("bd", None)
    if bd is not None:
        bd.close()


def iniciar_bd():
    """Crea la tabla y el índice si no existen (útil en Render, que arranca sin BD)."""
    bd = sqlite3.connect(RUTA_BD)
    bd.execute(
        """CREATE TABLE IF NOT EXISTS asistentes (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               nombre_completo TEXT NOT NULL,
               email TEXT NOT NULL,
               empresa TEXT NOT NULL,
               area_interes TEXT NOT NULL,
               fecha_registro TEXT NOT NULL DEFAULT (datetime('now','localtime'))
           )"""
    )
    # Evita registrar dos veces el mismo correo (sin distinguir mayúsculas)
    bd.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_asistentes_email ON asistentes (lower(email))"
    )
    bd.commit()
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
            cursor = bd.execute(
                "INSERT INTO asistentes (nombre_completo, email, empresa, area_interes) "
                "VALUES (?, ?, ?, ?)",
                (datos["nombre"], datos["email"], datos["empresa"], datos["area"]),
            )
            bd.commit()
            return redirect(url_for("confirmacion", id=cursor.lastrowid))
        except sqlite3.IntegrityError:
            errores["email"] = "Este correo ya está registrado."

    # Si hubo errores, se vuelve a mostrar el formulario con lo que escribió la persona
    return render_template("index.html", areas=AREAS, datos=datos, errores=errores), 400


@app.get("/confirmacion/<int:id>")
def confirmacion(id):
    """Muestra el número de registro del asistente."""
    asistente = obtener_bd().execute(
        "SELECT * FROM asistentes WHERE id = ?", (id,)
    ).fetchone()
    if asistente is None:
        abort(404)
    return render_template("confirmacion.html", asistente=asistente)


@app.get("/admin")
def admin():
    """Lista de asistentes con total y conteo por área (sin login por ahora)."""
    bd = obtener_bd()
    asistentes = bd.execute("SELECT * FROM asistentes ORDER BY id DESC").fetchall()
    por_area = bd.execute(
        "SELECT area_interes, COUNT(*) AS total FROM asistentes GROUP BY area_interes"
    ).fetchall()
    return render_template("admin.html", asistentes=asistentes, por_area=por_area)


@app.get("/api/asistentes")
def api_asistentes():
    """Lista de asistentes en JSON (útil para pruebas automáticas)."""
    filas = obtener_bd().execute("SELECT * FROM asistentes ORDER BY id").fetchall()
    return jsonify([dict(fila) for fila in filas])


@app.errorhandler(404)
def no_encontrado(_error):
    """Mensaje claro en español cuando la página no existe."""
    return render_template("404.html"), 404


# Se ejecuta al importar el módulo, así también funciona con gunicorn en Render
iniciar_bd()

if __name__ == "__main__":
    app.run(debug=True)
