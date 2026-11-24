"""Captura en bruto por lotes (framework Burger Intelligence, sección 7).
Respeta robots.txt, identifica el cliente, espera entre peticiones y no intenta saltar bloqueos ni captchas.
Guarda: originales/, texto_completo/, manifiesto.csv, cobertura_fuentes.csv, pendientes.csv, incidencias.csv, informe_cobertura.md, historial/.
"""
import csv, hashlib, io, json, os, re, sys, time, gzip, zlib
import urllib.request, urllib.error, urllib.robotparser
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, urldefrag
from datetime import datetime, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

FUENTES_JSON = sys.argv[1]            # [{codigo, nombre, url, areas}]
SALIDA = sys.argv[2]                  # carpeta del lote
UA = 'Mozilla/5.0 (compatible; PMVerticalesInvestigacion/1.0; uso interno de investigacion gastronomica)'
ESPERA = 2.5
MIN_TEXTO = 1500                      # caracteres de texto visible para considerar contenido útil

MARCAS_BLOQUEO = ['captcha', 'cf-challenge', 'just a moment', 'attention required', 'access denied', 'verify you are human',
                  'verifying you are human', 'are you a robot', 'enable javascript and cookies', 'request unsuccessful', 'pardon our interruption']

for d in ['originales', 'texto_completo', 'historial']:
    os.makedirs(os.path.join(SALIDA, d), exist_ok=True)

