-- Quiniela: cierra huecos de seguridad y crea el rol de administrador
-- Si no se aplicó con el MCP, ejecutar en Supabase > SQL Editor

-- 1) Quitar políticas demasiado abiertas
--    (las políticas pronosticos_* del archivo 01 ya cubren lo mismo, y con más reglas)
drop policy if exists "Lectura publica de pronosticos" on public.predictions;
drop policy if exists "Insertar pronostico propio a tiempo" on public.predictions;
drop policy if exists "Modificar pronostico propio a tiempo" on public.predictions;

-- 2) Ver pronósticos de otras personas SOLO en partidos que ya empezaron o terminaron
create policy "pronosticos_ver_cerrados" on public.predictions
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and (m.status <> 'scheduled' or m.match_date <= now())
    )
  );

-- 3) Administradores: columna en profiles + función para consultarla
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- Nadie puede cambiar su propio perfil desde la app (así nadie se hace admin solo)
revoke update on public.profiles from anon, authenticated;

-- 4) Solo los administradores pueden crear y editar partidos
create policy "partidos_crear_admin" on public.matches
  for insert to authenticated with check (public.es_admin());
create policy "partidos_editar_admin" on public.matches
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

grant insert, update on public.matches to authenticated;

-- 5) Hacer administrador a la cuenta de Kokisc
update public.profiles set is_admin = true where id = '147a44a5-3874-4e88-8247-eb1a294e090f';
