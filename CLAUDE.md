# PM Verticales — contexto para Claude

Herramienta de asesoramiento de cartas de **Picking Market (PM)** por tipo de establecimiento. Vertical activo: **Hamburguesería**. Propiedad de PM. Usuario principal: Fabián Báez (asesor gastronómico, admin).
Documento de referencia: `Framework_PM_Verticales_Hamburgueserias_v1.0.docx` (Drive, carpeta «PM Verticales — Documentación»). Léelo solo si la tarea toca alcance o reglas de negocio.

## Cómo trabajar con Fabián
- Español. Respuesta primero, conciso, sin relleno. Señala errores de planteamiento con alternativa concreta.
- No es programador: cuando él deba ejecutar algo, dar **un solo comando de PowerShell** y esperar su respuesta.
- Ahorrar tokens: no volcar archivos enteros ni esquemas completos si no hace falta; consultar solo lo necesario.
- Tras cada cambio: `npm run build` sin errores, commit y `git push` a `main`.

## Arranque en su PC (Windows)
```powershell
cd $HOME\Documents\pm-verticales; git pull; npm.cmd run dev
```
App en http://localhost:3000 (puerto fijo: coincide con la Site URL por defecto de Supabase Auth, necesario para el enlace de acceso por correo).

## Stack
- Vite + React 19 + TypeScript, react-router, `@supabase/supabase-js`, `read-excel-file` (lectura de Excel en el navegador). Sin librería de UI: CSS propio en `src/index.css`.
- Supabase proyecto `pm-verticales`, id `epjdvkuqrvqvqadewbjr`. Clave publicable en `.env.example`. Acceso por MCP de Supabase.
- Repo: github.com/fabianbaezferreira/pm-verticales (pasará a cuenta de PM).

## Reglas de negocio (no romper)
- **Todo sin IVA**. El precio de carta con IVA = sin IVA × (1 + `ajustes.iva_hosteleria`, 10 %).
- **Escandallo en cadena** en la base de datos: plato → elaboración (anidable, máx. 8 niveles) → producto PM / ingrediente extra. Coste ración = Σ cantidad neta ÷ (1 − merma) × precio por unidad base + mano de obra (minutos/60 × €/h, por defecto `ajustes.coste_hora_mano_obra` 22,50).
- Unidades: base kg / l / ud; componentes en g, kg, ml, l, ud. Unidad incompatible ⇒ «sin precio».
- **Alérgenos heredados** producto → elaboración → plato.
- **PVP dinámico**, se calcula en vivo en `v_carta_escandallo` según `carta_platos.metodo_pvp`:
  - `multiplicador`: coste × k. k = carta_platos → cliente → plato → categoría → vertical. **Sin valor por defecto** (no hay 2,5): sin k definido no hay PVP.
  - `food_cost`: coste ÷ FC. FC = carta_platos → plato → categoría.
  - `manual` / `comparables`: precio fijado por el asesor (`pvp_sin_iva`).
  - Redondeo por carta (`cartas.redondeo`: ninguno, 00, 50, 90, 95) con `fn_redondear_carta`, no se aplica a manual/comparables.
- Tarifa PM: importación Excel → `import_tarifa_filas` → `fn_aplicar_tarifa` (crea/actualiza `productos_pm` y `precios_pm`, versión en `tarifas`). Código repetido en el archivo ⇒ todas sus filas en error. Precio vigente = última tarifa aplicada (`v_precio_actual_pm`).
- Recetas en estado `teorica` hasta su cata; en la propuesta salen como «Propuesta teórica».
- Plato de tendencia exige `fuente_tendencia` (check en BD).
- Reglas de carta (avisos, no bloqueos): `fn_revisar_carta` + `verticales.reglas` (JSON). Principio del framework: lo que cambia entre verticales se **configura**, no se programa.

## Roles y seguridad (RLS en todas las tablas)
`perfiles.rol`: admin (todo), asesor (ve costes, edita), comercial (no ve costes; crea propuestas), direccion (ve costes, solo lectura). Rol vía `privado.fn_rol()`. Tarifas, precios y escandallos solo admin/asesor/direccion. `fn_precios_carta` (SECURITY DEFINER intencionado) da solo PVP a quien no ve costes. Vistas con `security_invoker`. Altas de usuario: ver `supabase/alta_usuario.sql` (sin registro público).

## Estructura
- `src/lib`: `supabase.ts` (cliente, `ok()`), `auth.tsx` (rol), `hooks.ts` (`useLoad`, `cargarVertical`), `catalogo.ts` (coste en cliente, mismo cálculo que SQL), `indicadores.ts`, `format.ts` (formatos, vocabularios: equipos, canales, restricciones, alérgenos UE), `clientesExcel.ts`.
- `src/components`: `ui.tsx`, `Componentes.tsx` (editor de componentes de plato/elaboración), `CalculadoraPvp.tsx`, `FormCliente.tsx`, `ImportarClientes.tsx`.
- `src/pages`: Inicio, Catalogo, Tarifas (importador), Extras, Elaboraciones(+Detalle), Platos(+Detalle), Clientes, ClienteNuevo, ClienteDetalle, CartaDetalle, Propuesta (imprimible), Comparables, Ajustes.
- `public/plantillas`: Excel de brief de cliente y de carga masiva de clientes.
- `supabase/migrations`: 09–12 en el repo; 01–08 solo en el proyecto (`npx supabase db pull` para traerlas).

## Migraciones aplicadas
01 núcleo · 02 funciones de escandallo · 03 importador y revisión de carta · 04 RLS · 05 semilla hamburguesería · 06 `fn_rol` a esquema privado · 07 políticas separadas · 08 multiplicador por niveles · 09 propuestas y `v_elaboraciones_coste` · 10 PVP dinámico por plato y redondeo · 11 sin multiplicador por defecto · 12 campos de alta de cliente.
Para probar SQL sin dejar datos: bloque `do $$ … raise exception … $$` (hace rollback).

## Estado (24/11/2026)
- Hecho: todos los módulos v1, acceso por correo/contraseña, PVP dinámico, alta de cliente y Excel de clientes.
- Pendiente de terceros: Excel de tarifa PM (carpeta Drive «Burger Intelligence — Tarifas PM Hamburguesería», vacía). Fijar columnas con el informático.
- Pendiente de Fabián: food cost objetivo por categoría; datos del cliente piloto.
- Pendiente de desarrollo: textos con IA, capa de conocimiento (estilos, tendencias, fuentes), fotos en Supabase Storage, despliegue con cuenta de PM.
- Plan de pruebas del framework: T1–T9 (T2, T3 y T4 verificados en SQL).
