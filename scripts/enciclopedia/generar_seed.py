"""Genera la migración de carga (áreas, campos y fuentes) a partir del framework maestro."""
import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MD = os.path.join(RAIZ, 'docs', 'burger-intelligence', 'Burger_Intelligence_Framework_Maestro_2026-11-23.md')
SALIDA = os.path.join(RAIZ, 'supabase', 'migrations', '20261124131000_15_enciclopedia_areas_y_fuentes.sql')

txt = open(MD, encoding='utf-8').read().replace('\r\n', '\n')
sec5 = txt[txt.index('## 5. LAS 13 ÁREAS'):txt.index('## 6. MODELO DE DATOS')]
sec8 = txt[txt.index('## 8. REGISTRO DE FUENTES'):txt.index('## 9. ESTADO REAL')]

def q(s):
    """Literal SQL con dollar-quoting."""
    if s is None:
        return 'null'
    assert '$q$' not in s
    return '$q$' + s + '$q$'

# ───────────── Áreas ─────────────
bloques_areas = re.split(r'\n### ÁREA ', '\n' + sec5)[1:]
areas = []
for b in bloques_areas:
    cab, resto = b.split('\n', 1)
    m = re.match(r'(\d\d) — (.+)', cab)
    codigo, nombre = m.group(1), m.group(2).strip()
    mc = re.search(r'\*\*(\d+) campos específicos:\*\* (.+)', resto)
    declarados = int(mc.group(1))
    lista = mc.group(2)
    # separar por "N) " en secuencia 1..n
    campos = []
    pos = 0
    for n in range(1, declarados + 1):
        ini = lista.index(f'{n}) ', pos)
        fin = lista.index(f'; {n + 1}) ', ini) if n < declarados else len(lista)
        campos.append(lista[ini + len(f'{n}) '):fin].strip())
        pos = fin
    # último campo: separar frase final que no es campo
    ultimo = campos[-1]
    extra_linea = ''
    mm = re.match(r'(.+?)\.(?:\s+(.*))?$', ultimo)
    if mm:
        campos[-1] = mm.group(1).strip()
        extra_linea = (mm.group(2) or '').strip()
    assert len(campos) == declarados, (codigo, len(campos), declarados)
    despues = resto[mc.end():].strip()
    notas = '\n'.join(x for x in [extra_linea, despues] if x).replace('**', '').strip()
    areas.append(dict(codigo=codigo, nombre=nombre, campos=campos, notas=notas or None))

assert [a['codigo'] for a in areas] == [f'{i:02d}' for i in range(1, 14)]
esperados = [12, 13, 16, 18, 20, 21, 26, 24, 24, 26, 28, 26, 18]
assert [len(a['campos']) for a in areas] == esperados, [len(a['campos']) for a in areas]

TIPOS = {
    '01': ['ingrediente'], '02': ['ingrediente'], '03': ['ingrediente'], '04': ['ingrediente'], '05': ['ingrediente'], '06': ['ingrediente'],
    '07': ['estilo', 'receta', 'combinacion'], '08': ['tecnica'], '09': ['combinacion', 'ingrediente'],
    '10': ['normativa', 'tecnica'], '11': ['tendencia', 'creador'], '12': [], '13': [],
}
BLOQUES_11 = '[{"codigo":"11A","nombre":"Influencers y creadores España","mercado":"espana"},{"codigo":"11B","nombre":"Tendencias España","mercado":"espana"},{"codigo":"11C","nombre":"Influencers y creadores EEUU y mundo","mercado":"eeuu_mundo"},{"codigo":"11D","nombre":"Tendencias EEUU y mundo","mercado":"eeuu_mundo"}]'

sql = []
sql.append('-- Enciclopedia Burger Intelligence · Fase 1: carga de las 13 áreas, sus campos específicos y las fuentes.')
sql.append('-- Generado a partir de docs/burger-intelligence/Burger_Intelligence_Framework_Maestro_2026-11-23.md (secciones 5 y 8).')
sql.append("-- Solo configuración y registro de fuentes: no contiene contenido capturado ni redactado.\n")
sql.append("do $$ declare v uuid := (select id from public.verticales where slug = 'hamburgueseria'); a uuid; begin")
sql.append("  if v is null then raise exception 'No existe el vertical hamburgueseria'; end if;")
for i, a in enumerate(areas, 1):
    modo = 'fuentes' if a['codigo'] == '12' else 'catalogo_pm' if a['codigo'] == '13' else 'fichas'
    privada = 'true' if a['codigo'] == '13' else 'false'
    bl = f"'{BLOQUES_11}'::jsonb" if a['codigo'] == '11' else 'null'
    tipos = "'{" + ','.join(TIPOS[a['codigo']]) + "}'"
    sql.append(f"  insert into public.enc_areas (vertical_id, codigo, nombre, notas, modo, tipos_ficha, bloques, privada, orden) values (v, '{a['codigo']}', {q(a['nombre'])}, {q(a['notas'])}, '{modo}', {tipos}, {bl}, {privada}, {i}) returning id into a;")
    filas = ',\n    '.join(f"(a, {n}, 'c{n:02d}', {q(c)})" for n, c in enumerate(a['campos'], 1))
    sql.append(f"  insert into public.enc_area_campos (area_id, orden, clave, etiqueta) values\n    {filas};")
