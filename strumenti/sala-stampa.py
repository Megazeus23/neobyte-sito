"""Prepara i file della sala stampa in sito/assets/stampa.

Uso (dalla cartella del progetto):
  python strumenti/sala-stampa.py
      logo dello studio in sito/assets/stampa/studio: i due SVG (simbolo e logo con la scritta)
      e i due PNG su fondo scuro (simbolo 1024x1024, logo 2000x640)
  python strumenti/sala-stampa.py gioco SLUG PREFISSO [CARTELLA_SCHERMATE]
      immagini di un gioco in sito/assets/stampa/SLUG: icona (PNG), copertina (JPG) e personaggio (PNG)
      presi da sito/assets/img/giochi/SLUG; se c'è CARTELLA_SCHERMATE, anche gli screenshot originali
      (i file .png che iniziano con due cifre, per esempio 01-casa.png) salvati in JPG.
      PREFISSO è l'inizio dei nomi dei file, per esempio «sigilli» -> sigilli-icona.png
  Esempio: python strumenti/sala-stampa.py gioco sigilli-dell-eclisse sigilli C:\\percorso\\degli\\screenshot

Gli originali non vengono toccati. Lo zip «press kit» non lo fa questo script: lo rifà
«node costruisci.mjs» con tutto quello che trova in sito/assets/stampa.
Il logo usato è quello scritto in strumenti/_comune.py (LOGO), preso dalla cartella logo/.
Serve Python con Pillow e, per i PNG del logo, Chrome installato (già presenti sul PC).
"""
import sys, os, json, shutil, tempfile
from PIL import Image
from _comune import LOGO, RADICE, scatta

STAMPA = RADICE / 'sito' / 'assets' / 'stampa'


def elenco(cartella):
    for f in sorted(os.listdir(cartella)):
        print(f'{cartella.name}/{f}  {os.path.getsize(cartella / f) // 1024} KB')


def studio():
    d = STAMPA / 'studio'
    d.mkdir(parents=True, exist_ok=True)
    for parte, nome, larga, alta in (('simbolo', 'neobyte-studios-simbolo', 1024, 1024), ('completo', 'neobyte-studios-logo', 2000, 640)):
        shutil.copyfile(RADICE / 'logo' / f'{LOGO}-{parte}.svg', d / f'{nome}.svg')
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as t:
            scatta('logo-su-scuro.html', os.path.join(t, 'foto.png'), larga, alta, f'?f={LOGO}-{parte}.svg')
            Image.open(os.path.join(t, 'foto.png')).convert('RGB').save(d / f'{nome}-fondo-scuro.png', optimize=True)
    elenco(d)


def gioco(slug, prefisso, schermate=None):
    giochi = json.loads((RADICE / 'dati' / 'giochi.json').read_text(encoding='utf-8'))
    g = next((x for x in giochi if x['slug'] == slug), None)
    if not g:
        raise SystemExit(f'In dati/giochi.json non c\'è un gioco con slug "{slug}".')
    im = g['immagini']
    file = lambda v: v.get('file') if isinstance(v, dict) else v
    origine = RADICE / 'sito' / 'assets' / 'img' / 'giochi' / slug
    d = STAMPA / slug
    d.mkdir(parents=True, exist_ok=True)
    if im.get('icona'):
        Image.open(origine / file(im['icona'])).convert('RGB').save(d / f'{prefisso}-icona.png', optimize=True)
    Image.open(origine / file(im['copertina'])).convert('RGB').save(d / f'{prefisso}-copertina.jpg', quality=90, optimize=True, progressive=True)
    if im.get('personaggio'):
        nome = os.path.splitext(os.path.basename(file(im['personaggio'])))[0]
        Image.open(origine / file(im['personaggio'])).save(d / f'{prefisso}-{nome}.png', optimize=True)
    if schermate:
        for f in sorted(os.listdir(schermate)):
            if f[:2].isdigit() and f.lower().endswith('.png'):
                Image.open(os.path.join(schermate, f)).convert('RGB').save(
                    d / f'{prefisso}-schermata-{f[:-4]}.jpg', quality=88, optimize=True, progressive=True)
    elenco(d)


if len(sys.argv) > 1 and sys.argv[1] == 'gioco':
    if len(sys.argv) < 4:
        raise SystemExit('Uso: python strumenti/sala-stampa.py gioco SLUG PREFISSO [CARTELLA_SCHERMATE]')
    gioco(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
elif len(sys.argv) > 1:
    raise SystemExit(__doc__)
else:
    studio()
