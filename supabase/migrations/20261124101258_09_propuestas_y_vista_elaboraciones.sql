-- 09 · Propuestas guardadas y vista de coste de elaboraciones
-- Aplicada en el proyecto pm-verticales (epjdvkuqrvqvqadewbjr) el 24/11/2026.
-- Las migraciones 01–08 están en el proyecto; para traerlas al repositorio: `supabase db pull` (ver README).

create table public.propuestas (
  id uuid primary key default gen_random_uuid(),
  carta_id uuid not null references public.cartas(id) on delete cascade,
  titulo text not null,
  subtitulo text,
  introduccion text,
  destinatario text not null default 'cliente' check (destinatario in ('cliente','interno')),
  mostrar_costes boolean not null default false,
  mostrar_alergenos boolean not null default true,
  redondeo numeric check (redondeo is null or (redondeo >= 0 and redondeo < 1)),
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) default auth.uid()
);
create index on public.propuestas(carta_id);
alter table public.propuestas enable row level security;
create policy lectura on public.propuestas for select to authenticated using ((select privado.fn_rol()) is not null);
create policy alta on public.propuestas for insert to authenticated with check ((select privado.fn_rol()) = any (array['admin','asesor','comercial']));
create policy cambio on public.propuestas for update to authenticated using ((select privado.fn_rol()) = any (array['admin','asesor'])) with check ((select privado.fn_rol()) = any (array['admin','asesor']));
create policy baja on public.propuestas for delete to authenticated using ((select privado.fn_rol()) = any (array['admin','asesor']));

create index if not exists idx_carta_platos_carta on public.carta_platos(carta_id);
create index if not exists idx_plato_comp_plato on public.plato_componentes(plato_id);
create index if not exists idx_elab_comp_elab on public.elaboracion_componentes(elaboracion_id);

create view public.v_elaboraciones_coste with (security_invoker = true) as
select e.id, e.nombre, e.tipo, e.estado, e.vertical_id, e.rendimiento_cantidad, e.rendimiento_unidad,
  public.fn_coste_unitario_elaboracion(e.id, 0) as coste_unidad,
  public.fn_alergenos_elaboracion(e.id, 0) as alergenos,
  (select count(*) from public.elaboracion_componentes c where c.elaboracion_id = e.id) as n_componentes,
  (select count(distinct pc.plato_id) from public.plato_componentes pc where pc.elaboracion_id = e.id) as usada_en_platos
from public.elaboraciones e;
grant select on public.v_elaboraciones_coste to authenticated;
revoke all on public.v_elaboraciones_coste from anon;