sql.append('end $$;\n')

# ───────────── Fuentes ─────────────
filas_f = []
for linea in sec8.split('\n'):
    if not re.match(r'\| F\d{3} \|', linea):
        continue
    c = [x.strip() for x in linea.strip().strip('|').split('|')]
    fid, nombre, mercado, tipo, areas_txt, enlace = c
    mu = re.search(r'\((https?://[^)]+)\)', enlace)
    url = mu.group(1) if mu else None
    notas = enlace if not url else None
    editor = nombre.split(' — ')[0].strip()
    ars = []
    for x in [y.strip() for y in areas_txt.split(',')]:
        ars.append(x if not x.isdigit() else f'{int(x):02d}')
    oficial = fid in ('F022', 'F023', 'F024', 'F025')
    privada = fid == 'F027'
    filas_f.append(dict(codigo=fid, nombre=nombre, editor=editor, mercado=mercado, tipo=tipo, areas=ars, url=url,
                        acceso='privado' if privada else 'publico', prioridad='alta' if oficial else None, privada=privada, notas=notas))
assert len(filas_f) == 27, len(filas_f)
assert [f['codigo'] for f in filas_f] == [f'F{i:03d}' for i in range(1, 28)]

# Ampliación pedida por el usuario (no figuran en la sección 8 del framework)
NUEVAS = [
    dict(codigo='F028', nombre='Reglamento (UE) 1169/2011 — Información alimentaria facilitada al consumidor', editor='EUR-Lex', mercado='Unión Europea', tipo='Normativa oficial', areas=['10', '13'],
         url='https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32011R1169', acceso='publico', prioridad='alta', privada=False,
         notas='Añadida a petición del usuario (no figura en el framework v1.0). Áreas asignadas provisionalmente: 10 (alérgenos) y 13 (etiquetado).'),
    dict(codigo='F029', nombre='Real Decreto 126/2015 — Información alimentaria de alimentos sin envasar', editor='BOE', mercado='España', tipo='Normativa oficial', areas=['10'],
         url='https://www.boe.es/eli/es/rd/2015/02/27/126/con', acceso='publico', prioridad='alta', privada=False,
         notas='Añadida a petición del usuario (no figura en el framework v1.0). Área asignada provisionalmente: 10.'),
    dict(codigo='F030', nombre='Reglamento (CE) 2073/2005 — Criterios microbiológicos aplicables a los productos alimenticios', editor='EUR-Lex', mercado='Unión Europea', tipo='Normativa oficial', areas=['01', '10'],
         url='https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32005R2073', acceso='publico', prioridad='alta', privada=False,
         notas='Añadida a petición del usuario (no figura en el framework v1.0). Áreas asignadas provisionalmente: 01 y 10.'),
]
filas_f += NUEVAS

sql.append("insert into public.enc_fuentes (codigo, vertical_id, nombre, editor_autor, mercado, tipo, areas, url, acceso, prioridad, estado, privada, notas)")
sql.append("select x.codigo, v.id, x.nombre, x.editor, x.mercado, x.tipo, x.areas, x.url, x.acceso, x.prioridad, 'registrada', x.privada, x.notas")
sql.append("from public.verticales v, (values")
vals = []
for f in filas_f:
    ars = "'{" + ','.join(f['areas']) + "}'::text[]"
    vals.append(f"  ({q(f['codigo'])}, {q(f['nombre'])}, {q(f['editor'])}, {q(f['mercado'])}, {q(f['tipo'])}, {ars}, {q(f['url'])}, {q(f['acceso'])}, {q(f['prioridad'])}, {'true' if f['privada'] else 'false'}, {q(f['notas'])})")
sql.append(',\n'.join(vals))
sql.append(") as x(codigo, nombre, editor, mercado, tipo, areas, url, acceso, prioridad, privada, notas)")
sql.append("where v.slug = 'hamburgueseria';")

open(SALIDA, 'w', encoding='utf-8', newline='\n').write('\n'.join(sql) + '\n')
print('áreas:', len(areas), '· campos:', sum(len(a['campos']) for a in areas), '· fuentes:', len(filas_f))
for a in areas:
    print(a['codigo'], a['nombre'][:45], len(a['campos']), '| último campo:', a['campos'][-1][:50], '| notas:', (a['notas'] or '')[:40].replace('\n', ' / '))
