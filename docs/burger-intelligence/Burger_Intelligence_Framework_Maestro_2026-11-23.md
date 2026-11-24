# BURGER INTELLIGENCE — FRAMEWORK MAESTRO
## Base de conocimiento gastronómico para asesoramiento de cartas de hamburgueserías
**Versión documental:** 1.0 · **Fecha de corte:** 23/11/2026  
**Estado:** estructura y criterios aprobados; recopilación documental incompleta; base gastronómica definitiva y automatización mensual aún no implantadas.  
**Alcance:** investigación, conservación de fuentes, desarrollo gastronómico, cartas, operativa HORECA y catálogo interno Picking Market.

---

## 1. PROPÓSITO Y RESULTADO ESPERADO
Construir una base de conocimiento especializada en hamburguesas que permita localizar, conservar, relacionar, comparar y aplicar información sobre carnes, panes, quesos, salsas, vegetales, toppings, técnicas, recetas, estilos, combinaciones, operativa, tendencias y normativa española. El proyecto no es una lista de hamburgueserías ni un recetario aislado: debe servir para **asesorar cartas reales**, desarrollar propuestas reproducibles, adaptar ingredientes al concepto de negocio, evaluar el servicio y preparar escandallos con referencias de Picking Market cuando se aporten datos internos.

**Resultados funcionales esperados:** buscador de conocimiento con referencias a las fuentes; fichas de productos e ingredientes; buscador de recetas/estilos; matriz de combinaciones; comparador técnico y operativo; herramientas para crear cartas; escandallos; informes mensuales; exportación descargable de originales, datos y documentación.

**Límites:** ninguna receta queda validada sensorialmente sin prueba real; ninguna tendencia internacional acredita demanda española por sí sola; no se presuponen formatos, precios ni características de los productos Picking Market; no inventar datos ausentes.

## 2. REGLAS DE GOBIERNO Y TRABAJO
1. **Una tarea, una acción, una validación.** Dar instrucciones breves, inequívocas, de clic, copia, pega o descarga cuando la actuación corresponda al usuario.
2. **No cambiar el orden del procedimiento aprobado** sin explicar el motivo y acordar el cambio. Automatizar por lotes y evitar instrucciones de código repetidas.
3. **Primero conservar la información en bruto; después analizarla.** No sustituir documentos íntegros por resúmenes ni tirar versiones antiguas.
4. Conservar fuente, URL original y final, fecha, autor, formato, estado de acceso, versión y comprobación de integridad de cada elemento.
5. Diferenciar **hechos documentados**, **opiniones profesionales**, **publicidad**, **hipótesis**, **propuestas propias** y **validaciones mediante pruebas**.
6. Marcar los datos ausentes como «No disponible» o «Pendiente». No rellenar vacíos por intuición.
7. Separar mercado **España** de **EEUU/resto del mundo**; separar información pública del catálogo comercial privado de Picking Market.
8. La normativa y seguridad alimentaria se rigen por derecho aplicable en España: UE, Estado/BOE, comunidad autónoma y municipio cuando proceda. Priorizar fuentes oficiales.
9. Respetar licencias, términos de uso, derechos de autor, límites de acceso y bloqueos. No forzar CAPTCHA ni obtener contenido de pago sin autorización.
10. Cualquier criterio cuantitativo debe mostrar base de cálculo, unidades, versión, periodo y fuente.
11. El estado del proyecto debe quedar reconstruible mediante registro de decisiones, pasos, incidencias, archivos y siguiente acción concreta.
12. **Búsqueda, actualización de datos e informe de novedades: frecuencia mensual**, una vez implantada la automatización. Tarifas y catálogo PM se revisan cuando se aporten nuevas versiones.

## 3. ARQUITECTURA DE CONOCIMIENTO
**Flujo obligatorio:** registro de fuentes → identificación de contenidos pertinentes → recuperación autorizada → **archivo bruto inalterado** → inventario y control de integridad → extracción estructurada → normalización/relaciones → comparación y contraste → revisión gastronómica/operativa → consulta y exportación → revisión mensual.

**Capas separadas:**
- **A. Biblioteca documental original:** HTML, PDF, documentos técnicos y demás archivos accesibles y permitidos, sin truncamientos; versiones y fechas.
- **B. Texto íntegro de consulta:** extracción del documento original sin resumirlo, con vínculo al archivo y a la URL.
- **C. Datos estructurados:** ingredientes, recetas, estilos, procesos, gramajes, técnicas, combinaciones, etc.; cada dato apuntará a su procedencia.
- **D. Conocimiento analítico:** comparativas, conflictos entre fuentes, implicaciones sensoriales, riesgos operativos y propuestas de desarrollo. No mezclar esto con el dato bruto.
- **E. Catálogo privado Picking Market:** referencias, documentación, precios y costes internos, relacionados con las fichas públicas pero segregados.
- **F. Herramienta de consulta:** filtros, búsqueda textual y por relaciones, fichas, comparador, exportaciones y panel de cobertura.

