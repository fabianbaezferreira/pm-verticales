-- Enciclopedia Burger Intelligence · Fase 1: esquema.
-- Fuente de diseño: docs/burger-intelligence/Burger_Intelligence_Framework_Maestro_2026-11-23.md (secciones 3-6).
-- Solo crea tablas nuevas (prefijo enc_); no toca las existentes. Para deshacer: borrar las tablas enc_*.
--
-- Decisiones:
--  * Las 13 áreas y sus campos específicos son DATOS (enc_areas, enc_area_campos), no columnas.
--    Cada ficha guarda sus campos específicos en enc_fichas.campos (jsonb, clave cNN).
--  * Área 12 (fuentes) se resuelve con enc_fuentes / enc_documentos. Área 13 (catálogo PM) y el
--    escandallo NO se duplican: enc_ficha_vinculos enlaza con productos_pm, ingredientes_extra,
--    elaboraciones y platos (que ya contienen costes y escandallos).
--  * El contenido en bruto (texto completo) vive aparte, en enc_documento_contenido, solo admin y asesor.
--  * La IA no es fuente primaria: tipo_evidencia no admite «ia» y toda afirmación se enlaza a un documento o fuente.

-- ───────────── Códigos legibles (F001, D00001, I0001…) ─────────────
create sequence if not exists privado.enc_seq_f start 31;   -- F001-F030 se cargan con código explícito
create sequence if not exists privado.enc_seq_d;
create sequence if not exists privado.enc_seq_x;
create sequence if not exists privado.enc_seq_i;
create sequence if not exists privado.enc_seq_e;
create sequence if not exists privado.enc_seq_r;
create sequence if not exists privado.enc_seq_c;
create sequence if not exists privado.enc_seq_t;
create sequence if not exists privado.enc_seq_n;
create sequence if not exists privado.enc_seq_tr;
create sequence if not exists privado.enc_seq_cr;

create or replace function privado.enc_nuevo_codigo(prefijo text, ancho int)
returns text language plpgsql security definer set search_path = '' as $$
begin
  return prefijo || lpad(nextval(format('privado.enc_seq_%s', lower(prefijo)))::text, ancho, '0');
end $$;

create or replace function privado.tg_enc_codigo_simple() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.codigo is null then new.codigo := privado.enc_nuevo_codigo(tg_argv[0], tg_argv[1]::int); end if;
  return new;
end $$;

create or replace function privado.tg_enc_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin new.actualizado_en := now(); return new; end $$;

-- ───────────── Configuración de áreas ─────────────
create table public.enc_areas (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.verticales(id),
  codigo text not null,
  nombre text not null,
  descripcion text,
  notas text,
  modo text not null default 'fichas' check (modo in ('fichas', 'fuentes', 'catalogo_pm')),
  tipos_ficha text[] not null default '{}',
  bloques jsonb,
  privada boolean not null default false,
  orden int not null,
  unique (vertical_id, codigo)
);

create table public.enc_area_campos (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.enc_areas(id) on delete cascade,
  orden int not null,
  clave text not null,
  etiqueta text not null,
  tipo text not null default 'texto_largo' check (tipo in ('texto', 'texto_largo', 'numero', 'url', 'fecha')),
  ayuda text,
  unique (area_id, clave),
  unique (area_id, orden)
);

-- ───────────── Fuentes y documentos ─────────────
create table public.enc_fuentes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  vertical_id uuid not null references public.verticales(id),
  nombre text not null,
  editor_autor text,
  mercado text,
  tipo text,
  areas text[] not null default '{}',
  url text,
  acceso text check (acceso in ('publico', 'restringido', 'privado')),
  prioridad text check (prioridad in ('alta', 'media', 'baja')),
  estado text not null default 'registrada' check (estado in ('registrada', 'pendiente_de_captura', 'capturada', 'texto_extraido', 'pendiente_de_revision', 'contrastada', 'validada_en_prueba', 'bloqueada', 'descartada_con_motivo')),
  motivo_descarte text,
  privada boolean not null default false,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint enc_fuentes_descarte_chk check (estado <> 'descartada_con_motivo' or coalesce(motivo_descarte, '') <> '')
);
create trigger enc_fuentes_codigo before insert on public.enc_fuentes for each row execute function privado.tg_enc_codigo_simple('F', '3');
create trigger enc_fuentes_act before update on public.enc_fuentes for each row execute function privado.tg_enc_actualizado();

