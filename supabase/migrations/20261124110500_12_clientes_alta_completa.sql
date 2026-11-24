-- 12 · Campos de alta de cliente (aplicada 24/11/2026)
alter table public.clientes
  add column contacto_nombre text,
  add column contacto_telefono text,
  add column contacto_email text,
  add column personal text,
  add column horario text,
  add column equipos_otros text;