## 4. CAMPOS COMUNES A TODAS LAS FICHAS (PASO 3 VALIDADO)
1. **Identificación:** nombre, categoría y subcategoría.
2. **Descripción:** características y propiedades.
3. **Datos técnicos:** composición, elaboración y especificaciones.
4. **Aplicaciones:** usos gastronómicos y técnicas compatibles.
5. **Combinaciones:** ingredientes relacionados y afinidades.
6. **Operativa:** preparación, conservación y servicio.
7. **Información comercial:** formatos, proveedores y precios, cuando existan.
8. **Fuentes:** enlaces, documentos y fechas de consulta.
9. **Comparativas:** alternativas, ventajas e inconvenientes.
10. **Validación:** información contrastada, pendiente, prueba real o propuesta propia.

**Fichas autónomas y relacionadas:** estilos de hamburguesa, recetas completas y combinaciones/food pairing no son simples celdas dentro de otras fichas. Deben contar con identidad y relaciones propias.

## 5. LAS 13 ÁREAS APROBADAS (PASO 4 COMPLETADO)
### ÁREA 01 — Carnes y proteínas
**12 campos específicos:** 1) Proteína (vacuno, cerdo, pollo, cordero, pescado, vegetal, etc.); 2) Cortes, procedencia y características; 3) Composición, porcentajes de grasa y mezclas; 4) Formato, peso, grosor y diámetro; 5) Picado, granulometría, manipulación y formado; 6) Técnicas de preparación y cocción; 7) Temperaturas, tiempos y comportamiento; 8) Resultado sensorial, textura, jugosidad y Maillard; 9) Rendimiento y mermas; 10) Conservación, descongelación y seguridad; 11) Compatibilidad con pan, queso, salsas y toppings; 12) Variantes, mezclas y recetas documentadas.

### ÁREA 02 — Panes y formatos
**13 campos específicos:** 1) Tipo (brioche, potato bun, pretzel, clásico, integral, sin gluten, etc.); 2) Composición (harinas, grasas, azúcares, hidratación); 3) Perfil sensorial, miga, corteza y elasticidad; 4) Peso, diámetro, altura y capacidad de relleno; 5) Formatos comerciales; 6) Amasado, fermentación y horneado; 7) Tostado, regeneración y temperatura; 8) Resistencia a humedad, salsas y rotura; 9) Compatibilidad con estilos y rellenos; 10) Conservación, vida útil y descongelación; 11) Manipulación, montaje y delivery; 12) Comparativas y alternativas; 13) Proveedores, referencias, formatos y precios disponibles.

### ÁREA 03 — Quesos
**16 campos específicos:** 1) Tipo/variedad; 2) Origen, leche y elaboración; 3) Composición, grasa, humedad, proteínas y sal; 4) Maduración; 5) Perfil sensorial; 6) Fundencia, velocidad y elasticidad; 7) Comportamiento térmico, separación de grasa y costra; 8) Formatos y presentación; 9) Gramajes; 10) Compatibilidades; 11) Food pairing; 12) Aplicaciones, rellenos y salsas; 13) Operativa y regeneración; 14) Conservación y vida útil tras apertura; 15) Comparativas y sustituciones; 16) Fabricantes, precios y coste por ración.

### ÁREA 04 — Salsas y aderezos
**18 campos específicos:** 1) Tipo de salsa; 2) Clasificación (emulsión, reducción, fermentada, cremosa, vinagreta, caliente); 3) Ingredientes, cantidades y porcentajes; 4) Receta, elaboración y rendimiento; 5) Perfil gustativo; 6) Textura, viscosidad y adherencia; 7) Técnicas; 8) Estabilidad, oxidación y separación de fases; 9) Aplicaciones; 10) Dosificación y puntos de aplicación; 11) Compatibilidades; 12) Food pairing; 13) Conservación, vida útil validada y seguridad; 14) Alérgenos y sustituciones; 15) Mise en place, dosificadores y servicio; 16) Variantes a partir de bases; 17) Comparativas y sustitutos; 18) Fabricantes, formatos, precios y coste por ración.

