"""Rigenera gli SVG del logo di NeoByte Studios nella cartella logo/.

Uso (dalla cartella del progetto):
  python strumenti/loghi.py [CARTELLA_FONT] [CARTELLA_USCITA]

Senza argomenti legge i font da sito/assets/font e scrive in logo/.
Per ogni proposta scrive due file: "-simbolo.svg" (solo il simbolo) e "-completo.svg" (simbolo e scritta).
La scritta è trasformata in tracciati, quindi gli SVG non hanno bisogno del font. Sono fatti per fondi scuri.
Il logo scelto dal titolare è il numero 3, "Rotta N": è quello usato nel sito (il nome è in strumenti/_comune.py).
Serve Python con fontTools e brotli (già presenti sul PC).
"""
import sys, math, io, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = sys.argv[1] if len(sys.argv) > 1 else 'sito/assets/font'
USCITA = sys.argv[2] if len(sys.argv) > 2 else 'logo'
os.makedirs(USCITA, exist_ok=True)
n = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')

def scritta(file, testo, x, base, alt_maiuscola, spazio=0.0, larghezza=None):
    """Tracciato della scritta: alta «alt_maiuscola», appoggiata su «base», da «x». Se c'è «larghezza» la spaziatura si adatta."""
    f = TTFont(file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or f['head'].unitsPerEm * 0.7
    k = alt_maiuscola / cap
    nomi = [cmap[ord(c)] for c in testo]
    avanzi = [hmtx[g][0] * k for g in nomi]
    # il primo e l'ultimo segno si allineano al bordo del disegno, non alla casella
    def estremi(g):
        from fontTools.pens.boundsPen import BoundsPen
        b = BoundsPen(gs); gs[g].draw(b); return b.bounds
    sin = estremi(nomi[0])[0] * k
    des = (hmtx[nomi[-1]][0] - estremi(nomi[-1])[2]) * k
    if larghezza is not None:
        spazio = (larghezza - (sum(avanzi) - sin - des)) / (len(nomi) - 1)
    pezzi = []; cx = x - sin
    for g, a in zip(nomi, avanzi):
        pen = SVGPathPen(gs, ntos=lambda v: n(v))
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, cx, base)))
        pezzi.append(pen.getCommands()); cx += a + spazio
    return ''.join(pezzi), (cx - spazio - des) - x

def arco(cx, cy, rx, ry, a0, a1):
    p = lambda a: (cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)))
    (x0, y0), (x1, y1) = p(a0), p(a1)
    return f'M{n(x0)} {n(y0)}A{n(rx)} {n(ry)} 0 0 1 {n(x1)} {n(y1)}'

BYTE_N = '01001110'  # la lettera N in ASCII

def simbolo_otto(p):  # Orbita a otto bit
    cx = cy = 32; rx, ry, vuoto = 29.5, 10.6, 5.4
    celle = [(i, arco(cx, cy, rx, ry, i * 45 + vuoto, (i + 1) * 45 - vuoto)) for i in range(8)]
    def disegna(gruppo):
        out = ''
        for i, d in gruppo:
            if BYTE_N[i] == '1': out += f'<path d="{d}" stroke="#f2fcff" stroke-width="3.8"/>'
            else: out += f'<path d="{d}" stroke="#4f9fe6" stroke-width="2.2"/>'
        return out
    return f'''<defs><radialGradient id="{p}a" cx="34%" cy="28%" r="82%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#7fe0ff"/><stop offset="1" stop-color="#2440c8"/></radialGradient></defs>
<g fill="none" stroke-linecap="round" transform="rotate(-22 32 32)">{disegna(celle[4:])}</g>
<circle cx="32" cy="32" r="13.2" fill="url(#{p}a)"/>
<g fill="none" stroke-linecap="round" transform="rotate(-22 32 32)">{disegna(celle[:4])}</g>'''

def simbolo_cubo(p):  # Mondo costruito (cubo con orbita)
    T, UR, LR, B, LL, UL, C = (32, 9.5), (50.5, 20.2), (50.5, 41.6), (32, 52.3), (13.5, 41.6), (13.5, 20.2), (32, 30.9)
    pt = lambda *ps: ' '.join(f'{n(x)},{n(y)}' for x, y in ps)
    oc, orx, ory, rot = (32, 34.5), 31, 9.4, -17
    return f'''<defs>
<linearGradient id="{p}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#a6ecff"/></linearGradient>
<linearGradient id="{p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63c4ff"/><stop offset="1" stop-color="#2f66e0"/></linearGradient>
<linearGradient id="{p}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c4fd2"/><stop offset="1" stop-color="#111b66"/></linearGradient></defs>
<g fill="none" stroke-linecap="round" transform="rotate({rot} {oc[0]} {oc[1]})"><path d="{arco(oc[0], oc[1], orx, ory, 180, 360)}" stroke="#4f9fe6" stroke-width="2.2"/></g>
<polygon points="{pt(T, UR, C, UL)}" fill="url(#{p}a)"/><polygon points="{pt(UL, C, B, LL)}" fill="url(#{p}b)"/><polygon points="{pt(C, UR, LR, B)}" fill="url(#{p}c)"/>
<g fill="none" stroke-linecap="round" transform="rotate({rot} {oc[0]} {oc[1]})"><path d="{arco(oc[0], oc[1], orx, ory, 0, 180)}" stroke="#f2fcff" stroke-width="3"/><circle cx="{n(oc[0] + orx * math.cos(math.radians(-36)))}" cy="{n(oc[1] + ory * math.sin(math.radians(-36)))}" r="3.6" fill="#fff"/></g>'''

