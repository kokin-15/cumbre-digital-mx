# Cumbre Digital MX 2026 — Proyecto de Práctica

## Sobre este proyecto
App web de registro de asistentes para "Cumbre Digital MX 2026".

## Stack tecnológico
- Fase 1: HTML + CSS + JavaScript (sin servidor)
- Fase 2: Python 3 + Flask + SQLite
- Fase 3: migración a PostgreSQL (Supabase) con psycopg v3 ("psycopg[binary]")
- Despliegue: Render.com (opcional)

## Reglas de trabajo
- Todo el contenido y comentarios en español
- Sin frameworks CSS externos (solo CSS puro)
- Diseño responsivo, tema oscuro, moderno
- La base de datos actual es PostgreSQL en Supabase (proyecto "cumbre-digital-mx", tabla asistentes)
- La conexión se configura con DATABASE_URL: archivo .env en local, variable de entorno en Render
- Usar la cadena del Session pooler de Supabase (la conexión directa solo funciona con IPv6)
- Usar psycopg v3 (import psycopg), NO psycopg2; parámetros con %s
- Nunca subir .env al repositorio (está en .gitignore); la plantilla pública es .env.example
- Columnas reales de la tabla: id, nombre, email, empresa, area_interes, numero_registro, fecha_registro
- evento.db (SQLite) quedó como respaldo antiguo y ya no lo usa la app
- Sin autenticación ni login de momento
- Mensajes de error claros en español

## Estructura del proyecto (Fase 2)
- app.py → servidor Flask principal
- .env → DATABASE_URL real (privado, no se sube a Git)
- .env.example → plantilla pública de .env
- evento.db → base SQLite antigua (ya no se usa)
- templates/ → páginas HTML (index, confirmacion, admin)
- requirements.txt → dependencias Python (Flask, gunicorn, psycopg[binary], python-dotenv)
- Procfile → configuración para Render

## Contexto del evento
- Nombre: Cumbre Digital MX 2026
- Tema: Transformación digital para PyMEs
- Campos del formulario: nombre completo, email, empresa, área de interés
- Áreas: Tecnología / Marketing / Negocios / Emprendimiento

## Servidores MCP disponibles (alcance proyecto)
- github: para subir el código al repositorio
- sqlite: para interactuar con evento.db (solo la base antigua)
- supabase: para consultar la base PostgreSQL actual (proyecto cumbre-digital-mx)
- playwright: para pruebas automáticas (Fase 3)