### ÁREA 05 — Vegetales y encurtidos
**20 campos específicos:** 1) Ingrediente; 2) Clasificación (fresco, encurtido, fermentado, asado, confitado, deshidratado); 3) Variedad, origen y disponibilidad; 4) Composición; 5) Perfil sensorial; 6) Textura; 7) Preparaciones; 8) Formulaciones, cantidades y rendimiento; 9) Cortes, tratamientos y técnicas; 10) Pérdida de agua, oxidación y estabilidad; 11) Dosificación; 12) Compatibilidades; 13) Food pairing; 14) Aplicaciones; 15) Conservación y seguridad; 16) Mise en place, montaje y delivery; 17) Mermas y costes reales; 18) Estacionalidad; 19) Comparativas; 20) Proveedores, formatos, precios y coste por ración.

### ÁREA 06 — Toppings y guarniciones
**21 campos específicos:** 1) Denominación; 2) Clasificación; 3) Ingredientes y proporciones; 4) Formato de presentación; 5) Perfil sensorial; 6) Textura y contrastes; 7) Receta, elaboración y rendimiento; 8) Fritura, horneado, confitado, caramelización, ahumado u otras técnicas; 9) Comportamiento térmico y humedad; 10) Gramaje; 11) Compatibilidades; 12) Food pairing; 13) Aplicaciones; 14) Guarniciones específicas (patatas, boniato, aros, mac & cheese, coleslaw, etc.); 15) Emplatado y ración; 16) Conservación y seguridad; 17) Regeneración; 18) Operativa y delivery; 19) Mermas y absorción de grasa; 20) Comparativas; 21) Fabricantes, formatos, precios, escandallo y coste por ración. Los ingredientes ya existentes se **vinculan** sin duplicar fichas.

### ÁREA 07 — Recetas, estilos y combinaciones
**26 campos específicos:** 1) Nombre; 2) Estilo (smash, Oklahoma, clásica, steakhouse, slider, Juicy Lucy, etc.); 3) Origen/autor; 4) Concepto gastronómico; 5) Lista completa de ingredientes; 6) Cantidades y número de raciones; 7) Pan, variedad y formato; 8) Proteína, corte, grasa, peso y formato; 9) Quesos y cantidades; 10) Salsas y dosificación; 11) Toppings/vegetales y gramajes; 12) Elaboración completa; 13) Métodos, temperaturas y tiempos; 14) Orden de montaje y presentación; 15) Perfil sensorial; 16) Justificación de food pairing; 17) Variantes y sustituciones; 18) Mise en place, equipos, tiempos y dificultad; 19) Conservación y vida útil validada; 20) Servicio, presentación y delivery; 21) Escandallo, mermas y rendimiento; 22) Precio de venta/margen cuando existan datos; 23) Posicionamiento, público y aplicación comercial; 24) Comparativas de recetas; 25) Fuentes originales, autores y fechas; 26) Estado de validación.

**Reglas:** conservar por separado la receta original y las adaptaciones; consultar combinaciones de forma independiente; relacionar ingredientes y productos de Picking Market; no confundir receta documentada con receta probada; no mezclar precios públicos e internos.

### ÁREA 08 — Técnicas de elaboración y cocción
**24 campos específicos:** 1) Nombre; 2) Clasificación; 3) Fundamento/objetivo; 4) Aplicaciones; 5) Procedimiento; 6) Equipo; 7) Parámetros técnicos; 8) Picado, mezcla y formado de proteínas; 9) Smash, plancha, brasa, parrilla, horno, fritura, etc.; 10) Reacciones culinarias; 11) Control térmico y seguridad; 12) Humedad y grasas; 13) Resultado sensorial; 14) Rendimiento y merma; 15) Errores y correcciones; 16) Comparativas; 17) Estandarización; 18) Capacidad operativa; 19) Conservación y regeneración; 20) Riesgos y normativa; 21) Compatibilidad con ingredientes/formatos; 22) Innovación; 23) Fuentes/evidencias; 24) Validación. Distinguir ciencia, práctica documentada y opinión.

### ÁREA 09 — Food pairing y desarrollo gastronómico
**24 campos específicos:** 1) Ingredientes; 2) Familias; 3) Perfil aromático y compuestos cuando haya datos; 4) Perfil gustativo; 5) Afinidades documentadas; 6) Contrastes de sabor, aroma y temperatura; 7) Equilibrio grasa-acidez-intensidad-frescor; 8) Texturas; 9) Combinaciones tradicionales; 10) Innovadoras; 11) Compatibilidad técnica; 12) Proporciones; 13) Interacciones negativas; 14) Correcciones; 15) Sustituciones; 16) Aplicación por estilos; 17) Desarrollo de recetas; 18) Diferenciación de carta; 19) Viabilidad operativa; 20) Viabilidad económica; 21) Evaluación sensorial y cata; 22) Comparativas; 23) Fuentes científicas y profesionales; 24) Validación. **La afinidad aromática no garantiza éxito gastronómico.** Cuestionar combinaciones débiles y distinguir hipótesis de pruebas reales.

