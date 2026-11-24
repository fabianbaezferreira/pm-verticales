"""Reclasifica el lote tras revisar el contenido real (no basta el HTTP 200) y regenera los ficheros de control."""
import csv, io, json, os, shutil, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
L = sys.argv[1]
h = os.path.join(L, 'historial')
ini = os.path.join(h, 'manifiesto_inicial.json')
if not os.path.exists(ini): shutil.copy(os.path.join(h, 'manifiesto.json'), ini)     # se conserva la clasificación automática
m = json.load(open(ini, encoding='utf-8'))
pend = list(csv.DictReader(open(os.path.join(L, 'pendientes.csv'), encoding='utf-8-sig')))
inc_ini = list(csv.DictReader(open(os.path.join(L, 'incidencias.csv'), encoding='utf-8-sig')))

AJ = {   # revisión manual del contenido capturado
 'F006': ('bloqueada', 'Respuesta de «Protección Anti-DDoS y Firewall» (131 caracteres): es una página de verificación, no el contenido.', 'verificacion', None),
 'F025': ('bloqueada', 'HTTP 202 con cuerpo de 2 KB sin texto: desafío anti-bot de EUR-Lex. No se intenta saltar.', 'verificacion', None),
 'F028': ('bloqueada', 'HTTP 202 con cuerpo de 2 KB sin texto: desafío anti-bot de EUR-Lex. No se intenta saltar.', 'verificacion', None),
 'F030': ('bloqueada', 'HTTP 202 con cuerpo de 2 KB sin texto: desafío anti-bot de EUR-Lex. No se intenta saltar.', 'verificacion', None),
 'F020': ('contenido_insuficiente', 'Página de YouTube: contenido dinámico (JavaScript), sin texto útil en el HTML. Se necesitaría la API oficial o captura manual (supuesto, no verificado: las condiciones de YouTube restringen el acceso automatizado).', 'contenido_insuficiente', None),
}
VAL = {
 'F003': 'Página índice/listado: el contenido útil (recetas) está en los enlaces candidatos (pendientes.csv).',
 'F007': 'Página índice/listado: el contenido útil (recetas) está en los enlaces candidatos (pendientes.csv).',
 'F015': 'Posible resumen público de un informe de Datassential; el informe completo puede requerir registro. Revisar.',
 'F017': 'Posible resumen público de un informe de Datassential; el informe completo puede requerir registro. Revisar.',
 'F016': 'Posible resumen público de un informe de Datassential; el informe completo puede requerir registro. Revisar.',
 'F018': 'Reintento pendiente: el servidor cerró la conexión sin respuesta. No se evita el bloqueo con cambios de identidad.',
}
inc = [i for i in inc_ini]
for x in m:
    x['valoracion'] = ''
    if x['codigo'] in AJ:
        est, nota, tipo, _ = AJ[x['codigo']]
        x['estado'], x['notas'] = est, nota
        inc = [i for i in inc if i['fuente'] != x['codigo']] + [dict(fuente=x['codigo'], url=x['url_original'], tipo=tipo, causa=nota)]
    if x['estado'] == 'capturada':
        x['valoracion'] = VAL.get(x['codigo'], 'Contenido propio probable (supuesto: pendiente de revisión humana).')
    if x['codigo'] == 'F018':
        x['notas'] = (x['notas'] + ' · ' + VAL['F018']).strip(' ·')

