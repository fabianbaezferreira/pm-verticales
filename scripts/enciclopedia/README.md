# Scripts de la Enciclopedia (Burger Intelligence)

Solo código. El contenido capturado NO se guarda en este repositorio (es público): vive en `Documents\Enciclopedia_bruto\` en el equipo de trabajo.

- `generar_seed.py`: genera la migración de carga (áreas, campos y fuentes) a partir del framework maestro.
- `captura_lote.py <fuentes.json> <carpeta_lote>`: captura por lotes (respeta robots.txt, espera 2,5 s, no salta bloqueos). Crea `originales/`, `texto_completo/`, `manifiesto.csv`, `cobertura_fuentes.csv`, `pendientes.csv`, `incidencias.csv`, `informe_cobertura.md` e `historial/`. El JSON de entrada es una lista de `{codigo, nombre, url}`.
- `reclasificar.py <carpeta_lote>`: aplica la revisión manual del contenido (el HTTP 200 no basta) y regenera los ficheros de control. Los ajustes están en el propio script (`AJ`, `VAL`) y son específicos del lote 20261124.
