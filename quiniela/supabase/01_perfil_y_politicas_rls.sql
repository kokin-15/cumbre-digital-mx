-- Quiniela: perfil automático al registrarse + políticas RLS
-- Ejecutar UNA vez en Supabase > SQL Editor (proyecto cumbre-digital-mx)

-- 1) Crear el perfil automáticamente cuando alguien se registra en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Solo el trigger debe poder ejecutarla (no la API pública)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) Perfiles: los usuarios con sesión pueden verlos; cada quien edita solo el suyo
create policy "perfiles_ver_autenticados" on public.profiles
  for select to authenticated using (true);
create policy "perfiles_editar_propio" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 3) Partidos: se pueden ver, pero no modificar desde la app
create policy "partidos_ver_todos" on public.matches
  for select to anon, authenticated using (true);

-- 4) Pronósticos: cada quien ve y escribe solo los suyos,
--    y solo antes de que empiece el partido
create policy "pronosticos_ver_propios" on public.predictions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "pronosticos_crear_propios" on public.predictions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'scheduled'
        and (m.match_date is null or m.match_date > now())
    )
  );

create policy "pronosticos_editar_propios" on public.predictions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'scheduled'
        and (m.match_date is null or m.match_date > now())
    )
  );

-- 5) Que nadie pueda escribirse sus propios puntos:
--    solo se permiten columnas concretas
revoke insert, update on public.predictions from anon, authenticated;
grant insert (user_id, match_id, predicted_home, predicted_away) on public.predictions to authenticated;
grant update (predicted_home, predicted_away, updated_at) on public.predictions to authenticated;
