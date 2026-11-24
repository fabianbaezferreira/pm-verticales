# PM Verticales

Herramienta de asesoramiento de cartas de **Picking Market**, por tipo de establecimiento. Primer vertical: **Hamburguesería**.
Basada en *Framework_PM_Verticales_Hamburgueserias_v1.0*. Propiedad de Picking Market.

Stack: React + TypeScript (Vite) en el navegador · Supabase (base de datos Postgres, usuarios y permisos con RLS).
Todo el cálculo de costes vive en la base de datos (funciones y vistas), así que la app y cualquier informe futuro calculan igual.

## Módulos

| Módulo | Qué hace |
| --- | --- |
| Tarifas | Importa el Excel de tarifa PM (sin IVA). Mapeo de columnas guardado, vista previa con errores, versión de tarifa y cambios de precio frente a la anterior. |
| Catálogo PM | Referencias con precio vigente, €/unidad base, fecha de tarifa y alérgenos. |
| Ingredientes extra | Productos fuera de catálogo con precio, fecha y fuente. |
| Elaboraciones | Sub-recetas reutilizables (anidables). Coste por kg/l/ud y alérgenos heredados. |
| Platos | Composición por roles de la plantilla del vertical, merma, mano de obra, escandallo, PVP por multiplicador y por food cost, textos, estado (teórica → validada). |
| Clientes | Brief: zona, concepto, ticket, equipos, canales, restricciones. |
| Cartas | Biblioteca filtrada por compatibilidad, PVP por 4 métodos con justificación, redondeo de carta, revisión de reglas, indicadores, versiones, foto fija de escandallos. |
| Propuesta | Documento imprimible (PDF desde el navegador) para cliente o interno, con o sin escandallos. |
| Configuración | Categorías (food cost objetivo, multiplicador), reglas del vertical, plantillas de plato, estilos, ajustes generales. |

El PVP es dinámico: se recalcula solo cuando cambian coste, tarifa, multiplicador, food cost objetivo o redondeo.
Cada plato en cada carta elige método:

- **Multiplicador**: coste × k. k se escribe por plato o por plato en la carta (como en Workspace); si no, hereda cliente → categoría → vertical → general (2,5 solo como valor de partida).
- **Food cost objetivo**: coste ÷ FC. FC por plato en la carta → plato → categoría.
- **Manual / comparables**: precio de carta con IVA fijado por el asesor.

PVP en carta = PVP sin IVA × (1 + IVA hostelería 10 %), con el redondeo de la carta (,00 / ,50 / ,90 / ,95). La ficha del plato incluye una calculadora enlazada (k ↔ FC ↔ PVP) y un simulador de PVP deseado.

## Puesta en marcha (Windows)

Requisitos: [Node.js 22 LTS](https://nodejs.org) y Git.

```powershell
git clone <url-del-repositorio>
cd pm-verticales
copy .env.example .env.local
npm install
npm run dev
```

Abre http://localhost:5173.

## Usuarios

1. Supabase → Authentication → Users → *Add user* (correo + contraseña, *Auto Confirm User*).
2. Ejecuta `supabase/alta_usuario.sql` en el SQL Editor con su correo y rol.
3. Recomendado: Authentication → Sign In / Providers → desactivar *Allow new users to sign up*. Un usuario sin perfil no ve nada, pero así no se crean cuentas sueltas.

| Rol | Ve costes | Edita recetas | Crea propuestas | Configura vertical |
| --- | --- | --- | --- | --- |
| admin | Sí | Sí | Sí | Sí |
| asesor | Sí | Sí | Sí | Categorías, plantillas y estilos |
| comercial | No | No | Sí | No |
| direccion | Sí | No | No | No |

Los permisos los impone la base de datos (RLS), no solo la interfaz. El comercial solo verá precios de carta que el asesor haya fijado (método manual, comparables, food cost o «Redondear precios de carta»).

## Formato de la tarifa PM

El importador acepta cualquier orden de columnas y recuerda el mapeo. Columnas esperadas: código, descripción, fabricante, formato, unidad (kg/l/ud; también g, ml, cl, que convierte), cantidad del formato **o** unidades × peso, precio de coste sin IVA, alérgenos (separados por coma, punto y coma o barra), conservación y fecha de tarifa.
Un código repetido dentro del mismo archivo invalida todas sus filas.

## Base de datos

Proyecto Supabase `pm-verticales` (`epjdvkuqrvqvqadewbjr`). Migraciones 01–08 creadas antes de este repositorio; 09 está en `supabase/migrations`.
Para traer el esquema completo al repositorio con la CLI de Supabase:

```powershell
npx supabase login
npx supabase link --project-ref epjdvkuqrvqvqadewbjr
npx supabase db pull
```

## Pendiente (v1 → v2)

- Textos con IA (descripción, argumento comercial, redes) con el tono del vertical.
- Capa de conocimiento: fichas de estilo, tendencias y fuentes.
- Subida de fotos a Supabase Storage (hoy: URL).
- Despliegue (Vercel u otro) con dominio de PM; `vercel.json` ya incluido.