class Texto(HTMLParser):
    SALTAR = {'script', 'style', 'noscript', 'svg', 'head', 'template'}
    BLOQUE = {'p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'table', 'ul', 'ol', 'header', 'footer', 'blockquote'}
    def __init__(self):
        super().__init__(convert_charrefs=True); self.p = []; self.n = 0; self.links = []; self.titulo = None; self._t = False
    def handle_starttag(self, tag, attrs):
        if tag in self.SALTAR: self.n += 1
        if tag == 'title': self._t = True
        if tag in self.BLOQUE: self.p.append('\n')
        if tag == 'a':
            h = dict(attrs).get('href')
            if h: self.links.append(h)
    def handle_endtag(self, tag):
        if tag in self.SALTAR and self.n: self.n -= 1
        if tag == 'title': self._t = False
        if tag in self.BLOQUE: self.p.append('\n')
    def handle_data(self, d):
        if self._t and self.titulo is None and d.strip(): self.titulo = ' '.join(d.split())
        if not self.n: self.p.append(d)
    def texto(self):
        t = ''.join(self.p)
        t = re.sub(r'[ \t\r\f\v]+', ' ', t)
        t = re.sub(r' ?\n ?', '\n', t)
        return re.sub(r'\n{3,}', '\n\n', t).strip()

def descomprimir(cuerpo, enc):
    if enc == 'gzip': return gzip.decompress(cuerpo)
    if enc == 'deflate':
        try: return zlib.decompress(cuerpo)
        except zlib.error: return zlib.decompress(cuerpo, -zlib.MAX_WBITS)
    return cuerpo

def decodificar(b, ct):
    m = re.search(r'charset=([\w-]+)', ct or '', re.I) or re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', b[:4096], re.I)
    cs = (m.group(1).decode() if isinstance(m.group(1), bytes) else m.group(1)) if m else 'utf-8'
    try: return b.decode(cs, errors='replace')
    except LookupError: return b.decode('utf-8', errors='replace')

robots = {}
def permitido(url):
    o = urlparse(url); base = f'{o.scheme}://{o.netloc}'
    if base not in robots:
        rp = urllib.robotparser.RobotFileParser(); rp.set_url(base + '/robots.txt')
        try:
            req = urllib.request.Request(base + '/robots.txt', headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                rp.parse(r.read().decode('utf-8', errors='replace').splitlines())
            robots[base] = rp
        except urllib.error.HTTPError as e:
            robots[base] = None if e.code in (401, 403) else 'libre'    # 401/403: tratar como no permitido; 404: sin robots
            if e.code in (401, 403): robots[base] = 'cerrado'
        except Exception:
            robots[base] = 'libre'
    rp = robots[base]
    if rp == 'libre': return True, 'sin robots.txt accesible'
    if rp == 'cerrado' or rp is None: return False, 'robots.txt devuelve 401/403'
    return rp.can_fetch(UA, url), 'robots.txt'

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:50]

fuentes = json.load(open(FUENTES_JSON, encoding='utf-8'))
manifiesto, incidencias, pendientes, cobertura = [], [], [], []
ultimo_acceso = {}
ahora = lambda: datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

for f in fuentes:
    cod, url = f['codigo'], f['url']
    dom = urlparse(url).netloc
    fila = dict(codigo=cod, fuente=f['nombre'], url_original=url, url_final='', http='', content_type='', bytes=0, sha256='', fecha_hora_utc='', estado='', texto_caracteres=0, archivo_original='', archivo_texto='', titulo='', notas='')
    ok_robots, why = permitido(url)
    if not ok_robots:
        fila.update(estado='no_permitida', notas=f'No se solicita: {why} no permite el acceso automático a esta URL.')
        incidencias.append(dict(fuente=cod, url=url, causa=fila['notas'], tipo='acceso_no_permitido'))
        manifiesto.append(fila); print(cod, 'NO PERMITIDA', why); continue
    espera = ESPERA - (time.time() - ultimo_acceso.get(dom, 0))
    if espera > 0: time.sleep(espera)
    ultimo_acceso[dom] = time.time()
    fila['fecha_hora_utc'] = ahora()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5', 'Accept-Language': 'es,en;q=0.8', 'Accept-Encoding': 'gzip, deflate'})
        with urllib.request.urlopen(req, timeout=40) as r:
            cuerpo = descomprimir(r.read(), r.headers.get('Content-Encoding'))
            fila.update(http=r.status, url_final=r.geturl(), content_type=r.headers.get('Content-Type', ''))
    except urllib.error.HTTPError as e:
        fila.update(http=e.code, url_final=url, estado='bloqueada' if e.code in (401, 403, 429, 503) else 'error', notas=f'HTTP {e.code} {e.reason}')
        incidencias.append(dict(fuente=cod, url=url, causa=fila['notas'], tipo='http_' + str(e.code))); manifiesto.append(fila); print(cod, fila['estado'], e.code); continue
    except Exception as e:
        fila.update(estado='error', notas=f'{type(e).__name__}: {e}')
        incidencias.append(dict(fuente=cod, url=url, causa=fila['notas'], tipo='red')); manifiesto.append(fila); print(cod, 'ERROR', e); continue

    es_pdf = 'pdf' in fila['content_type'].lower() or cuerpo[:5] == b'%PDF-'
    ext = 'pdf' if es_pdf else 'html'
    nombre = f'{cod}_{slug(f["nombre"])}.{ext}'
    open(os.path.join(SALIDA, 'originales', nombre), 'wb').write(cuerpo)           # original inalterado
    fila.update(bytes=len(cuerpo), sha256=hashlib.sha256(cuerpo).hexdigest(), archivo_original='originales/' + nombre)
    if es_pdf:
        fila.update(estado='capturada_pdf_sin_texto', notas='PDF conservado; extracción de texto pendiente.'); manifiesto.append(fila); print(cod, 'PDF'); continue

    html = decodificar(cuerpo, fila['content_type'])
    p = Texto(); p.feed(html); txt = p.texto()
    fila['titulo'] = p.titulo or ''
    open(os.path.join(SALIDA, 'texto_completo', f'{cod}.txt'), 'w', encoding='utf-8').write(txt)
    fila.update(texto_caracteres=len(txt), archivo_texto=f'texto_completo/{cod}.txt')
    bajo = (html[:20000] + ' ' + (p.titulo or '')).lower()
    marca = next((m for m in MARCAS_BLOQUEO if m in bajo), None)
    if marca and len(txt) < 6000:
        fila.update(estado='bloqueada', notas=f'Página de verificación o bloqueo (marca «{marca}»): no es el contenido.')
        incidencias.append(dict(fuente=cod, url=url, causa=fila['notas'], tipo='verificacion'))
    elif len(txt) < MIN_TEXTO:
        fila.update(estado='contenido_insuficiente', notas=f'Solo {len(txt)} caracteres de texto visible: probable contenido dinámico (JavaScript), muro de acceso o página vacía.')
        incidencias.append(dict(fuente=cod, url=url, causa=fila['notas'], tipo='contenido_insuficiente'))
    else:
        fila['estado'] = 'capturada'
    if urlparse(fila['url_final']).netloc != dom and fila['estado'] == 'capturada':
        fila['notas'] = (fila['notas'] + ' ' if fila['notas'] else '') + f'Redirigida a otro dominio: {fila["url_final"]}'
    # candidatos no visitados (mismo dominio), para no perder oportunidades
    vistos = set()
    for h in p.links:
        u, _ = urldefrag(urljoin(fila['url_final'] or url, h))
        o = urlparse(u)
        if o.scheme not in ('http', 'https') or o.netloc.replace('www.', '') != dom.replace('www.', '') or u in vistos or u.rstrip('/') == url.rstrip('/'): continue
        if re.search(r'(login|signin|signup|cart|checkout|account|privacy|cookie|terms|contact|\.(jpg|jpeg|png|gif|svg|css|js|ico|webp)(\?|$))', u, re.I): continue
        if re.search(r'(burger|hamburg|bun|pan-|panes|recipe|receta|sauce|salsa|chees|queso|beef|carne|patty|smash|pdf|norma|reglament|decreto|higiene|pairing|trend|tendenc|menu|pricing)', u, re.I):
            vistos.add(u); pendientes.append(dict(fuente=cod, url=u, tipo='pdf' if u.lower().split('?')[0].endswith('.pdf') else 'enlace_candidato', motivo='candidato no visitado'))
    manifiesto.append(fila); print(cod, fila['estado'], fila['http'], len(txt), 'car.')

# ───── ficheros del lote ─────
def csv_(nombre, filas, cols):
    with open(os.path.join(SALIDA, nombre), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(filas)

COLS_M = ['codigo', 'fuente', 'url_original', 'url_final', 'http', 'content_type', 'bytes', 'sha256', 'fecha_hora_utc', 'estado', 'texto_caracteres', 'titulo', 'archivo_original', 'archivo_texto', 'notas']
csv_('manifiesto.csv', manifiesto, COLS_M)
csv_('incidencias.csv', incidencias, ['fuente', 'url', 'tipo', 'causa'])
csv_('pendientes.csv', pendientes, ['fuente', 'url', 'tipo', 'motivo'])
for f in fuentes:
    m = [x for x in manifiesto if x['codigo'] == f['codigo']]
    pen = [x for x in pendientes if x['fuente'] == f['codigo']]
    cobertura.append(dict(codigo=f['codigo'], fuente=f['nombre'], urls_registradas=1, capturas_utiles=sum(x['estado'] in ('capturada', 'capturada_pdf_sin_texto') for x in m),
        bloqueos_o_errores=sum(x['estado'] in ('bloqueada', 'error', 'no_permitida') for x in m), contenido_insuficiente=sum(x['estado'] == 'contenido_insuficiente' for x in m),
        candidatas_pendientes=len(pen), pdf_pendientes=sum(x['tipo'] == 'pdf' for x in pen), formatos=','.join(sorted({'PDF' if x['archivo_original'].endswith('.pdf') else 'HTML' for x in m if x['archivo_original']}))))
csv_('cobertura_fuentes.csv', cobertura, ['codigo', 'fuente', 'urls_registradas', 'capturas_utiles', 'bloqueos_o_errores', 'contenido_insuficiente', 'candidatas_pendientes', 'pdf_pendientes', 'formatos'])
json.dump(manifiesto, open(os.path.join(SALIDA, 'historial', 'manifiesto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

n = lambda e: sum(x['estado'] == e for x in manifiesto)
rep = [f'# Informe de cobertura — lote {os.path.basename(SALIDA)}', '', f'Generado: {ahora()} · Cliente: PMVerticalesInvestigacion/1.0 · Espera entre peticiones: {ESPERA}s · Respeta robots.txt',
       '', 'Una captura solo cuenta como útil si el contenido real supera ' + str(MIN_TEXTO) + ' caracteres de texto visible y no es una página de verificación. El código HTTP 200 por sí solo no demuestra éxito.', '',
       '## Resumen', f'- URL solicitadas: **{len(manifiesto)}**', f'- Capturas útiles: **{n("capturada") + n("capturada_pdf_sin_texto")}**',
       f'- Contenido insuficiente (probable JavaScript o muro de acceso): **{n("contenido_insuficiente")}**', f'- Bloqueadas o con error: **{n("bloqueada") + n("error")}**',
       f'- No permitidas por robots.txt (no solicitadas): **{n("no_permitida")}**', f'- Enlaces candidatos sin visitar: **{len(pendientes)}** (de ellos PDF: {sum(x["tipo"] == "pdf" for x in pendientes)})',
       f'- Incidencias: **{len(incidencias)}**', '', '## Por fuente', '', '| Fuente | Estado | HTTP | Texto (car.) | Candidatas pendientes | Notas |', '|---|---|---|---|---|---|']
for x in manifiesto:
    pen = sum(1 for p in pendientes if p['fuente'] == x['codigo'])
    rep.append(f"| {x['codigo']} {x['fuente']} | {x['estado']} | {x['http']} | {x['texto_caracteres']} | {pen} | {x['notas'].replace('|', '/')} |")
rep += ['', '## Límites', '- Solo se solicitó la URL registrada de cada fuente; los enlaces candidatos NO se han visitado.', '- No se ha extraído ningún dato gastronómico (ingredientes, recetas, técnicas): es la fase siguiente.',
        '- Los originales se conservan inalterados (huella SHA-256 en `manifiesto.csv`). Derechos de uso de cada fuente: pendientes de revisar; uso interno de investigación.',
        '- No consolidado con los lotes V1, V2 ni con el archivo maestro anteriores (pendiente de recibir esos ZIP).']
open(os.path.join(SALIDA, 'informe_cobertura.md'), 'w', encoding='utf-8').write('\n'.join(rep) + '\n')
print('\nRESUMEN', {e: n(e) for e in sorted({x['estado'] for x in manifiesto})}, '| candidatas', len(pendientes))
