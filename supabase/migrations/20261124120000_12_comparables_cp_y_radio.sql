-- Comparables de zona: tres modos por cliente (texto de zona, código postal, radio).
-- Solo añade columnas; no toca datos existentes. Para deshacer: borrar las columnas nuevas.

alter table clientes
  add column if not exists codigo_postal text,
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists modo_comparables text not null default 'zona',
  add column if not exists radio_km numeric not null default 1;

alter table clientes
  add constraint clientes_modo_comparables_chk check (modo_comparables in ('zona', 'codigo_postal', 'radio')),
  add constraint clientes_radio_km_chk check (radio_km > 0 and radio_km <= 100);

alter table comparables
  add column if not exists codigo_postal text,
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- La zona deja de ser obligatoria: un comparable puede identificarse por código postal o por dirección.
alter table comparables alter column zona drop not null;