def csv_(nombre, filas, cols):
    with open(os.path.join(L, nombre), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(filas)
COLS = ['codigo', 'fuente', 'url_original', 'url_final', 'http', 'content_type', 'bytes', 'sha256', 'fecha_hora_utc', 'estado', 'valoracion', 'texto_caracteres', 'titulo', 'archivo_original', 'archivo_texto', 'notas']
csv_('manifiesto.csv', m, COLS)
csv_('incidencias.csv', inc, ['fuente', 'url', 'tipo', 'causa'])
json.dump(m, open(os.path.join(h, 'manifiesto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
cob = []
for x in m:
    pe = [p for p in pend if p['fuente'] == x['codigo']]
    cob.append(dict(codigo=x['codigo'], fuente=x['fuente'], urls_registradas=1, capturas_utiles=int(x['estado'] == 'capturada'), bloqueos_o_errores=int(x['estado'] in ('bloqueada', 'error', 'no_permitida')),
        contenido_insuficiente=int(x['estado'] == 'contenido_insuficiente'), candidatas_pendientes=len(pe), pdf_pendientes=sum(p['tipo'] == 'pdf' for p in pe), formatos='HTML' if x['archivo_original'] else ''))
csv_('cobertura_fuentes.csv', cob, ['codigo', 'fuente', 'urls_registradas', 'capturas_utiles', 'bloqueos_o_errores', 'contenido_insuficiente', 'candidatas_pendientes', 'pdf_pendientes', 'formatos'])
n = lambda e: sum(x['estado'] == e for x in m)
fecha = m[0]['fecha_hora_utc']
r = [f'# Informe de cobertura — {os.path.basename(L)}', '', f'Captura: {fecha} (UTC) · Cliente: PMVerticalesInvestigacion/1.0 · Espera entre peticiones: 2,5 s · Respeta robots.txt · No se saltan bloqueos ni captchas', '',
     'Una captura solo cuenta como útil si el contenido real supera 1.500 caracteres de texto visible y no es una página de verificación. El código HTTP 200 por sí solo no demuestra éxito.', '',
     '## Resumen', f'- URL registradas con web: **{len(m)}** (la F027 es interna y no tiene URL).', f'- Capturas con contenido útil: **{n("capturada")}**',
     f'- Contenido insuficiente (JavaScript, YouTube, página muy corta): **{n("contenido_insuficiente")}**', f'- Bloqueadas por verificación anti-bot: **{n("bloqueada")}**',
     f'- No solicitadas porque robots.txt no lo permite: **{n("no_permitida")}**', f'- Error de red: **{n("error")}**', f'- Enlaces candidatos sin visitar: **{len(pend)}** (PDF: {sum(p["tipo"] == "pdf" for p in pend)})', f'- Incidencias: **{len(inc)}**', '',
     '## Por fuente', '', '| Fuente | Estado | HTTP | Texto (car.) | Candidatas | Valoración / notas |', '|---|---|---|---|---|---|']
for x in m:
    k = sum(1 for p in pend if p['fuente'] == x['codigo'])
    r.append(f"| {x['codigo']} {x['fuente']} | {x['estado']} | {x['http']} | {x['texto_caracteres']} | {k} | {(x['valoracion'] + ' ' + x['notas']).strip().replace('|', '/')} |")
r += ['', '## Límites', '- Solo se solicitó la URL registrada de cada fuente; los enlaces candidatos NO se han visitado.',
      '- El texto extraído incluye menús y navegación de la web; es texto bruto, no un resumen ni un análisis. El original HTML se conserva inalterado (huella SHA-256 en `manifiesto.csv`).',
      '- La columna «valoración» es un supuesto mío (longitud de prosa y palabras clave), no una revisión humana.',
      '- No se ha extraído ningún dato gastronómico (ingredientes, recetas, técnicas): es la fase siguiente.',
      '- Derechos de uso de cada fuente: pendientes de revisar; uso interno de investigación, sin republicar.',
      '- Este lote es independiente: no está consolidado con los ZIP V1, V2 ni con el archivo maestro anteriores (pendiente de recibir esos archivos).',
      '- `historial/manifiesto_inicial.json` conserva la clasificación automática anterior a la revisión.']
open(os.path.join(L, 'informe_cobertura.md'), 'w', encoding='utf-8').write('\n'.join(r) + '\n')
print({e: n(e) for e in sorted({x['estado'] for x in m})}, '| incidencias', len(inc))