create table public.enc_documentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  fuente_id uuid not null references public.enc_fuentes(id) on delete restrict,
  titulo text,
  url_original text,
  url_final text,
  autor text,
  formato text,
  version text,
  fecha_publicacion date,
  fecha_consulta date,
  original_conservado boolean not null default false,
  ruta_original text,
  huella_sha256 text,
  derechos_uso text,
  estado text not null default 'registrada' check (estado in ('registrada', 'pendiente_de_captura', 'capturada', 'texto_extraido', 'pendiente_de_revision', 'contrastada', 'validada_en_prueba', 'bloqueada', 'descartada_con_motivo')),
  motivo_descarte text,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint enc_documentos_descarte_chk check (estado <> 'descartada_con_motivo' or coalesce(motivo_descarte, '') <> '')
);
create index enc_documentos_fuente_idx on public.enc_documentos (fuente_id);
create trigger enc_documentos_codigo before insert on public.enc_documentos for each row execute function privado.tg_enc_codigo_simple('D', '5');
create trigger enc_documentos_act before update on public.enc_documentos for each row execute function privado.tg_enc_actualizado();

-- Contenido en bruto: separado y privado (solo admin y asesor).
create table public.enc_documento_contenido (
  documento_id uuid primary key references public.enc_documentos(id) on delete cascade,
  texto_completo text,
  bytes bigint,
  actualizado_en timestamptz not null default now()
);
create trigger enc_contenido_act before update on public.enc_documento_contenido for each row execute function privado.tg_enc_actualizado();

-- ───────────── Fichas ─────────────
create table public.enc_fichas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  vertical_id uuid not null references public.verticales(id),
  tipo text not null check (tipo in ('ingrediente', 'estilo', 'receta', 'combinacion', 'tecnica', 'tendencia', 'creador', 'normativa')),
  area_id uuid not null references public.enc_areas(id),
  bloque text check (bloque in ('11A', '11B', '11C', '11D')),
  mercado text check (mercado in ('espana', 'eeuu_mundo', 'otro')),
  -- Campos comunes (sección 4). El 8 (fuentes) vive en enc_ficha_fuentes.
  nombre text not null,
  categoria text,
  subcategoria text,
  sinonimos text[] not null default '{}',
  descripcion text,
  datos_tecnicos text,
  aplicaciones text,
  combinaciones text,
  operativa text,
  info_comercial text,
  comparativas text,
  validacion text not null default 'pendiente' check (validacion in ('contrastada', 'pendiente', 'prueba_real', 'propuesta_propia')),
  -- Campos específicos del área: {"c01": "texto", ...}
  campos jsonb not null default '{}'::jsonb check (jsonb_typeof(campos) = 'object'),
  estado text not null default 'registrada' check (estado in ('registrada', 'pendiente_de_captura', 'capturada', 'texto_extraido', 'pendiente_de_revision', 'contrastada', 'validada_en_prueba', 'bloqueada', 'descartada_con_motivo')),
  motivo_descarte text,
  busqueda tsvector,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  constraint enc_fichas_descarte_chk check (estado <> 'descartada_con_motivo' or coalesce(motivo_descarte, '') <> '')
);
create index enc_fichas_area_idx on public.enc_fichas (area_id, estado);
create index enc_fichas_tipo_idx on public.enc_fichas (tipo);
create index enc_fichas_busqueda_idx on public.enc_fichas using gin (busqueda);

create or replace function privado.tg_enc_ficha() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select codigo, modo into a from public.enc_areas where id = new.area_id;
  if a.modo <> 'fichas' then
    raise exception 'El área % no admite fichas propias: se resuelve con %.', a.codigo,
      case a.modo when 'fuentes' then 'Fuentes y documentos' else 'el Catálogo PM y los escandallos' end;
  end if;
  if a.codigo = '11' and new.bloque is null then
    raise exception 'Las fichas del área 11 deben indicar su bloque (11A, 11B, 11C o 11D).';
  end if;
  if a.codigo <> '11' and new.bloque is not null then
    raise exception 'Solo las fichas del área 11 llevan bloque.';
  end if;
  if new.bloque in ('11A', '11B') then new.mercado := 'espana';
  elsif new.bloque in ('11C', '11D') then new.mercado := 'eeuu_mundo';
  end if;
  if new.codigo is null then
    new.codigo := privado.enc_nuevo_codigo(
      case new.tipo when 'ingrediente' then 'I' when 'estilo' then 'E' when 'receta' then 'R' when 'combinacion' then 'C'
        when 'tecnica' then 'T' when 'tendencia' then 'TR' when 'creador' then 'CR' else 'N' end, 4);
  end if;
  new.actualizado_en := now();
  new.busqueda :=
    setweight(to_tsvector('spanish', coalesce(new.nombre, '') || ' ' || array_to_string(new.sinonimos, ' ')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.categoria, '') || ' ' || coalesce(new.subcategoria, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.descripcion, '') || ' ' || coalesce(new.datos_tecnicos, '') || ' ' || coalesce(new.aplicaciones, '') || ' ' ||
      coalesce(new.combinaciones, '') || ' ' || coalesce(new.operativa, '') || ' ' || coalesce(new.comparativas, '') || ' ' || new.campos::text), 'C');
  return new;