### ÁREA 10 — Operativa, conservación, servicio y seguridad alimentaria española
**26 campos específicos:** 1) Proceso; 2) Recepción y controles; 3) Almacenamiento; 4) Conservación y límites validados; 5) Trazabilidad; 6) FIFO/FEFO; 7) Seguridad alimentaria/autocontrol; 8) Alérgenos y contaminación cruzada; 9) Mise en place; 10) Producción anticipada; 11) Organización de cocina; 12) Equipamiento; 13) Procedimientos normalizados; 14) Tiempos de preparación/cocción/montaje; 15) Capacidad de servicio y cuellos de botella; 16) Personal y carga; 17) Secuencia de montaje; 18) Control de calidad; 19) Servicio en sala; 20) Delivery/takeaway/envases; 21) Regeneración; 22) Gestión de mermas; 23) Costes operativos; 24) Indicadores; 25) Incidencias y medidas preventivas; 26) Comparativas operativas.

**Regla jurídica aprobada:** aplicar normativa UE, española, autonómica (Andalucía cuando proceda) y municipal vigente; verificar norma, artículo, fecha de consulta y ámbito de aplicación. Diferenciar obligación legal de recomendación técnica o práctica propia. No importar requisitos jurídicos estadounidenses. Fuentes iniciales: Reglamento (CE) 852/2004, Real Decreto 1021/2022 y AESAN; revisar siempre sus versiones vigentes y normas complementarias. No inventar caducidades, temperaturas ni vidas útiles.

### ÁREA 11 — Tendencias y análisis de mercado
**28 campos específicos:** 1) Tendencia/definición; 2) Clasificación; 3) Origen geográfico; 4) Evolución temporal; 5) Popularidad documentada; 6) Estilos emergentes; 7) Ingredientes de tendencia; 8) Innovación; 9) Preferencias de consumidor; 10) Segmentación; 11) Análisis de cartas; 12) Precios públicos comparables; 13) Posicionamiento; 14) Competencia; 15) Canales de venta; 16) Tendencias internacionales; 17) Mercado español; 18) Mercado local (Sevilla/Cádiz y ampliable); 19) Estacionalidad; 20) Redes sociales; 21) Oportunidades; 22) Riesgos y modas pasajeras; 23) Aplicación gastronómica; 24) Viabilidad operativa; 25) Viabilidad económica; 26) Comparativas país/periodo/concepto; 27) Fuentes y datos; 28) Nivel de validación.

**Cuatro bloques obligatorios y separados:**
- **11A — Influencers/creadores España:** especializados casi exclusivamente en hamburguesas. Nombre, perfiles, plataformas, contenidos, especialización, audiencias documentadas, colaboraciones y credibilidad.
- **11B — Tendencias España:** estilos, panes, proteínas, quesos, salsas, toppings, recetas, formatos, precios, demanda y evolución con datos específicos de España.
- **11C — Influencers/creadores EEUU y mundo:** misma ficha, país y mercado de influencia; registrar tendencias, recetas y publicaciones.
- **11D — Tendencias EEUU y mundo:** innovaciones y oportunidades de adaptación, sin atribuir demanda española no demostrada.

**Reglas:** no confundir viralidad con demanda ni opiniones de creadores con investigación de mercado; registrar fecha y país; comparar precios solo en formatos equivalentes; separar datos de España e internacionales.

### ÁREA 12 — Fuentes, documentación, evidencias y vigilancia mensual
**26 campos específicos:** 1) Nombre de fuente; 2) Clase de fuente; 3) Especialidad; 4) País e idioma; 5) Autoría; 6) URL; 7) Tipo de documento; 8) Fecha publicación/actualización; 9) Fecha de consulta; 10) Archivo original permitido; 11) Texto y datos extraídos; 12) Áreas relacionadas; 13) Datos técnicos; 14) Recetas identificadas; 15) Combinaciones; 16) Datos comerciales; 17) Fiabilidad; 18) Tipo de evidencia; 19) Contradicciones; 20) Coincidencias entre fuentes; 21) Duplicados; 22) Lagunas; 23) Relaciones con otras fichas; 24) Derechos de uso; 25) Historial/versiones; 26) Estado de revisión.