def simbolo_n(p):  # Rotta N
    return f'''<defs><linearGradient id="{p}a" gradientUnits="userSpaceOnUse" x1="10" y1="54" x2="54" y2="10"><stop offset="0" stop-color="#2a4bd6"/><stop offset=".55" stop-color="#7fe0ff"/><stop offset="1" stop-color="#fff"/></linearGradient>
<radialGradient id="{p}b" cx="34%" cy="28%" r="82%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d6f6ff"/><stop offset="1" stop-color="#7fc4ff"/></radialGradient></defs>
<polygon points="10.5,53 10.5,11 22,11 43.5,38.3 43.5,11 53.5,11 53.5,53 42,53 20.5,25.7 20.5,53" fill="url(#{p}a)"/>
<circle cx="35.4" cy="17.4" r="5.4" fill="url(#{p}b)"/>'''

def simbolo_alba(p):  # Alba
    return f'''<defs>
<linearGradient id="{p}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040b"/><stop offset=".62" stop-color="#0b1648"/><stop offset="1" stop-color="#16308f"/></linearGradient>
<radialGradient id="{p}b" gradientUnits="userSpaceOnUse" cx="32" cy="43" r="21"><stop offset="0" stop-color="#bfeeff" stop-opacity=".95"/><stop offset=".45" stop-color="#5aa8ff" stop-opacity=".45"/><stop offset="1" stop-color="#5aa8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="{p}c" gradientUnits="userSpaceOnUse" cx="32" cy="100" r="58"><stop offset=".8" stop-color="#050a26"/><stop offset="1" stop-color="#17309a"/></radialGradient>
<linearGradient id="{p}d" gradientUnits="userSpaceOnUse" x1="6" y1="0" x2="58" y2="0"><stop offset="0" stop-color="#7fe0ff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></linearGradient>
<clipPath id="{p}e"><rect x="6" y="6" width="52" height="52" rx="13"/></clipPath></defs>
<rect x="6" y="6" width="52" height="52" rx="13" fill="url(#{p}a)"/>
<g clip-path="url(#{p}e)">
<circle cx="18" cy="17" r="1.1" fill="#dff6ff"/><circle cx="44" cy="14" r=".9" fill="#dff6ff"/><circle cx="50" cy="26" r="1.2" fill="#dff6ff"/><circle cx="27" cy="25" r=".8" fill="#dff6ff"/><circle cx="13" cy="30" r=".8" fill="#dff6ff"/>
<circle cx="32" cy="43" r="21" fill="url(#{p}b)"/>
<circle cx="32" cy="43" r="8.2" fill="#fff"/>
<circle cx="32" cy="100" r="58" fill="url(#{p}c)"/>
<path d="{arco(32, 100, 58, 58, 242, 298)}" fill="none" stroke="#bfeeff" stroke-width="1.8"/>
<rect x="6" y="41.2" width="52" height="1.4" fill="url(#{p}d)"/>
</g>
<rect x="6" y="6" width="52" height="52" rx="13" fill="none" stroke="#7fe0ff" stroke-width="1.8"/>'''

PROPOSTE = [
    ('1', 'mondo-costruito', simbolo_cubo),
    ('2', 'orbita-a-otto-bit', simbolo_otto),
    ('3', 'rotta-n', simbolo_n),
    ('4', 'alba', simbolo_alba),
]
GRASSO, CHIARO = FONT + '/Syncopate-Bold.woff2', FONT + '/Syncopate-Regular.woff2'
for num, nome, fn in PROPOSTE:
    p = f'nb{num}s'
    solo = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="NeoByte Studios">\n{fn(p)}\n</svg>\n'
    io.open(f'{USCITA}/logo-{num}-{nome}-simbolo.svg', 'w', encoding='utf-8', newline='\n').write(solo)
    p = f'nb{num}c'
    x0 = 80
    d1, larga = scritta(GRASSO, 'NEOBYTE', x0, 35.5, 19.5, spazio=2.2)
    d2, _ = scritta(CHIARO, 'STUDIOS', x0 + 0.6, 51.5, 7.6, larghezza=larga - 1.2)
    W = math.ceil(x0 + larga + 2)
    intero = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 64" role="img" aria-label="NeoByte Studios">\n{fn(p)}\n<path d="{d1}" fill="#fff"/>\n<path d="{d2}" fill="#7fe0ff"/>\n</svg>\n'
    io.open(f'{USCITA}/logo-{num}-{nome}-completo.svg', 'w', encoding='utf-8', newline='\n').write(intero)
    print(num, nome, 'larghezza', W, 'byte', len(intero))
