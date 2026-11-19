"""Riduce un'immagine per il sito: crea la versione grande e quella piccola in WebP.

Uso:
  python strumenti/immagini.py ORIGINE DESTINAZIONE.webp [--larga 1600] [--piccola 800] [--qualita 80]

Esempio (screenshot di un gioco):
  python strumenti/immagini.py C:\\percorso\\01-casa.png sito/assets/img/giochi/mio-gioco/schermate/01-casa.webp

Scrive DESTINAZIONE.webp (lato lungo massimo --larga) e DESTINAZIONE.s.webp (--piccola).
L'originale non viene toccato. Lo script di costruzione trova da solo la versione ".s.webp"
e la usa sugli schermi piccoli. Serve Python con Pillow (già presente sul PC).
"""
import argparse
import os
from PIL import Image


def riduci(origine, destinazione, larga, piccola, qualita):
    im = Image.open(origine)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    os.makedirs(os.path.dirname(os.path.abspath(destinazione)), exist_ok=True)
    base = destinazione[:-5] if destinazione.lower().endswith('.webp') else destinazione
    for lato, nome in ((larga, base + '.webp'), (piccola, base + '.s.webp')):
        copia = im.copy()
        copia.thumbnail((lato, lato), Image.LANCZOS)
        copia.save(nome, 'WEBP', quality=qualita, method=6)
        print(f'{nome}  {copia.size[0]}x{copia.size[1]}  {os.path.getsize(nome) // 1024} KB')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Riduce un\'immagine in WebP (grande + piccola).')
    p.add_argument('origine')
    p.add_argument('destinazione')
    p.add_argument('--larga', type=int, default=1600)
    p.add_argument('--piccola', type=int, default=800)
    p.add_argument('--qualita', type=int, default=80)
    a = p.parse_args()
    riduci(a.origine, a.destinazione, a.larga, a.piccola, a.qualita)