**Régimen mensual aprobado:** una búsqueda al mes, una actualización de la base al mes y **un informe de novedades al mes**. El informe debe cubrir tendencias España, tendencias internacionales, nuevos ingredientes/recetas/combinaciones, influencers y oportunidades para el mercado español. La programación todavía no está activa.

### ÁREA 13 — Catálogo Picking Market para hamburgueserías (PRIVADO)
**18 campos específicos:** 1) Identificación, nombre y código; 2) Fabricante, proveedor y origen; 3) Descripción; 4) Ingredientes, composición y alérgenos; 5) Formatos, peso, unidades y embalaje; 6) Coste de compra, precio venta, €/kg y €/ud; 7) Conservación, caducidad y vida útil tras apertura; 8) Instrucciones de uso/cocción/regeneración; 9) Rendimiento y merma; 10) Escandallo por ingrediente, elaboración y ración; 11) Aplicaciones en recetas/estilos; 12) Food pairing; 13) Referencias complementarias; 14) Comparativas con alternativas; 15) Operativa; 16) Disponibilidad, mínimo de pedido y condiciones; 17) Fichas técnicas, etiquetado y trazabilidad; 18) Historial de tarifas, formatos y referencias.

**Reglas:** costes, márgenes, tarifas y condiciones internos solo en espacio privado; no afirmar disponibilidad ni composición sin documentos; conectar el catálogo con todas las áreas; actualizar tarifas cuando se aporten nuevas versiones; escandallos con rendimientos y bases de cálculo identificadas.

## 6. MODELO DE DATOS RELACIONADOS
Las fichas **no son 13 hojas desconectadas**. Cada registro tendrá identificador único y relaciones navegables.

**Entidades mínimas:**
- **Fuente** (F001…): editor/autor, mercado, URL, tipo, acceso, prioridad, estado.
- **Documento** (D...): fuente, URL original/final, fecha, formato, original conservado, texto completo, integridad, derechos de uso, estado.
- **Ingrediente/producto gastronómico** (I...): área, nombre normalizado, sinónimos, atributos, formatos, aplicaciones, variantes.
- **Estilo** (E...): denominación, origen, técnica, gramajes/formatos documentados, ingredientes característicos.
- **Receta** (R...): autor/origen, versión original, cantidades, pasos, raciones, ingredientes vinculados, estilo y documentos fuente.
- **Combinación** (C...): ingredientes relacionados, función de cada uno, proporciones, evidencias, evaluación sensorial y estado.
- **Técnica** (T...): procedimiento, parámetros, controles, equipos, riesgos y ejemplos.
- **Referencia Picking Market** (PM...): código interno, ficha técnica, formatos, costes y precios por versión; permisos restringidos.
- **Escandallo** (ES...): receta y versión, referencias utilizadas, peso bruto/neto, merma, precio aplicado, coste y fecha de tarifa.
- **Tendencia** (TR...): mercado, periodo, tipo, fuente, indicador, nivel de evidencia e implicación local.
- **Creador/influencer** (CR...): país, plataformas, alcance verificado, contenido, colaboraciones, especialidad.
- **Incidencia** (X...): fuente, URL, causa, fecha, solución/estado.

**Trazabilidad mínima por dato:** ID de documento + URL + ubicación en fuente (título/sección/párrafo cuando sea posible) + fecha + tipo de evidencia + estado de revisión. **La IA no puede convertirse en fuente primaria de sí misma.**

**Estados sugeridos:** `registrada`, `pendiente_de_captura`, `capturada`, `texto_extraido`, `pendiente_de_revision`, `contrastada`, `validada_en_prueba`, `bloqueada`, `descartada_con_motivo`. `Descartada` no implica borrar el original.

## 7. PROCEDIMIENTO DE CAPTURA EN BRUTO
**No repetir rastreos indiscriminados ni ejecutar un código por receta.** Usar trabajo por lotes y un protocolo único:
1. Obtener inventario de las fuentes originales y conservar el registro.
2. Identificar tipo de recurso: artículo HTML, sección de recetas, PDF, estudio, normativa, vídeo/transcripción, catálogo privado, acceso restringido.
3. Descubrir **solo** contenidos pertinentes; mantener candidatos no visitados, para no perder oportunidades.
4. Recuperar por medios autorizados el contenido **íntegro**, no solo 500 caracteres ni un resumen.
5. Guardar original, texto integral, metadatos, enlaces, fecha, procedencia, huella y versión.
6. Registrar bloqueos y páginas de verificación, sin tratarlas como artículos recuperados.
7. Consolidar inventario con trabajos anteriores sin sobrescribir originales. Duplicados por contenido, no solo por URL.
8. Medir por fuente **URL candidatas, capturas útiles, contenido ajeno, bloqueos, pendientes y formatos**.
9. Entregar ZIP controlado con informe de cobertura; el recuento de archivos por sí solo no demuestra éxito.
10. **Solo después** iniciar extracción de ingredientes, técnicas, estilos, recetas, combinaciones y datos de mercado, conservando referencia al original.

