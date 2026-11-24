-- Alta de un usuario en PM Verticales
-- 1) Supabase → Authentication → Users → "Add user" → "Create new user" (correo + contraseña, marcar "Auto Confirm User").
-- 2) Ejecuta esto en Supabase → SQL Editor, cambiando correo, nombre y rol.
--    Roles: admin (todo), asesor (ve costes y edita), comercial (no ve costes; crea propuestas), direccion (ve costes; solo lectura).

insert into public.perfiles (user_id, nombre, rol)
select id, 'Fabián Báez', 'admin'
from auth.users
where email = 'CORREO@EJEMPLO.COM'
on conflict (user_id) do update set nombre = excluded.nombre, rol = excluded.rol;