end $$;
create trigger enc_fichas_tg before insert or update on public.enc_fichas for each row execute function privado.tg_enc_ficha();

-- Relaciones entre fichas
create table public.enc_relaciones (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.enc_fichas(id) on delete cascade,
  destino_id uuid not null references public.enc_fichas(id) on delete cascade,
  tipo text not null check (tipo in ('usa', 'variante_de', 'alternativa_a', 'sustituye_a', 'combina_con', 'incompatible_con', 'estilo_de', 'deriva_de', 'aplica_tecnica', 'regulada_por', 'relacionada')),
  nota text,
  creado_en timestamptz not null default now(),
  constraint enc_relaciones_distintas check (origen_id <> destino_id),
  unique (origen_id, destino_id, tipo)
);
create index enc_relaciones_destino_idx on public.enc_relaciones (destino_id);

-- Enlace ficha ↔ documento/fuente, con ubicación y tipo de evidencia
create table public.enc_ficha_fuentes (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.enc_fichas(id) on delete cascade,
  documento_id uuid references public.enc_documentos(id) on delete restrict,
  fuente_id uuid references public.enc_fuentes(id) on delete restrict,
  ubicacion text,
  campo text,
  tipo_evidencia text not null check (tipo_evidencia in ('hecho_documentado', 'opinion_profesional', 'publicidad', 'hipotesis', 'propuesta_propia', 'validacion_prueba')),
  fecha_consulta date,
  estado_revision text not null default 'pendiente_de_revision' check (estado_revision in ('registrada', 'pendiente_de_captura', 'capturada', 'texto_extraido', 'pendiente_de_revision', 'contrastada', 'validada_en_prueba', 'bloqueada', 'descartada_con_motivo')),
  nota text,
  creado_en timestamptz not null default now(),
  constraint enc_ficha_fuentes_origen_chk check (documento_id is not null or fuente_id is not null)
);
create index enc_ficha_fuentes_ficha_idx on public.enc_ficha_fuentes (ficha_id);
create index enc_ficha_fuentes_doc_idx on public.enc_ficha_fuentes (documento_id);
create index enc_ficha_fuentes_fuente_idx on public.enc_ficha_fuentes (fuente_id);

-- Enlace ficha ↔ tablas actuales (catálogo PM, extras, elaboraciones, platos/escandallos). No duplica datos.
create table public.enc_ficha_vinculos (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.enc_fichas(id) on delete cascade,
  producto_id uuid references public.productos_pm(id) on delete cascade,
  extra_id uuid references public.ingredientes_extra(id) on delete cascade,
  elaboracion_id uuid references public.elaboraciones(id) on delete cascade,
  plato_id uuid references public.platos(id) on delete cascade,
  nota text,
  creado_en timestamptz not null default now(),
  constraint enc_ficha_vinculos_uno check (num_nonnulls(producto_id, extra_id, elaboracion_id, plato_id) = 1),
  unique (ficha_id, producto_id),
  unique (ficha_id, extra_id),
  unique (ficha_id, elaboracion_id),
  unique (ficha_id, plato_id)
);
create index enc_vinculos_producto_idx on public.enc_ficha_vinculos (producto_id);
create index enc_vinculos_extra_idx on public.enc_ficha_vinculos (extra_id);
create index enc_vinculos_elab_idx on public.enc_ficha_vinculos (elaboracion_id);
create index enc_vinculos_plato_idx on public.enc_ficha_vinculos (plato_id);

-- Incidencias
create table public.enc_incidencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  fuente_id uuid references public.enc_fuentes(id) on delete set null,
  documento_id uuid references public.enc_documentos(id) on delete set null,
  ficha_id uuid references public.enc_fichas(id) on delete set null,
  url text,
  causa text not null,
  fecha date not null default current_date,
  estado text not null default 'abierta' check (estado in ('abierta', 'en_curso', 'resuelta', 'descartada')),
  solucion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index enc_incidencias_fuente_idx on public.enc_incidencias (fuente_id);
