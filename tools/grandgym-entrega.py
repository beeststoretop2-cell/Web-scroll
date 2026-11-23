#!/usr/bin/env python3
"""Genera entrega/Grandgym-web-entrega.zip: la carpeta grandgym/ + la guía de instalación en PDF.
Es lo que sube el instalador al hosting (ver entrega/Guia-paso-a-paso-instalador.pdf).

Uso:  python3 tools/grandgym-entrega.py
"""
import os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
entries = []
for d, _, files in os.walk('grandgym'):
    for f in sorted(files):
        if not f.startswith('.'):
            p = os.path.join(d, f)
            entries.append((p, p.replace(os.sep, '/')))
entries.append(('entrega/Guia-instalacion-Grandgym.pdf', 'Guia-instalacion-Grandgym.pdf'))

out = 'entrega/Grandgym-web-entrega.zip'
with zipfile.ZipFile(out + '.tmp', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for src, arc in sorted(entries):
        z.write(src, arc)
os.replace(out + '.tmp', out)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    print(out, len(z.namelist()), 'archivos,', round(os.path.getsize(out) / 1e6, 2), 'MB')
