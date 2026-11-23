#!/usr/bin/env python3
"""Genera la demo de Grandgym en un solo archivo HTML que funciona con doble clic (file://).

Chrome no deja que una página abierta desde disco cargue módulos JS sueltos ni use imágenes
locales como texturas WebGL. Por eso todo va dentro del HTML:
  - Three.js y sus addons → import map con URLs data: (módulos ES en base64)
  - main.js → <script type="module"> en línea, con las fotos de fondo como data:
  - styles.css, ui.js, horario.js → en línea; fuentes e imágenes → data:

Uso:  python3 tools/grandgym-demo.py  [carpeta_salida]   (por defecto entrega/_demo)
"""
import base64, json, mimetypes, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'grandgym')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'entrega', '_demo')
os.makedirs(OUT, exist_ok=True)

def read(p, mode='r'):
    with open(os.path.join(SRC, p), mode) as f:
        return f.read()

_cache = {}
def data_uri(rel):
    rel = rel.split('?')[0].split('#')[0]
    if rel not in _cache:
        mime = mimetypes.guess_type(rel)[0] or ('font/woff2' if rel.endswith('.woff2') else 'application/octet-stream')
        _cache[rel] = f'data:{mime};base64,' + base64.b64encode(read(rel, 'rb')).decode()
    return _cache[rel]

def js_uri(code):
    return 'data:text/javascript;base64,' + base64.b64encode(code.encode()).decode()

# ── módulos de Three.js: las importaciones relativas pasan a especificadores del import map ──
V = 'vendor/three/'
modules = {}
for dirpath, _, files in os.walk(os.path.join(SRC, V)):
    for f in files:
        if f.endswith('.js'):
            rel = os.path.relpath(os.path.join(dirpath, f), os.path.join(SRC, V)).replace(os.sep, '/')
            modules[rel] = read(V + rel)

def spec(rel):  # nombre con el que se importa cada archivo
    if rel == 'three.module.js': return 'three'
    if rel == 'three.core.js': return 'three/core'
    return 'three/' + rel  # p. ej. three/addons/postprocessing/Pass.js

def rewrite(rel, code):
    base = os.path.dirname(rel)
    def fix(m):
        q, target = m.group(1), m.group(2)
        if target.startswith('.'):
            target = os.path.normpath(os.path.join(base, target)).replace(os.sep, '/')
            return f'from{q}{spec(target)}{q}' if m.group(0).startswith('from') else f'import{q}{spec(target)}{q}'
        return m.group(0)
    code = re.sub(r'from\s*(["\'])(\.[^"\']+)\1', fix, code)
    code = re.sub(r'import\s*(["\'])(\.[^"\']+)\1', fix, code)
    return code

imports = {spec(rel): js_uri(rewrite(rel, code)) for rel, code in modules.items()}
importmap = '<script type="importmap">' + json.dumps({'imports': imports}) + '</script>'

# ── main.js: las fotos de fondo (TextureLoader) van como data: para poder usarlas en WebGL ──
main = read('main.js')
main = re.sub(r"'(img/[^']+\.(?:jpg|jpeg|png|webp))'", lambda m: "'" + data_uri(m.group(1)) + "'", main)
main = main.replace("from 'three/addons/", "from 'three/addons/")  # ya coincide con el import map

# ── CSS con fuentes e imágenes en línea ──
css = read('styles.css')
css = re.sub(r'url\((["\']?)((?:fonts|img)/[^)"\']+)\1\)', lambda m: f'url({data_uri(m.group(2))})', css)

# ── HTML ──
html = read('index.html')
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
html = re.sub(r'<script type="importmap">.*?</script>', lambda m: importmap, html, flags=re.S)
html = html.replace('<script src="horario.js"></script>', '<script>' + read('horario.js') + '</script>')
html = html.replace('<script src="ui.js"></script>', '<script>' + read('ui.js') + '</script>')
html = html.replace('<script type="module" src="main.js"></script>', '<script type="module">' + main + '</script>')
html = re.sub(r'((?:src|href)=")((?:img|fonts)/[^"]+)"', lambda m: m.group(1) + data_uri(m.group(2)) + '"', html)
html = re.sub(r"url\('?((?:img|fonts)/[^)'\"]+)'?\)", lambda m: f'url({data_uri(m.group(1))})', html)
# dentro del marco del móvil, sin barras de scroll
html = html.replace('<head>', '<head>\n<script>if(window.self!==window.top){document.documentElement.classList.add("in-frame")}</script>\n'
                    '<style>.in-frame,.in-frame body{scrollbar-width:none}.in-frame::-webkit-scrollbar,.in-frame body::-webkit-scrollbar{display:none}</style>', 1)
html = re.sub(r'<title>(.*?)</title>', lambda m: f'<title>{m.group(1)} (demo)</title>', html, count=1)

left = re.findall(r'(?:src|href)="(?!data:|https?:|mailto:|tel:|#|javascript:)([^"]+\.(?:js|css|jpg|png|woff2))"', html)
assert not left, f'quedan referencias locales: {left[:5]}'
assert 'vendor/three' not in html.replace('three/addons', ''), 'queda una ruta a vendor/three'

with open(os.path.join(OUT, 'Grandgym-ORDENADOR.html'), 'w') as f:
    f.write(html)
print('Grandgym-ORDENADOR.html', round(len(html) / 1e6, 2), 'MB')
