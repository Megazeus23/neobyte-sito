"""Rifà con il logo scelto le icone dello studio e le anteprime per i social.

Uso (dalla cartella del progetto):
  python strumenti/icone.py
      scrive in sito/assets/img: favicon.svg, icona-180.png, icona-512.png,
      condivisione-it.jpg, condivisione-en.jpg e condivisione.jpg (uguale a quella italiana)
  python strumenti/icone.py gioco SLUG ["Titolo|su due righe"]
      scrive sito/assets/img/giochi/SLUG/condivisione.jpg (1200x630) con copertina, icona,
      personaggio e nome presi da dati/giochi.json. Il titolo tra virgolette è facoltativo:
      serve per decidere dove va a capo (con la barra |).
  Esempio: python strumenti/icone.py gioco sigilli-dell-eclisse "Sigilli|dell’Eclisse"

Il logo usato è quello scritto in strumenti/_comune.py (LOGO), preso dalla cartella logo/.
Le pagine fotografate sono in strumenti/modelli/. Dopo, lanciare «node costruisci.mjs».
Serve Python con Pillow e Chrome installato (già presenti sul PC). Non installa niente.
"""
import sys, re, io, json, shutil, tempfile, os
from urllib.parse import urlencode
from PIL import Image
from _comune import LOGO, RADICE, scatta

IMG = RADICE / 'sito' / 'assets' / 'img'


def foto(modello, larga, alta, parametri):
    """Fotografa un modello e restituisce l'immagine (RGB)."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as t:
        scatta(modello, os.path.join(t, 'foto.png'), larga, alta, '?' + urlencode(parametri))
        return Image.open(os.path.join(t, 'foto.png')).convert('RGB')


def studio():
    # favicon: il simbolo, un po' ingrandito, su un quadrato scuro con gli angoli tondi
    svg = (RADICE / 'logo' / (LOGO + '-simbolo.svg')).read_text(encoding='utf-8')
    dentro = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1).strip()
    dentro = re.sub(r'\bnb\d+s', 'f', dentro)   # nomi corti per le sfumature
    io.open(IMG / 'favicon.svg', 'w', encoding='utf-8', newline='\n').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#03040b"/>'
        '<g transform="translate(32 32) scale(1.22) translate(-32 -32)">' + dentro.replace('\n', '') + '</g></svg>\n')
    print('favicon.svg')
    grande = foto('icona.html', 1024, 1024, {'logo': LOGO})   # Chrome non fa finestre piccole: si fotografa grande e si riduce
    for lato in (180, 512):
        grande.resize((lato, lato), Image.LANCZOS).save(IMG / f'icona-{lato}.png', optimize=True)
        print(f'icona-{lato}.png')
    for lingua in ('it', 'en'):
        foto('condivisione.html', 1200, 630, {'l': lingua, 'logo': LOGO}).save(
            IMG / f'condivisione-{lingua}.jpg', quality=88, optimize=True, progressive=True)
        print(f'condivisione-{lingua}.jpg')
    shutil.copyfile(IMG / 'condivisione-it.jpg', IMG / 'condivisione.jpg')
    print('condivisione.jpg')


def gioco(slug, titolo=None):
    giochi = json.loads((RADICE / 'dati' / 'giochi.json').read_text(encoding='utf-8'))
    g = next((x for x in giochi if x['slug'] == slug), None)
    if not g:
        raise SystemExit(f'In dati/giochi.json non c\'è un gioco con slug "{slug}".')
    im = g['immagini']
    file = lambda v: (v or {}).get('file', '') if isinstance(v, dict) or v is None else v
    p = {'slug': slug, 'titolo': titolo or g['nome'], 'copertina': file(im.get('copertina')),
         'icona': file(im.get('icona')), 'personaggio': file(im.get('personaggio')),
         'cinzel': '1' if (g.get('tema') or {}).get('fontTitolo') == 'cinzel' else '', 'logo': LOGO}
    uscita = IMG / 'giochi' / slug / 'condivisione.jpg'
    foto('condivisione-gioco.html', 1200, 630, p).save(uscita, quality=88, optimize=True, progressive=True)
    print(uscita.relative_to(RADICE).as_posix())
    if im.get('condivisione') != 'condivisione.jpg':
        print('Ricorda: in dati/giochi.json metti "condivisione": "condivisione.jpg" dentro "immagini".')


if len(sys.argv) > 1 and sys.argv[1] == 'gioco':
    if len(sys.argv) < 3:
        raise SystemExit('Uso: python strumenti/icone.py gioco SLUG ["Titolo|su due righe"]')
    gioco(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
elif len(sys.argv) > 1:
    raise SystemExit(__doc__)
else:
    studio()