**Estructura de cada entrega por lote:** `originales/`, `texto_completo/`, `manifiesto.csv`, `cobertura_fuentes.csv`, `pendientes.csv`, `incidencias.csv`, `informe_cobertura.md`, `historial/`. Cualquier archivo incompleto o bloqueado debe aparecer señalado.

**Calidad:** no declarar captura correcta únicamente por estado HTTP 200; validar contenido real y eliminar falsos positivos por CAPTCHA, redirecciones o páginas de navegación. La extracción de recetas puede usar datos estructurados de páginas, pero deben conservarse también las versiones originales autorizadas.

## 8. REGISTRO DE FUENTES INICIAL — 27 ENTRADAS (PASO 5 VALIDADO)
Las fuentes siguientes son las registradas en el Excel V0.1. **Estar registrada no significa tenerla descargada, íntegra o verificada**. La web, el idioma, el acceso y el enfoque pueden cambiar. El listado debe ampliarse más adelante con nuevas fuentes, fabricantes, bibliografía, estudios y creadores.

| ID | Fuente | Mercado | Tipo | Áreas relacionadas | Enlace |
|---|---|---|---|---|---|
| F001 | Serious Eats — Burger Lab (10 consejos) | EEUU | Técnica profesional | 1, 7, 8 | [Abrir](https://www.seriouseats.com/the-burger-labs-top-ten-tips-for-better-burgers) |
| F002 | Serious Eats — Recetas clásicas | EEUU | Recetario técnico | 7, 8 | [Abrir](https://www.seriouseats.com/hamburger-recipes-7814305) |
| F003 | AmazingRibs — Burger Recipes | EEUU | Técnica y recetario | 1, 7, 8 | [Abrir](https://amazingribs.com/tested-recipes/burgers/) |
| F004 | King Arthur Baking — Potato Buns | EEUU | Panadería técnica | 2 | [Abrir](https://www.kingarthurbaking.com/recipes/hamburger-potato-buns-recipe) |
| F005 | King Arthur Baking — Beautiful Burger Buns | EEUU | Panadería técnica | 2 | [Abrir](https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe) |
| F006 | Panamar — Gama Burger | España | Fabricante / catálogo | 2, 13 | [Abrir](https://www.panamarbakery.com/gama-burger) |
| F007 | Great British Chefs — Burger Recipes | Reino Unido | Recetario profesional | 1, 7, 9 | [Abrir](https://www.greatbritishchefs.com/collections/burger-recipes) |
| F008 | Great British Chefs — Wagyu + fermentados | Reino Unido | Receta profesional | 1, 5, 7, 9 | [Abrir](https://www.greatbritishchefs.com/recipes/wagyu-beef-burger-recipe-fermented-lettuce) |
| F009 | Foodpairing — Salmon & Pork Burger | Internacional | Food pairing | 7, 9 | [Abrir](https://www.foodpairing.com/hamburger-pairings-with-salmon-and-pork/) |
| F010 | Gastronomía & Cía — Salsa pepinillo/mostaza | España | Receta divulgativa | 4, 5, 7 | [Abrir](https://www.gastronomiaycia.com/salsa-de-pepinillos-y-mostaza-una-receta-sabrosa-para-hamburguesas-sandwiches-y-dips/) |
| F011 | Unilever Food Solutions — Tendencias burger | España | HORECA / fabricante | 4, 7, 11B | [Abrir](https://www.unileverfoodsolutions.es/ideas-menu/inspiracion-para-tu-restaurante-y-bar/salsas-burger/inspiracion-burger.html) |
| F012 | Unilever Food Solutions — Vender burgers | España | HORECA / comercial | 7, 11B | [Abrir](https://www.unileverfoodsolutions.es/ideas-menu/inspiracion-para-tu-restaurante-y-bar/salsas-burger/como-vender-mas-burgers.html) |
| F013 | Burgerdudes — Reviews | Suecia / global | Reseñas especializadas | 7, 11C, 11D | [Abrir](https://www.burgerdudes.se/reviews/) |
| F014 | Burgerdudes — World's Best Burgers 2026 | Suecia / global | Reseñas / ranking | 11C, 11D | [Abrir](https://www.burgerdudes.se/news/the-worlds-best-burgers-2026/) |
| F015 | Datassential — Burgers & Sandwiches Europe | Europa (incl. España) | Estudio de mercado | 11B, 11D | [Abrir](https://datassential.com/resource/burger-and-sandwich-innovations-europes-evolution-in-handheld-food/) |
| F016 | Datassential — Burger Trends | EEUU | Estudio de mercado | 11D | [Abrir](https://datassential.com/resource/burger-trends-2024/) |
| F017 | Datassential — Burger Pricing 2026 | EEUU | Estudio de mercado | 11D | [Abrir](https://datassential.com/resource/burger-pricing-restaurant-trends-2026/) |
| F018 | Hostelería Digital — Gastrómetro 2025 | España | Prensa sectorial / mercado | 11B | [Abrir](https://www.hosteleriadigital.es/2025/11/27/segun-datos-del-gastrometro-de-just-eat-el-sector-delivery-preve-ingresar-2-450-millones-de-euros-en-2030-impulsado-por-la-conveniencia-y-la-diversificacion/) |
| F019 | Just Eat — Gastrómetro 2024 | España | Estudio de plataforma | 11B | [Abrir](https://www.just-eat.es/gastrometro/2024/) |
| F020 | Joe Burgerchallenge — canal oficial | España | Creador especializado (mixto) | 11A | [Abrir](https://www.youtube.com/channel/UCNMW_Vaq5KJBSNeirs6iCKw) |
| F021 | George Motz — Hamburger Scholar | EEUU | Autor / divulgador especializado | 7, 8, 11C | [Abrir](https://www.georgemotz.com/about-2) |
| F022 | AESAN — Carne y productos cárnicos | España | Organismo oficial | 1, 10 | [Abrir](https://aesan.gob.es/seguridad-alimentaria/higiene-alimentos/carne-carnicos) |
| F023 | AESAN — Higiene de los alimentos | España | Organismo oficial | 10 | [Abrir](https://aesan.gob.es/seguridad-alimentaria/higiene-alimentos) |
| F024 | BOE — Real Decreto 1021/2022 | España | Normativa oficial | 10 | [Abrir](https://www.boe.es/eli/es/rd/2022/12/13/1021/con) |
| F025 | EUR-Lex — Reglamento (CE) 852/2004 | Unión Europea | Normativa oficial | 10 | [Abrir](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32004R0852) |
| F026 | Toast — Menu Engineering | EEUU | Gestión y rentabilidad | 7, 10, 11D | [Abrir](https://pos.toasttab.com/blog/on-the-line/menu-engineering-menu-design) |
| F027 | Picking Market — catálogo interno | España | Catálogo privado | 13 | Sin URL: documentación interna |

**Separación de fuentes:** 26 públicas + 1 entrada interna pendiente de documentación. Para influencers y tendencias, separar 11A/11B (España) de 11C/11D (EEUU y mundo). Para seguridad alimentaria, fuentes oficiales prioritarias.

## 9. ESTADO REAL Y TRAZABILIDAD DEL TRABAJO (23/11/2026)
**Aprobado:** instrucciones de trabajo, 13 áreas, diez campos comunes, fichas específicas, cuatro bloques de tendencias, requisitos legales de España, actualización mensual futura y prioridad de conservación en bruto.

**Ficheros de trabajo disponibles:**
- `Burger_Intelligence_Registro_Fuentes_Paso_5.xlsx`: 27 fuentes y hoja de control, V0.1. El control interno del Excel refleja el estado histórico del Paso 5; la selección ya fue **validada después**.
- `Burger_Intelligence_Lote_20261123_1104.zip` (V1): 58 registros documentales, 18 recetas estructuradas, 255 ingredientes, 16 incidencias. Muchos contenidos eran extractos, no originales completos.
- `Burger_Intelligence_Archivo_Bruto_V2_20261123_112719.zip`: 213 entradas de inventario, 211 HTML originales distintos, 19 incidencias y **0 PDF originales**. Algunas páginas irrelevantes o de verificación.
- `Burger_Intelligence_Archivo_Maestro_Conservacion_V1_20261123.zip`: conserva los ZIP V1 y V2, inventario consolidado, cobertura, incidencias y control de integridad. **No es una nueva recopilación ni una base gastronómica ya analizada.**
- `Burger_Intelligence_Protocolo_Maestro_Captura_V1.md`: protocolo de captura validable y criterios de integridad.

**Cifras de inventario maestro:** 242 URL distintas; 27 fuentes registradas; material original asociado a 9 fuentes en V2; 165 URL PDF únicas detectadas y pendientes de descargar. En el control de V2 existe **una discrepancia de huella** por colisión de ruta: dos versiones de una página comparten nombre, pero una versión no quedó preservada. Los dos ZIP no deben eliminarse.

**Firecrawl:** conexión realizada; piloto de lectura probado con King Arthur Baking, Great British Chefs y BOE (entregó HTML y texto de esas páginas); Serious Eats no fue admitido en una prueba. **La exportación automática de esos nuevos originales al ZIP maestro no quedó verificada**, y no se incorporaron al archivo maestro. No atribuir a Firecrawl una captura masiva terminada.

**Estado operativo actual:** se abandonó la secuencia de pruebas y código manual en Google Colab por ineficacia. El usuario descargó y guardó el archivo maestro. **Siguiente decisión ejecutiva:** implantar un medio que permita captura selectiva por lotes y exportación verificable del original, preferiblemente ejecutado por el asistente, sin exigir que el usuario copie claves o código.

## 10. PLAN DE EJECUCIÓN A PARTIR DE ESTE FRAMEWORK
**Fase A — ya validada:** definición de objetivos, 13 áreas, campos, fuentes iniciales y reglas. No repetir.

**Fase B — en curso: documentación en bruto.**
1. Auditar los dos lotes preservados; mantener inventario y alertas de integridad.
2. Resolver captura/exportación real de documentos íntegros desde fuentes autorizadas, con archivo descargable y manifiesto verificable.
3. Piloto práctico de calidad con tipologías distintas: receta profesional, pan técnico, normativa oficial y PDF si existe acceso permitido.
4. Selección de secciones pertinentes por cada fuente; ampliar cobertura a las 27 fuentes, registrar restricciones.
5. Entregar lotes en bruto y cuadro de cobertura; ninguna fuente se marca «completa» por acumular enlaces.

**Fase C — extracción y análisis (no iniciada):** fichas de ingredientes, técnicas, panes, quesos, salsas, recetas, estilos y food pairing; normalizar unidades, idiomas y sinónimos; diferenciar hechos/hipótesis; vincular fuente original.

**Fase D — base de datos y consulta (no iniciada):** construir relaciones, filtros, búsqueda, comparador, ficha de receta/estilo e informes; importar catálogo PM cuando sea aportado; controlar datos privados.

**Fase E — validación gastronómica y comercial (no iniciada):** pruebas de recetas y combinaciones, aplicación a conceptos de hamburgueserías, operativa, rendimiento, escandallo y ajustes de carta.

**Fase F — mantenimiento (no iniciada):** búsqueda **mensual**, actualización **mensual** e informe **mensual** con España y EEUU/mundo separados; registro de cambios y versiones; revisión de tarifas PM al recibir documentos.

**Criterio de cierre de cada fase:** artefacto descargable, registro de lo conseguido y lo pendiente, control de calidad y aprobación explícita del usuario.

## 11. INSTRUCCIÓN PARA RETOMAR EL PROYECTO EN OTRO CHAT O HERRAMIENTA
> Estás trabajando en «Burger Intelligence — Base de Conocimiento Gastronómico». Este framework es la referencia del proyecto. No reinicies la fase de diseño: las **13 áreas y sus campos ya están aprobados**. El objetivo inmediato es ampliar una **biblioteca documental íntegra y verificable**, no analizar recetas todavía. Conserva sin sobrescribir los dos ZIP originales y el archivo maestro. Evita pruebas de una receta por vez, nuevos Colab y fragmentos de código manuales; trabaja por lotes e informa de cobertura real por fuente. No confundas 242 URL inventariadas con documentos completos, ni 211 HTML con información útil verificada. Firecrawl está conectado, pero la exportación a un archivo consolidado aún debe probarse de extremo a extremo. Cualquier captura debe preservar original autorizado, texto completo, procedencia, fechas, huella, bloqueo e historial. Respeta la legislación española de seguridad alimentaria y la separación público/privado del catálogo Picking Market. Búsqueda, actualización e informe futuros: **mensuales**. Da una sola acción al usuario cuando sea imprescindible; no le traslades tareas repetitivas que puedas ejecutar.

---
**Control documental:** Este framework consolida las definiciones y decisiones expresamente validadas y la auditoría de los archivos existentes a fecha 23/11/2026. Las fuentes registradas no equivalen a documentación completa, ni las propuestas técnicas pendientes deben presentarse como funcionalidades ya implantadas.
