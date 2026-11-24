# PM Verticales

Herramienta de asesoramiento de cartas de Picking Market (PM) por vertical. Primer vertical: Hamburguesería.
Responde siempre en español. Las instrucciones personales de Fabi están en su `~/.claude/CLAUDE.md` (aplican siempre).

## Stack y arranque
- React 19 + TypeScript + Vite en el navegador; Supabase (Postgres, Auth, RLS). Sin servidor propio.
- `npm run dev` → http://localhost:3000 (puerto fijo: coincide con la URL de Auth de Supabase). `npm run build` comprueba tipos y compila. `npm run lint` usa oxlint (hay avisos antiguos; no añadir nuevos).
- Proyecto Supabase `pm-verticales`, ref `epjdvkuqrvqvqadewbjr`. Claves en `.env.local` (no se sube). Solo se usa la clave publicable; la seguridad la da RLS.
- Los comandos de Git se ejecutan con identidad `Claude <noreply@anthropic.com>` (`git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...`) porque el equipo no tiene identidad configurada. No tocar la configuración global de Git.

## El repositorio es PÚBLICO
https://github.com/fabianbaezferreira/pm-verticales es público. No subir nada interno de Picking Market: tarifas, costes, precios de compra, catálogo privado, claves, datos de clientes, contenido en bruto capturado. Antes de subir documentos nuevos, confirmar con Fabi.

## Base de datos
- Migraciones en `supabase/migrations/` (`AAAAMMDDHHMMSS_NN_nombre.sql`). Se aplican con el MCP de Supabase (`apply_migration`) y se guarda el mismo SQL en el repositorio. Las 01–08 son anteriores al repositorio. Solo añadir (columnas/tablas nuevas); no borrar datos ni tablas sin preguntar.
- Roles (tabla `perfiles`, función `privado.fn_rol()`): `admin`, `asesor`, `comercial`, `direccion`. `edita` = admin y asesor; `veCostes` = admin, asesor y dirección.
- Patrón RLS: cada tabla con políticas `lectura` / `alta` / `cambio` / `baja`, usando `(select privado.fn_rol())`. Funciones auxiliares en el esquema `privado`, con `search_path` fijado.
- Tras cambiar el esquema, pasar `get_advisors` (seguridad). Los dos avisos actuales (`fn_precios_carta` y contraseñas filtradas) son anteriores y conocidos.
- Los cálculos de coste viven en la base de datos (vistas y funciones), no en la app.

## Convenciones de código
- Páginas en `src/pages`, utilidades en `src/lib`, componentes en `src/components`. Carga de datos con `useLoad`; formularios que guardan al salir del campo (`onBlur`). Textos de la interfaz en español.
- No usar `.single()` si puede haber 0 filas (devuelve error 406); usar `.maybeSingle()`.

## Comparables de zona
Cada cliente elige cómo buscar (`clientes.modo_comparables`): `zona` (texto exacto), `codigo_postal` o `radio` (km en línea recta con latitud y longitud). La lógica está en `src/lib/comparables.ts`. «Localizar» envía la dirección a OpenStreetMap (Nominatim); es lo único que sale de la app hacia un servicio de mapas.

## Enciclopedia (Burger Intelligence)
Fuente de diseño: `docs/burger-intelligence/Burger_Intelligence_Framework_Maestro_2026-11-23.md` (secciones 2–8). Es la referencia: las 13 áreas y sus campos ya están aprobados, no rediseñar.

- **Fase 1 (hecha):** estructura, configuración y carga de las 30 fuentes (27 del framework + F028 Reglamento (UE) 1169/2011, F029 RD 126/2015, F030 Reglamento (CE) 2073/2005; las áreas de estas tres son asignación provisional). **No hay contenido capturado ni redactado todavía.** No inventar ni rellenar fichas: la captura en bruto y la extracción son fases posteriores y requieren aprobación de Fabi.
- **Tablas `enc_*`:** `enc_areas` y `enc_area_campos` (configuración: los campos específicos son datos, no columnas; cada ficha los guarda en `enc_fichas.campos` con claves `c01`, `c02`…), `enc_fuentes` (F001…), `enc_documentos` (D00001…), `enc_documento_contenido` (texto en bruto, PRIVADO: solo admin y asesor), `enc_fichas` (I/E/R/C/T/TR/CR/N + número), `enc_relaciones`, `enc_ficha_fuentes` (enlace ficha ↔ documento o fuente con ubicación y tipo de evidencia), `enc_ficha_vinculos`, `enc_incidencias` (X0001), vista `enc_v_cobertura`.
- **Modos de área:** `fichas` (áreas 1–11), `fuentes` (área 12: se resuelve con fuentes y documentos) y `catalogo_pm` (área 13). El área 13 y el escandallo NO se duplican: `enc_ficha_vinculos` enlaza con `productos_pm`, `ingredientes_extra`, `elaboraciones` y `platos`. Un trigger impide crear fichas en las áreas 12 y 13.
- **Área 11:** las fichas deben llevar bloque (11A/11B España, 11C/11D EEUU y mundo); el mercado se deduce del bloque.
- **Estados** (sección 6): `registrada`, `pendiente_de_captura`, `capturada`, `texto_extraido`, `pendiente_de_revision`, `contrastada`, `validada_en_prueba`, `bloqueada`, `descartada_con_motivo` (exige motivo; descartar nunca borra el original). La validación de la ficha (campo común 10) es aparte: pendiente, contrastada, prueba real o propuesta propia.
- **Reglas del framework que el código respeta:** la IA no es fuente primaria (no existe tipo de evidencia «ia»); cada dato se enlaza a documento o fuente + ubicación + fecha + tipo de evidencia; datos ausentes = «Pendiente» / «No disponible»; separar España y EEUU/mundo; separar información pública de costes internos de PM.
- **Pantallas:** `src/pages/Enciclopedia.tsx` (áreas, búsqueda, cobertura), `EnciclopediaFuentes.tsx` (fuentes, documentos, incidencias), `EnciclopediaFicha.tsx` (ficha). Tipos, estados y constantes en `src/lib/enciclopedia.ts`.
- Búsqueda de texto: `enc_fichas.busqueda` (tsvector en español, mantenido por trigger); la app busca por prefijo.