create index enc_incidencias_doc_idx on public.enc_incidencias (documento_id);
create index enc_incidencias_ficha_idx on public.enc_incidencias (ficha_id);
create trigger enc_incidencias_codigo before insert on public.enc_incidencias for each row execute function privado.tg_enc_codigo_simple('X', '4');
create trigger enc_incidencias_act before update on public.enc_incidencias for each row execute function privado.tg_enc_actualizado();

-- Cobertura: fichas por área, estado y validación (respeta RLS del usuario)
create view public.enc_v_cobertura with (security_invoker = true) as
select a.id as area_id, a.codigo, a.nombre, a.orden, f.estado, f.validacion, count(f.id)::int as fichas
from public.enc_areas a
left join public.enc_fichas f on f.area_id = a.id
group by a.id, a.codigo, a.nombre, a.orden, f.estado, f.validacion;

-- ───────────── RLS (mismo patrón que el resto: lectura / alta / cambio / baja) ─────────────
do $$
declare t text;
begin
  -- Configuración de áreas: lectura para todos los roles, escritura solo admin.
  foreach t in array array['enc_areas', 'enc_area_campos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy lectura on public.%I for select using ((select privado.fn_rol()) is not null)$p$, t);
    execute format($p$create policy alta on public.%I for insert with check ((select privado.fn_rol()) = 'admin')$p$, t);
    execute format($p$create policy cambio on public.%I for update using ((select privado.fn_rol()) = 'admin') with check ((select privado.fn_rol()) = 'admin')$p$, t);
    execute format($p$create policy baja on public.%I for delete using ((select privado.fn_rol()) = 'admin')$p$, t);
  end loop;
  -- Contenido de la enciclopedia: lectura para todos los roles, escritura admin y asesor.
  foreach t in array array['enc_fichas', 'enc_relaciones', 'enc_ficha_fuentes', 'enc_ficha_vinculos', 'enc_incidencias'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy lectura on public.%I for select using ((select privado.fn_rol()) is not null)$p$, t);
    execute format($p$create policy alta on public.%I for insert with check ((select privado.fn_rol()) in ('admin', 'asesor'))$p$, t);
    execute format($p$create policy cambio on public.%I for update using ((select privado.fn_rol()) in ('admin', 'asesor')) with check ((select privado.fn_rol()) in ('admin', 'asesor'))$p$, t);
    execute format($p$create policy baja on public.%I for delete using ((select privado.fn_rol()) in ('admin', 'asesor'))$p$, t);
  end loop;
end $$;

-- Fuentes: las marcadas como privadas (catálogo interno) solo las ven admin y asesor.
alter table public.enc_fuentes enable row level security;
create policy lectura on public.enc_fuentes for select
  using (((select privado.fn_rol()) is not null and not privada) or (select privado.fn_rol()) in ('admin', 'asesor'));
create policy alta on public.enc_fuentes for insert with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy cambio on public.enc_fuentes for update using ((select privado.fn_rol()) in ('admin', 'asesor')) with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy baja on public.enc_fuentes for delete using ((select privado.fn_rol()) in ('admin', 'asesor'));

-- Documentos: visibles si lo es su fuente (el subselect ya pasa por la RLS de enc_fuentes).
alter table public.enc_documentos enable row level security;
create policy lectura on public.enc_documentos for select
  using (exists (select 1 from public.enc_fuentes s where s.id = enc_documentos.fuente_id));
create policy alta on public.enc_documentos for insert with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy cambio on public.enc_documentos for update using ((select privado.fn_rol()) in ('admin', 'asesor')) with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy baja on public.enc_documentos for delete using ((select privado.fn_rol()) in ('admin', 'asesor'));

-- Contenido en bruto: PRIVADO. Solo admin y asesor, también para leer.
alter table public.enc_documento_contenido enable row level security;
create policy lectura on public.enc_documento_contenido for select using ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy alta on public.enc_documento_contenido for insert with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy cambio on public.enc_documento_contenido for update using ((select privado.fn_rol()) in ('admin', 'asesor')) with check ((select privado.fn_rol()) in ('admin', 'asesor'));
create policy baja on public.enc_documento_contenido for delete using ((select privado.fn_rol()) in ('admin', 'asesor'));
