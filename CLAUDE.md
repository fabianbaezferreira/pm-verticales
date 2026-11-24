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
- `src/lib`: `supabase.ts` (cliente, `ok()`), `auth.tsx` (rol), `hooks.ts` (`useLoad`, `cargarVertical`), `catalogo.ts` (coste en cliente, mismo cálculo que SQL), `indicadores.ts`, `format.ts` (formatos, vocabularios: equipos, canales, restricciones, alérgenos UE), `clientesExcel.ts`, `comparables.ts` (distancia y filtro de comparables), `enciclopedia.ts` (tipos, estados y constantes de la Enciclopedia).
- `src/components`: `ui.tsx`, `Componentes.tsx` (editor de componentes de plato/elaboración), `CalculadoraPvp.tsx`, `FormCliente.tsx`, `ImportarClientes.tsx`, `enc.tsx` (etiquetas de estado de la Enciclopedia).
- `src/pages`: Inicio, Catalogo, Tarifas (importador), Extras, Elaboraciones(+Detalle), Platos(+Detalle), Clientes, ClienteNuevo, ClienteDetalle, CartaDetalle, Propuesta (imprimible), Comparables, Ajustes, Enciclopedia, EnciclopediaFuentes, EnciclopediaFicha.
- `public/plantillas`: Excel de brief de cliente y de carga masiva de clientes.
- `docs/burger-intelligence`: framework maestro y documentos de partida de la Enciclopedia.
- `supabase/migrations`: 09–15 en el repo; 01–08 solo en el proyecto (`npx supabase db pull` para traerlas).

## Migraciones aplicadas
01 núcleo · 02 funciones de escandallo · 03 importador y revisión de carta · 04 RLS · 05 semilla hamburguesería · 06 `fn_rol` a esquema privado · 07 políticas separadas · 08 multiplicador por niveles · 09 propuestas y `v_elaboraciones_coste` · 10 PVP dinámico por plato y redondeo · 11 sin multiplicador por defecto · 12 campos de alta de cliente · 13 comparables por código postal y radio · 14 esquema de la Enciclopedia (`enc_*`) · 15 carga de las 13 áreas y 30 fuentes.
Para probar SQL sin dejar datos: bloque `do $$ … raise exception … $$` (hace rollback). Ojo: las secuencias de códigos de la Enciclopedia (`privado.enc_seq_*`) no se deshacen con el rollback.
Las migraciones se aplican con el MCP de Supabase (`apply_migration`) y el mismo SQL se guarda en el repo. Solo añadir columnas/tablas; no borrar datos ni tablas sin preguntar. Tras cambiar el esquema, pasar `get_advisors` (seguridad): los dos avisos actuales (`fn_precios_carta` y contraseñas filtradas) son conocidos.

## Repositorio público
`github.com/fabianbaezferreira/pm-verticales` es **público**. No subir nada interno de PM (tarifas, costes, precios de compra, catálogo privado, claves, datos de clientes, contenido en bruto capturado). Antes de subir documentos nuevos, confirmar con Fabián.
El equipo no tiene identidad de Git configurada: commits con `git -c user.name=Claude -c user.email=noreply@anthropic.com commit …` (no tocar la configuración global).

## Comparables de zona
Cada cliente elige cómo buscarlos (`clientes.modo_comparables`): `zona` (texto exacto), `codigo_postal` o `radio` (km en línea recta, con `lat`/`lng`). Lógica en `src/lib/comparables.ts`. «Localizar» envía la dirección a OpenStreetMap (Nominatim): es lo único que sale de la app hacia un servicio de mapas.

## Enciclopedia (Burger Intelligence)
Referencia: `docs/burger-intelligence/Burger_Intelligence_Framework_Maestro_2026-11-23.md` (secciones 2–8). Las 13 áreas y sus campos están aprobados: no rediseñar.
- **Fase 1 hecha:** estructura, configuración y las 30 fuentes (27 del framework + F028 Reglamento (UE) 1169/2011, F029 RD 126/2015, F030 Reglamento (CE) 2073/2005; las áreas de estas tres son una asignación provisional). **No hay contenido capturado ni redactado.** No inventar ni rellenar fichas: la captura en bruto y la extracción son fases posteriores y necesitan la aprobación de Fabián.
- **Tablas `enc_*`:** `enc_areas` y `enc_area_campos` (configuración: los campos específicos son datos, cada ficha los guarda en `enc_fichas.campos` con claves `c01`, `c02`…), `enc_fuentes` (F001…), `enc_documentos` (D00001…), `enc_documento_contenido` (texto en bruto, PRIVADO: solo admin y asesor), `enc_fichas` (códigos I/E/R/C/T/TR/CR/N + número), `enc_relaciones`, `enc_ficha_fuentes` (enlace ficha ↔ documento o fuente con ubicación y tipo de evidencia), `enc_ficha_vinculos`, `enc_incidencias` (X0001) y la vista `enc_v_cobertura`.
- **Modos de área:** `fichas` (1–11), `fuentes` (12: se resuelve con fuentes y documentos) y `catalogo_pm` (13). El área 13 y el escandallo NO se duplican: `enc_ficha_vinculos` enlaza con `productos_pm`, `ingredientes_extra`, `elaboraciones` y `platos`. Un trigger impide crear fichas en las áreas 12 y 13. En el área 11 toda ficha lleva bloque (11A/11B España, 11C/11D EEUU y mundo).
- **Estados** (sección 6): `registrada`, `pendiente_de_captura`, `capturada`, `texto_extraido`, `pendiente_de_revision`, `contrastada`, `validada_en_prueba`, `bloqueada`, `descartada_con_motivo` (exige motivo; descartar nunca borra el original). La validación de la ficha (campo común 10) es aparte: pendiente, contrastada, prueba real o propuesta propia.
- **Reglas del framework que respeta el código:** la IA no es fuente primaria (no existe tipo de evidencia «ia»); todo dato se enlaza a documento o fuente + ubicación + fecha + tipo de evidencia; datos ausentes = «Pendiente» / «No disponible»; España y EEUU/mundo separados; costes internos de PM fuera de las fichas públicas.
- Búsqueda de texto: `enc_fichas.busqueda` (tsvector en español mantenido por trigger); la app busca por prefijo.

## Estado (24/11/2026)
- Hecho: todos los módulos v1, acceso por correo/contraseña, PVP dinámico, alta de cliente y Excel de clientes, comparables por código postal/radio, Enciclopedia fase 1 (estructura y fuentes).
- Pendiente de terceros: Excel de tarifa PM (carpeta Drive «Burger Intelligence — Tarifas PM Hamburguesería», vacía). Fijar columnas con el informático.
- Pendiente de Fabián: food cost objetivo por categoría; datos del cliente piloto.
- Pendiente de desarrollo: Enciclopedia fase 2 (captura en bruto por lotes con manifiesto e integridad) y fase 3 (extracción de fichas), textos con IA, fotos en Supabase Storage, despliegue con cuenta de PM.
- Plan de pruebas del framework: T1–T9 (T2, T3 y T4 verificados en SQL).
