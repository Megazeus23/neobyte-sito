// Costruisce il sito di NeoByte Studios a partire dai dati.
//
//   node costruisci.mjs                     legge dati/ e scrive le pagine in sito/
//   node costruisci.mjs --dati X --uscita Y  usa un'altra cartella dei dati e un'altra di uscita (per le prove)
//
// Non ha dipendenze: basta Node. Non cancella mai niente: riscrive le pagine HTML, sitemap.xml, robots.txt,
// manifest.webmanifest, i feed del diario (feed.xml) e lo zip della sala stampa (assets/stampa/*.zip).
// Immagini, font, CSS, JS e i file di assets/stampa stanno già in <uscita>/assets e non vengono toccati.
// Se un dato manca o un'immagine non esiste, si ferma e dice che cosa correggere.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const QUI = dirname(fileURLToPath(import.meta.url));
const arg = nome => { const i = process.argv.indexOf('--' + nome); return i > -1 ? process.argv[i + 1] : null; };
const DATI = resolve(QUI, arg('dati') || 'dati');
const USCITA = resolve(QUI, arg('uscita') || 'sito');

const LINGUE = ['it', 'en'];
const STATI = ['in-sviluppo', 'in-arrivo', 'disponibile'];
const PIATTAFORME = ['android', 'ios', 'pc', 'mac', 'linux', 'web', 'console'];
const NEGOZI = [
  { chiave: 'googlePlay', nome: 'Google Play', icona: 'telefono' },
  { chiave: 'appStore', nome: 'App Store', icona: 'telefono' },
  { chiave: 'steam', nome: 'Steam', icona: 'schermo' },
  { chiave: 'epic', nome: 'Epic Games Store', icona: 'schermo' },
  { chiave: 'itch', nome: 'itch.io', icona: 'schermo' },
];
const LEGALI = ['privacy', 'termini', 'eliminazioneAccount'];
const LOCALE = { it: 'it_IT', en: 'en_US' };

// ───────────────────────── utilità ─────────────────────────

const problemi = [];
const avvisi = [];
const errore = testo => { problemi.push(testo); };
const avviso = testo => { avvisi.push(testo); };
const leggiJson = nome => {
  const file = join(DATI, nome);
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`\nERRORE: non riesco a leggere ${file}\n  ${e.message}\n`); process.exit(1); }
};
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const apostrofi = s => String(s ?? '').replace(/(\p{L})'(\p{L})/gu, '$1’$2');
const txt = s => esc(apostrofi(s));
const impronta = file => existsSync(file) ? createHash('md5').update(readFileSync(file)).digest('hex').slice(0, 8) : '0';
const eUrl = s => typeof s === 'string' && /^https?:\/\/[^\s]+$/.test(s);
const ePercorso = s => typeof s === 'string' && /^\/[^\s]*$/.test(s);

// Larghezza e altezza di un'immagine (WebP, PNG, JPEG) senza librerie.
function dimensioni(file) {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8 ') return { l: b.readUInt16LE(26) & 0x3fff, a: b.readUInt16LE(28) & 0x3fff };
    if (tipo === 'VP8L') { const n = b.readUInt32LE(21); return { l: (n & 0x3fff) + 1, a: ((n >> 14) & 0x3fff) + 1 }; }
    if (tipo === 'VP8X') return { l: b.readUIntLE(24, 3) + 1, a: b.readUIntLE(27, 3) + 1 };
  }
  if (b.readUInt32BE(0) === 0x89504e47) return { l: b.readUInt32BE(16), a: b.readUInt32BE(20) };
  if (b.readUInt16BE(0) === 0xffd8) {
    let i = 2;
    while (i < b.length) {
      const m = b.readUInt16BE(i), lung = b.readUInt16BE(i + 2);
      if (m >= 0xffc0 && m <= 0xffcf && m !== 0xffc4 && m !== 0xffc8 && m !== 0xffcc) return { l: b.readUInt16BE(i + 7), a: b.readUInt16BE(i + 5) };
      i += 2 + lung;
    }
  }
  throw new Error('formato immagine non riconosciuto: ' + file);
}

const ICONE = {
  telefono: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.5 18.5h3"/></svg>',
  schermo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="1.8"/><path d="M8.5 20.5h7M12 16.5v4"/></svg>',
  freccia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  indietro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>',
  fuori: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v14h14v-4M13 4h7v7M20 4l-9 9"/></svg>',
  chiudi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  posta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 7l9 6.5L21 7"/></svg>',
  condividi: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.2 10.8l7-4M8.2 13.2l7 4"/></svg>',
  scarica: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  su: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  rss: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.2"/></svg>',
  copia: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
};
const ICONA_PIATTAFORMA = { android: 'telefono', ios: 'telefono', pc: 'schermo', mac: 'schermo', linux: 'schermo', web: 'schermo', console: 'schermo' };

// Il marchio: il logo «Rotta N» (logo/logo-3-rotta-n-simbolo.svg), una N con il suo pianeta. La vista è stretta sul disegno.
// «conLuce» mette le sfumature (una volta sola per pagina: la testata; il piè di pagina le riusa).
const marchio = (classe = 'marchio-segno', conLuce = false) => `<svg class="${classe}" viewBox="8 8 48 48" aria-hidden="true">${conLuce ? '<defs><linearGradient id="m-a" gradientUnits="userSpaceOnUse" x1="10" y1="54" x2="54" y2="10"><stop offset="0" stop-color="#2a4bd6"/><stop offset=".55" stop-color="#7fe0ff"/><stop offset="1" stop-color="#fff"/></linearGradient><radialGradient id="m-b" cx="34%" cy="28%" r="82%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d6f6ff"/><stop offset="1" stop-color="#7fc4ff"/></radialGradient></defs>' : ''}<polygon points="10.5,53 10.5,11 22,11 43.5,38.3 43.5,11 53.5,11 53.5,53 42,53 20.5,25.7 20.5,53" fill="url(#m-a)"/><circle cx="35.4" cy="17.4" r="5.4" fill="url(#m-b)"/></svg>`;

// ───────────────────────── dati e controlli ─────────────────────────

const studio = leggiJson('studio.json');
const testi = leggiJson('testi.json');
const giochi = leggiJson('giochi.json');
// Diario e domande frequenti sono facoltativi: se il file non c'è, quella parte del sito non compare.
const leggiJsonSeCe = (nome, vuoto) => (existsSync(join(DATI, nome)) ? leggiJson(nome) : vuoto);
const diario = leggiJsonSeCe('diario.json', []);
const faq = leggiJsonSeCe('faq.json', []);
if (!Array.isArray(diario)) { console.error('ERRORE: diario.json deve essere un elenco [ … ] di voci.'); process.exit(1); }
if (!Array.isArray(faq)) { console.error('ERRORE: faq.json deve essere un elenco [ … ] di domande.'); process.exit(1); }
const BASE = String(studio.urlSito || '').replace(/\/+$/, '');
if (!eUrl(BASE)) errore('studio.json: "urlSito" deve essere un indirizzo completo, per esempio https://neobytestudios.com');
if (!Array.isArray(giochi)) { console.error('ERRORE: giochi.json deve essere un elenco [ … ] di giochi.'); process.exit(1); }
for (const l of LINGUE) {
  const t = testi[l] || {};
  if (!Array.isArray(t.hero?.motto) || !t.hero.motto.length) errore(`testi.json (${l}): manca "hero.motto" (elenco di frasi)`);
  if (!Array.isArray(t.hero?.telemetria) || t.hero.telemetria.length < 3) errore(`testi.json (${l}): "hero.telemetria" deve avere 3 voci`);
  for (const [a, b] of [['hero', 'scorri'], ['giochi', 'mondo'], ['studio', 'direttive'], ['gioco', 'avvicinamento'], ['gioco', 'superficie'], ['nav', 'diario'], ['nav', 'assistenza'], ['nav', 'stampa'], ['nav', 'menu'], ['diario', 'titolo'], ['assistenza', 'titolo'], ['stampa', 'titolo'], ['mappa', 'titolo'], ['condividi', 'azione'], ['meta', 'titoloDiario'], ['meta', 'titoloAssistenza'], ['meta', 'titoloStampa']]) if (!t[a]?.[b]) errore(`testi.json (${l}): manca "${a}.${b}"`);
}

const cartellaImg = slug => join(USCITA, 'assets', 'img', 'giochi', slug);
const bilingue = (g, campo, valore, elenco = false) => {
  for (const l of LINGUE) {
    const v = valore?.[l];
    if (elenco ? !(Array.isArray(v) && v.length) : !(typeof v === 'string' && v.trim())) errore(`${g}: manca "${campo}" in ${l === 'it' ? 'italiano ("it")' : 'inglese ("en")'}`);
  }
};
const controllaImmagine = (g, slug, file, campo) => {
  if (typeof file !== 'string' || !file) { errore(`${g}: manca il file di "${campo}"`); return false; }
  if (!existsSync(join(cartellaImg(slug), file))) { errore(`${g}: l'immagine "${file}" (${campo}) non esiste in ${cartellaImg(slug)}`); return false; }
  return true;
};

const slugVisti = new Set();
giochi.forEach((gioco, i) => {
  const g = `Gioco n. ${i + 1}${gioco?.nome ? ` («${gioco.nome}»)` : ''}`;
  if (!gioco.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(gioco.slug)) return errore(`${g}: "slug" deve essere in minuscolo con trattini, per esempio "mio-gioco"`);
  if (slugVisti.has(gioco.slug)) errore(`${g}: lo slug "${gioco.slug}" è usato due volte`);
  slugVisti.add(gioco.slug);
  if (!gioco.nome) errore(`${g}: manca "nome"`);
  if (!STATI.includes(gioco.stato)) errore(`${g}: "stato" deve essere uno fra: ${STATI.join(', ')}`);
  bilingue(g, 'motto', gioco.motto);
  bilingue(g, 'descrizioneBreve', gioco.descrizioneBreve);
  bilingue(g, 'descrizione', gioco.descrizione, true);
  bilingue(g, 'generi', gioco.generi, true);
  if (!Array.isArray(gioco.piattaforme) || !gioco.piattaforme.length) errore(`${g}: "piattaforme" deve avere almeno una voce`);
  for (const p of gioco.piattaforme || []) if (!PIATTAFORME.includes(p)) errore(`${g}: piattaforma "${p}" sconosciuta (valide: ${PIATTAFORME.join(', ')})`);
  if (gioco.tema?.accento && !/^#[0-9a-f]{6}$/i.test(gioco.tema.accento)) errore(`${g}: "tema.accento" deve essere un colore come #f2a84b`);

  const im = gioco.immagini || {};
  if (!im.copertina?.file) errore(`${g}: manca "immagini.copertina.file"`);
  else { controllaImmagine(g, gioco.slug, im.copertina.file, 'copertina'); bilingue(g, 'immagini.copertina.alt', im.copertina.alt); }
  if (im.icona) controllaImmagine(g, gioco.slug, im.icona, 'icona');
  if (im.condivisione) controllaImmagine(g, gioco.slug, im.condivisione, 'condivisione');
  if (im.personaggio) { controllaImmagine(g, gioco.slug, im.personaggio.file, 'personaggio'); bilingue(g, 'immagini.personaggio.alt', im.personaggio.alt); }
  (im.schermate || []).forEach((s, n) => { controllaImmagine(g, gioco.slug, s.file, `schermata ${n + 1}`); bilingue(g, `immagini.schermate[${n + 1}].alt`, s.alt); });
  for (const blocco of ['vetrina', 'sequenza']) {
    if (!im[blocco]) continue;
    bilingue(g, `immagini.${blocco}.titolo`, im[blocco].titolo);
    (im[blocco].immagini || []).forEach((s, n) => { controllaImmagine(g, gioco.slug, s.file, `${blocco} ${n + 1}`); bilingue(g, `immagini.${blocco}.immagini[${n + 1}].alt`, s.alt); });
  }

  const store = gioco.store || {};
  for (const n of NEGOZI) if (store[n.chiave] && !eUrl(store[n.chiave])) errore(`${g}: il link "${n.chiave}" non è un indirizzo valido (deve iniziare con https://)`);
  for (const a of store.altro || []) if (!a?.nome || !eUrl(a?.url)) errore(`${g}: ogni voce di "store.altro" vuole "nome" e "url" (https://…)`);
  for (const k of gioco.inArrivoSu || []) {
    if (!NEGOZI.some(n => n.chiave === k)) errore(`${g}: "inArrivoSu" contiene "${k}", che non è uno store conosciuto (${NEGOZI.map(n => n.chiave).join(', ')})`);
    else if (store[k]) avviso(`${g}: "${k}" ha già il link, quindi lo tolgo da solo dagli «in arrivo» (puoi cancellarlo da "inArrivoSu")`);
  }
  const haLink = NEGOZI.some(n => store[n.chiave]) || (store.altro || []).length > 0;
  if (gioco.stato === 'disponibile' && !haLink) errore(`${g}: lo stato è "disponibile" ma non c'è nessun link di store. Aggiungi un link o cambia lo stato`);
  for (const k of Object.keys(gioco.legali || {})) {
    if (!LEGALI.includes(k)) errore(`${g}: "legali.${k}" non è previsto (validi: ${LEGALI.join(', ')})`);
    else if (gioco.legali[k] && !eUrl(gioco.legali[k]) && !ePercorso(gioco.legali[k])) errore(`${g}: "legali.${k}" deve essere un indirizzo https://… oppure un percorso del sito che inizia con /`);
    else if (ePercorso(gioco.legali[k])) {
      const pezzo = gioco.legali[k].replace(/^\//, '');
      const file = /\.html?$/.test(pezzo) ? pezzo : join(pezzo, 'index.html');
      if (!existsSync(join(USCITA, file))) errore(`${g}: "legali.${k}" punta a ${gioco.legali[k]}, ma la pagina ${join(USCITA, file)} non esiste ancora. Crea la pagina oppure rimetti l'indirizzo https://`);
    }
  }
  if (gioco.trailer && !eUrl(gioco.trailer) && !existsSync(join(cartellaImg(gioco.slug), gioco.trailer))) errore(`${g}: il trailer "${gioco.trailer}" non è un indirizzo https:// né un file in ${cartellaImg(gioco.slug)}`);
});

const PAGINE_LINK = ['home', 'giochi', 'diario', 'assistenza', 'stampa'];
const slugVoci = new Set();
diario.forEach((v, i) => {
  const d = `diario.json, voce n. ${i + 1}${v?.titolo?.it ? ` («${v.titolo.it}»)` : ''}`;
  if (!v.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) return errore(`${d}: "slug" deve essere in minuscolo con trattini, per esempio "nuovo-aggiornamento"`);
  if (slugVoci.has(v.slug)) errore(`${d}: lo slug "${v.slug}" è usato due volte`);
  slugVoci.add(v.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data || '') || Number.isNaN(Date.parse(v.data))) errore(`${d}: "data" deve essere scritta come 2026-11-19 (anno-mese-giorno)`);
  bilingue(d, 'titolo', v.titolo); bilingue(d, 'sommario', v.sommario); bilingue(d, 'testo', v.testo, true);
  if (v.gioco && !slugVisti.has(v.gioco)) errore(`${d}: "gioco" indica "${v.gioco}", che non è uno slug di giochi.json`);
});
faq.forEach((q, i) => {
  const d = `faq.json, domanda n. ${i + 1}`;
  bilingue(d, 'domanda', q.domanda); bilingue(d, 'risposta', q.risposta, true);
  if (q.gioco && !slugVisti.has(q.gioco)) errore(`${d}: "gioco" indica "${q.gioco}", che non è uno slug di giochi.json`);
  if (q.link) {
    bilingue(d, 'link.etichetta', q.link.etichetta);
    const p = q.link.pagina;
    if (q.link.url ? !(eUrl(q.link.url) || /^mailto:[^\s]+@[^\s]+$/.test(q.link.url)) : !(PAGINE_LINK.includes(p) || (typeof p === 'string' && p.startsWith('gioco:') && slugVisti.has(p.slice(6)))))
      errore(`${d}: "link" vuole "url" (https://… o mailto:…) oppure "pagina" (${PAGINE_LINK.join(', ')}, gioco:slug-del-gioco)`);
  }
});
if (!problemi.length) diario.sort((a, b) => b.data.localeCompare(a.data) || a.slug.localeCompare(b.slug)); // dalla più recente

if (problemi.length) {
  console.error(`\nIl sito NON è stato costruito. Da correggere (${problemi.length}):\n` + problemi.map(p => '  • ' + p).join('\n') + '\n');
  process.exit(1);
}

// ───────────────────────── percorsi ─────────────────────────

const PERCORSO = {
  home: l => (l === 'it' ? '' : 'en/'),
  giochi: l => (l === 'it' ? 'giochi/' : 'en/games/'),
  gioco: (l, slug) => (l === 'it' ? `giochi/${slug}/` : `en/games/${slug}/`),
  diario: l => (l === 'it' ? 'diario/' : 'en/log/'),
  voce: (l, slug) => (l === 'it' ? `diario/${slug}/` : `en/log/${slug}/`),
  assistenza: l => (l === 'it' ? 'assistenza/' : 'en/support/'),
  stampa: l => (l === 'it' ? 'stampa/' : 'en/press/'),
};
const MESI = {
  it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const dataLunga = (l, d) => { const [a, m, g] = d.split('-').map(Number); return `${g} ${MESI[l][m - 1]} ${a}`; };
const numeroVoce = v => String(diario.length - diario.indexOf(v)).padStart(2, '0');
const versione = { css: impronta(join(USCITA, 'assets/css/sito.css')), js: impronta(join(USCITA, 'assets/js/sito.js')), gioco: impronta(join(USCITA, 'assets/js/navicella.js')) };
const scritti = [];
const pagineSitemap = [];

// ───────────────────────── pezzi ─────────────────────────

// «c» è il contesto della pagina: lingua, prefisso verso la radice, testi.
function contesto(lingua, percorsoPagina, radice = false) {
  const profondita = percorsoPagina.split('/').filter(Boolean).length;
  const p = radice ? '/' : '../'.repeat(profondita);
  return {
    l: lingua, t: testi[lingua], p,
    vai: verso => (p + verso) || './',
    assoluto: verso => `${BASE}/${verso}`,
  };
}

function immagine(c, slug, file, { alt = '', sizes = '100vw', classe = '', subito = false, extra = '' } = {}) {
  const dir = cartellaImg(slug);
  const d = dimensioni(join(dir, file));
  const base = `${c.p}assets/img/giochi/${slug}/`;
  const piccola = file.replace(/\.(\w+)$/, '.s.$1');
  let srcset = '';
  if (existsSync(join(dir, piccola))) {
    const dp = dimensioni(join(dir, piccola));
    srcset = ` srcset="${esc(base + piccola)} ${dp.l}w, ${esc(base + file)} ${d.l}w" sizes="${esc(sizes)}"`;
  }
  return `<img${classe ? ` class="${classe}"` : ''} src="${esc(base + file)}"${srcset} width="${d.l}" height="${d.a}" alt="${txt(alt)}"${subito ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"'}${extra}>`;
}

const stileGioco = g => (g.tema?.accento ? ` style="--accento:${g.tema.accento}"` : '');
const classeTitolo = g => (g.tema?.fontTitolo === 'cinzel' ? ' tipo-cinzel' : '');
const etichettaStato = (c, g) => `<span class="stato stato--${g.stato}"><i aria-hidden="true"></i>${txt(c.t.stato[g.stato])}</span>`;

function pillole(c, g, { generi = true } = {}) {
  const voci = [];
  if (generi) for (const x of g.generi[c.l]) voci.push(`<li>${txt(x)}</li>`);
  for (const p of g.piattaforme) voci.push(`<li class="pillola-piattaforma">${ICONE[ICONA_PIATTAFORMA[p]]}${txt(c.t.piattaforme[p])}</li>`);
  return `<ul class="pillole">${voci.join('')}</ul>`;
}

// I pulsanti degli store: un link solo se l'indirizzo c'è; altrimenti, se è annunciato, un'etichetta «Presto su…» non cliccabile.
function negozi(c, g, { compatto = false } = {}) {
  const store = g.store || {};
  const voci = [], presto = [];
  for (const n of NEGOZI) {
    if (store[n.chiave]) {
      voci.push(`<li><a class="negozio" href="${esc(store[n.chiave])}" target="_blank" rel="noopener">${ICONE[n.icona]}<span><small>${txt(c.t.store.disponibileSu)}</small><b>${esc(n.nome)}</b></span><span class="solo-lettori"> (${txt(c.t.store.apreNuova)})</span></a></li>`);
    } else if ((g.inArrivoSu || []).includes(n.chiave)) {
      presto.push(`<li><span class="negozio negozio--presto">${ICONE[n.icona]}<span><small>${txt(c.t.store.prestoSu)}</small><b>${esc(n.nome)}</b></span></span></li>`);
    }
  }
  for (const a of store.altro || []) {
    voci.push(`<li><a class="negozio" href="${esc(a.url)}" target="_blank" rel="noopener">${ICONE.fuori}<span><small>${txt(c.t.store.disponibileSu)}</small><b>${txt(a.nome)}</b></span><span class="solo-lettori"> (${txt(c.t.store.apreNuova)})</span></a></li>`);
  }
  voci.push(...presto);
  if (!voci.length) return compatto ? '' : `<p class="negozi-vuoto">${txt(c.t.store.inSviluppo)}</p>`;
  return `<ul class="negozi${compatto ? ' negozi--compatti' : ''}">${voci.join('')}</ul>`;
}

const numeroMondo = g => String(giochi.indexOf(g) + 1).padStart(2, '0');

// Il pianeta di un gioco: la sua copertina dentro una sfera. «--fuga» dice di quanto può scorrere l'immagine (dipende dalle sue proporzioni).
function pianeta(c, g, { alt = '', sizes = '160px', subito = false } = {}) {
  const d = dimensioni(join(cartellaImg(g.slug), g.immagini.copertina.file));
  const fuga = d.l > d.a ? -((1 - d.a / d.l) * 100).toFixed(2) : 0;
  return `<span class="pianeta">${immagine(c, g.slug, g.immagini.copertina.file, { alt, sizes, subito, extra: ` style="--fuga:${fuga}%"` })}</span>`;
}

// La scena di un mondo: orbite, pianeta e, se c'è, il personaggio del gioco davanti.
function scenaMondo(c, g, { classe, altCopertina = '', sizes, sizesFigura, subito = false }) {
  const im = g.immagini;
  return `<div class="${classe}">
        <span class="orbita orbita--larga" aria-hidden="true"></span>
        <span class="orbita" aria-hidden="true"><i></i></span>
        ${pianeta(c, g, { alt: altCopertina, sizes, subito })}
        <span class="orbita orbita--davanti" aria-hidden="true"><i></i></span>
        ${im.personaggio ? `<div class="vetta-figura">${immagine(c, g.slug, im.personaggio.file, { alt: im.personaggio.alt[c.l], sizes: sizesFigura, subito })}</div>` : ''}
      </div>`;
}

function testaSezione(c, numero, etichetta, titolo, sottotitolo = '', id = '') {
  const righe = Array.isArray(titolo) ? titolo.map(r => `<span>${txt(r)}</span>`).join(' ') : txt(titolo);
  return `<header class="sezione-testa" data-appari>
      <p class="etichetta"><span class="etichetta-n">${String(numero).padStart(2, '0')}</span><span class="etichetta-linea" aria-hidden="true"></span>${txt(etichetta)}</p>
      <h2${id ? ` id="${id}"` : ''}>${righe}</h2>
      ${sottotitolo ? `<p class="sezione-sotto">${txt(sottotitolo)}</p>` : ''}
    </header>`;
}

function schedaGioco(c, g) {
  const url = c.vai(PERCORSO.gioco(c.l, g.slug));
  return `<li class="scheda-gioco" data-stato="${g.stato}"${stileGioco(g)} data-appari>
      <a href="${esc(url)}" class="scheda-link">
        <span class="scheda-img">${pianeta(c, g)}</span>
        <span class="scheda-corpo">
          ${etichettaStato(c, g)}
          <strong class="scheda-nome${classeTitolo(g)}">${txt(g.nome)}</strong>
          <span class="scheda-motto">${txt(g.motto[c.l])}</span>
        </span>
      </a>
      ${pillole(c, g, { generi: false })}
    </li>`;
}

const schedaProssimo = c => `<li class="scheda-gioco scheda-prossimo" data-appari>
      <span class="prossimo-orbita" aria-hidden="true"></span>
      <p class="etichetta">${txt(c.t.giochi.prossimoEtichetta)}</p>
      <strong class="scheda-nome">${txt(c.t.giochi.prossimoTitolo)}</strong>
      <span class="scheda-motto">${txt(c.t.giochi.prossimoTesto)}</span>
    </li>`;

function inEvidenza(c, g) {
  const url = c.vai(PERCORSO.gioco(c.l, g.slug));
  const im = g.immagini;
  return `<article class="vetta"${stileGioco(g)}>
      <div data-appari>${scenaMondo(c, g, { classe: 'vetta-scena', altCopertina: im.copertina.alt[c.l], sizes: '(min-width: 980px) 660px, 100vw', sizesFigura: '(min-width: 980px) 360px, 60vw' })}</div>
      <div class="vetta-testo quadro" data-appari>
        <p class="vetta-sopra">${etichettaStato(c, g)}<span class="vetta-evidenza">${txt(c.t.giochi.inEvidenza)} · ${txt(c.t.giochi.mondo)} ${numeroMondo(g)}</span></p>
        <h3 class="vetta-nome${classeTitolo(g)}"><a href="${esc(url)}">${txt(g.nome)}</a></h3>
        <p class="vetta-motto">${txt(g.motto[c.l])}</p>
        <p class="vetta-breve">${txt(g.descrizioneBreve[c.l])}</p>
        ${pillole(c, g)}
        <div class="vetta-azioni">
          <a class="bottone bottone--pieno" href="${esc(url)}">${txt(c.t.giochi.scopri)}${ICONE.freccia}<span class="solo-lettori">: ${txt(g.nome)}</span></a>
          ${negozi(c, g, { compatto: true })}
        </div>
      </div>
    </article>`;
}

// Le voci del menu. Sugli schermi stretti il menu diventa un pannello che si apre con «Menu»;
// senza JavaScript «Menu» porta all'elenco dei link nel piè di pagina.
function testata(c, alternative, inHome, attiva) {
  const home = c.vai(PERCORSO.home(c.l));
  const ancora = id => (inHome ? `#${id}` : `${home}#${id}`);
  const voci = [
    ['giochi', ancora('giochi'), c.t.nav.giochi],
    ...(diario.length ? [['diario', c.vai(PERCORSO.diario(c.l)), c.t.nav.diario]] : []),
    ['studio', ancora('studio'), c.t.nav.studio],
    ['assistenza', c.vai(PERCORSO.assistenza(c.l)), c.t.nav.assistenza],
    ['stampa', c.vai(PERCORSO.stampa(c.l)), c.t.nav.stampa],
  ];
  return `<a class="salta" href="#contenuto">${txt(c.t.nav.salta)}</a>
  <header class="testata" data-testata>
    <a class="marchio" href="${esc(home)}" aria-label="${txt(c.t.nav.home)}">${marchio('marchio-segno', true)}<span class="marchio-nome">NeoByte<span> Studios</span></span></a>
    <a class="menu-tasto" href="#piede-menu" data-menu-tasto data-apri="${txt(c.t.nav.menu)}" data-chiudi="${txt(c.t.nav.chiudiMenu)}"><span>${txt(c.t.nav.menu)}</span><i aria-hidden="true"></i></a>
    <nav class="menu" id="menu" aria-label="${txt(c.t.nav.principale)}">
      ${voci.map(([k, u, n]) => `<a href="${esc(u)}"${k === attiva ? ' aria-current="page"' : ''}>${txt(n)}</a>`).join('\n      ')}
    </nav>
    <div class="lingue" role="group" aria-label="${txt(c.t.nav.lingua)}">
      ${LINGUE.map(l => `<a href="${esc(c.vai(alternative[l]))}" lang="${l}" hreflang="${l}"${l === c.l ? ' aria-current="true"' : ''}><span class="solo-lettori">${l === 'it' ? 'Italiano' : 'English'}</span><span aria-hidden="true">${l.toUpperCase()}</span></a>`).join('')}
    </div>
  </header>`;
}

function piede(c, alternative) {
  const home = c.vai(PERCORSO.home(c.l));
  const sociali = Object.entries(studio.social || {}).filter(([, u]) => eUrl(u));
  const nomiSociali = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', discord: 'Discord' };
  return `<footer class="piede">
    <div class="contenitore piede-griglia">
      <div class="piede-marchio">
        <a class="marchio" href="${esc(home)}" aria-label="${txt(c.t.nav.home)}">${marchio()}<span class="marchio-nome">NeoByte<span> Studios</span></span></a>
        <p>${txt(c.t.piede.motto)}</p>
      </div>
      <nav class="piede-menu" id="piede-menu" aria-label="${esc(studio.nome)}">
        <a href="${esc(c.vai(PERCORSO.giochi(c.l)))}">${txt(c.t.giochi.tutti)}</a>
        ${diario.length ? `<a href="${esc(c.vai(PERCORSO.diario(c.l)))}">${txt(c.t.diario.titolo)}</a>` : ''}
        <a href="${esc(home)}#studio">${txt(c.t.nav.studio)}</a>
        <a href="${esc(c.vai(PERCORSO.assistenza(c.l)))}">${txt(c.t.nav.assistenza)}</a>
        <a href="${esc(c.vai(PERCORSO.stampa(c.l)))}">${txt(c.t.stampa.titolo)}</a>
        <a href="${esc(home)}#contatti">${txt(c.t.nav.contatti)}</a>
        <a href="mailto:${esc(studio.email.contatti)}">${esc(studio.email.contatti)}</a>
      </nav>
      ${sociali.length ? `<nav class="piede-menu" aria-label="${txt(c.t.piede.social)}">${sociali.map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener me">${esc(nomiSociali[k] || k)}</a>`).join('')}</nav>` : ''}
      <div class="lingue" role="group" aria-label="${txt(c.t.nav.lingua)}">
        ${LINGUE.map(l => `<a href="${esc(c.vai(alternative[l]))}" lang="${l}" hreflang="${l}"${l === c.l ? ' aria-current="true"' : ''}>${l === 'it' ? 'Italiano' : 'English'}</a>`).join('')}
      </div>
    </div>
    <div class="contenitore piede-legale">
      <p>© ${new Date().getFullYear()} ${esc(studio.nome)} — ${txt(c.t.piede.ditta)} ${esc(studio.legale.titolare)} · ${esc(studio.legale.indirizzo)} · ${txt(c.t.piede.piva)} ${esc(studio.legale.partitaIva)}. ${txt(c.t.piede.diritti)}</p>
      <p>${txt(c.t.piede.cookie)} ${txt(c.t.piede.marchi)}</p>
      <p><a class="torna-su" href="#contenuto">${txt(c.t.piede.su)}${ICONE.su}</a></p>
    </div>
  </footer>`;
}

function pagina({ c, percorso, alternative, titolo, descrizione, og, corpo, classe = '', jsonld = null, inHome = false, indicizza = true, file = null, stile = '', attiva = '', feed = '', tipoOg = 'website' }) {
  const canonico = c.assoluto(percorso);
  const ogImg = og?.url || `${BASE}/assets/img/condivisione.jpg`;
  const html = `<!doctype html>
<html lang="${c.l}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${txt(titolo)}</title>
<meta name="description" content="${txt(descrizione)}">
${indicizza ? `<link rel="canonical" href="${esc(canonico)}">
${LINGUE.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(c.assoluto(alternative[l]))}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${esc(c.assoluto(alternative.it))}">` : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="${tipoOg}">
<meta property="og:site_name" content="${esc(studio.nome)}">
<meta property="og:title" content="${txt(titolo)}">
<meta property="og:description" content="${txt(descrizione)}">
<meta property="og:url" content="${esc(canonico)}">
<meta property="og:image" content="${esc(ogImg)}">
${og?.l ? `<meta property="og:image:width" content="${og.l}">\n<meta property="og:image:height" content="${og.a}">` : '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">'}
<meta property="og:image:alt" content="${txt(og?.alt || studio.nome)}">
<meta property="og:locale" content="${LOCALE[c.l]}">
${LINGUE.filter(l => l !== c.l).map(l => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#03040b">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${c.p}assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${c.p}assets/img/icona-180.png">
<link rel="manifest" href="${c.p}manifest.webmanifest">${feed ? `\n<link rel="alternate" type="application/rss+xml" title="${txt(c.t.diario.titolo)} — ${esc(studio.nome)}" href="${esc(c.assoluto(feed))}">` : ''}
<link rel="preload" href="${c.p}assets/font/Syncopate-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${c.p}assets/font/SpaceGrotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.p}assets/css/sito.css?v=${versione.css}">
<script>document.documentElement.className='js'</script>
<script src="${c.p}assets/js/sito.js?v=${versione.js}" data-navicella="${c.p}assets/js/navicella.js?v=${versione.gioco}" defer></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body${classe ? ` class="${classe}"` : ''}${stile}>
  <div class="cosmo" aria-hidden="true"><canvas data-cosmo></canvas></div>
  ${testata(c, alternative, inHome, attiva)}
  <main id="contenuto" tabindex="-1">
${corpo}
  </main>
  ${piede(c, alternative)}
</body>
</html>
`;
  const destinazione = join(USCITA, file || join(percorso, 'index.html'));
  mkdirSync(dirname(destinazione), { recursive: true });
  writeFileSync(destinazione, html);
  scritti.push(destinazione);
  if (indicizza) pagineSitemap.push({ percorso, alternative });
}

// ───────────────────────── pagine ─────────────────────────

function sezioneContatti(c, numero) {
  return `<section class="sezione contatti" id="contatti" aria-labelledby="t-contatti">
    <div class="contenitore">
      ${testaSezione(c, numero, c.t.contatti.etichetta, c.t.contatti.titolo, c.t.contatti.testo, 't-contatti')}
      <ul class="contatti-elenco">
        <li class="quadro" data-appari><span class="etichetta">${txt(c.t.contatti.assistenza)}</span><a class="contatto" href="mailto:${esc(studio.email.contatti)}">${esc(studio.email.contatti)}${ICONE.freccia}</a></li>
        <li class="quadro" data-appari><span class="etichetta">${txt(c.t.contatti.privacy)}</span><a class="contatto" href="mailto:${esc(studio.email.privacy)}">${esc(studio.email.privacy)}${ICONE.freccia}</a></li>
      </ul>
    </div>
  </section>`;
}

const condividi = (c, titolo) => `<button type="button" class="tasto-piccolo" data-condividi data-titolo="${txt(titolo)}" data-fatto="${txt(c.t.condividi.copiato)}" hidden>${ICONE.condividi}<span>${txt(c.t.condividi.azione)}</span></button>`;

// Una voce del diario come scheda: se parla di un gioco, ne prende copertina e colore.
function schedaVoce(c, v) {
  const g = giochi.find(x => x.slug === v.gioco);
  return `<li class="voce quadro"${g ? stileGioco(g) : ''} data-appari>
        <a class="voce-link" href="${esc(c.vai(PERCORSO.voce(c.l, v.slug)))}">
          ${g ? `<span class="voce-img">${immagine(c, g.slug, g.immagini.copertina.file, { alt: '', sizes: '(min-width: 900px) 420px, 92vw' })}</span>` : ''}
          <span class="voce-corpo">
            <span class="voce-data"><span>${txt(c.t.diario.voce)} ${numeroVoce(v)}</span><time datetime="${v.data}">${dataLunga(c.l, v.data)}</time></span>
            <strong class="voce-titolo">${txt(v.titolo[c.l])}</strong>
            <span class="voce-sommario">${txt(v.sommario[c.l])}</span>
            <span class="voce-leggi">${txt(c.t.diario.leggi)}${ICONE.freccia}</span>
          </span>
        </a>
      </li>`;
}

function paginaHome(l) {
  const percorso = PERCORSO.home(l);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.home(x)]));
  const primo = giochi.find(g => g.inEvidenza) || giochi[0];
  const altri = giochi.filter(g => g !== primo);
  const MOSTRA = 5;
  const h = c.t.hero;
  const corpo = `
  <section class="eroe" aria-labelledby="t-eroe" data-eroe>
    <div class="hud" aria-hidden="true"><span>${txt(h.telemetria[0])}</span><span>${txt(h.telemetria[1])} <b>${String(giochi.length).padStart(2, '0')}</b></span><span>${txt(h.telemetria[2])}</span></div>
    <div class="contenitore eroe-dentro">
      <p class="occhiello">${txt(h.occhiello)}</p>
      <h1 id="t-eroe" class="insegna"><span class="insegna-a">NeoByte</span> <span class="insegna-b"><b>Studios</b></span></h1>
      <p class="eroe-motto">${h.motto.map(r => `<span>${txt(r)}</span>`).join(' ')}</p>
      <p class="eroe-testo">${txt(h.testo)}</p>
      <div class="azioni">
        <a class="bottone bottone--pieno" href="#giochi">${txt(h.azione)}${ICONE.freccia}</a>
        <a class="bottone" href="#studio">${txt(h.azione2)}</a>
      </div>
    </div>
    <div class="orizzonte-sole" aria-hidden="true"></div>
    <div class="orizzonte" aria-hidden="true"></div>
    <a class="scorri" href="#giochi">${txt(h.scorri)}</a>
  </section>

  <section class="sezione" id="giochi" aria-labelledby="t-giochi">
    <div class="contenitore">
      ${testaSezione(c, 1, c.t.giochi.etichetta, c.t.giochi.titolo, c.t.giochi.sottotitolo, 't-giochi')}
      ${primo ? inEvidenza(c, primo) : ''}
      ${altri.length ? `<h3 class="sotto-titolo" data-appari>${txt(c.t.giochi.altri)}</h3>` : ''}
      <ul class="griglia-giochi${altri.length ? '' : ' griglia-giochi--sola'}">
        ${altri.slice(0, MOSTRA).map(g => schedaGioco(c, g)).join('\n')}
        ${schedaProssimo(c)}
      </ul>
      ${altri.length > MOSTRA ? `<p class="centro" data-appari><a class="bottone" href="${esc(c.vai(PERCORSO.giochi(l)))}">${txt(c.t.giochi.vediTutti)}${ICONE.freccia}</a></p>` : ''}
    </div>
  </section>

  ${diario.length ? `<section class="sezione" id="diario" aria-labelledby="t-diario">
    <div class="contenitore">
      ${testaSezione(c, 2, c.t.diario.etichetta, c.t.diario.titoloHome || c.t.diario.titolo, c.t.diario.sottotitolo, 't-diario')}
      <ul class="voci">
      ${diario.slice(0, 3).map(v => schedaVoce(c, v)).join('\n')}
      </ul>
      <p class="centro" data-appari><a class="bottone" href="${esc(c.vai(PERCORSO.diario(l)))}">${txt(c.t.diario.tutte)}${ICONE.freccia}</a></p>
    </div>
  </section>` : ''}

  <section class="sezione studio" id="studio" aria-labelledby="t-studio">
    <div class="contenitore studio-griglia">
      <div>
        ${testaSezione(c, diario.length ? 3 : 2, c.t.studio.etichetta, c.t.studio.titolo, '', 't-studio')}
        <div class="studio-testo" data-appari>${c.t.studio.testo.map(p => `<p>${txt(p)}</p>`).join('')}</div>
      </div>
      <div>
        <h3 class="titolo-piccolo titolo-piccolo--primo" data-appari>${txt(c.t.studio.direttive)}</h3>
        <ol class="principi">
          ${c.t.studio.principi.map((p, i) => `<li class="quadro" data-appari><span class="principio-n" aria-hidden="true">0${i + 1}</span><h4>${txt(p.titolo)}</h4><p>${txt(p.testo)}</p></li>`).join('\n')}
        </ol>
      </div>
    </div>
  </section>

  ${sezioneContatti(c, diario.length ? 4 : 3)}`;
  pagina({
    c, percorso, alternative, corpo, inHome: true, classe: 'p-home',
    titolo: c.t.meta.titoloHome, descrizione: c.t.meta.descrizioneHome,
    og: { url: `${BASE}/assets/img/${existsSync(join(USCITA, 'assets', 'img', `condivisione-${l}.jpg`)) ? `condivisione-${l}.jpg` : 'condivisione.jpg'}`, l: 1200, a: 630, alt: `${studio.nome} — ${c.t.piede.motto}` },
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Organization', name: studio.nome, url: BASE + '/',
      logo: `${BASE}/assets/img/icona-512.png`, email: studio.email.contatti,
      sameAs: Object.values(studio.social || {}).filter(eUrl),
    },
  });
}

// La mappa stellare: ogni gioco è un pianeta sulla sua orbita; le orbite libere restano vuote («nessun segnale»).
function mappaStellare(c) {
  const mostrati = giochi.slice(0, 4);
  const orbite = Math.max(3, Math.min(5, mostrati.length + 1));
  const corpo = orbite <= 3 ? 15 : 11; // grandezza dei pianeti, in centesimi della mappa
  const ANGOLI = [140, 300, 30, 220, 80];
  const righe = [];
  for (let i = 0; i < orbite; i++) {
    const d = orbite <= 3 ? 44 + i * 24 : 32 + i * 15;
    const g = mostrati[i];
    const stile = `--d:${d}%;--a:${ANGOLI[i]}deg;--giro:${80 + i * 45}s;--m:${(corpo / d * 100).toFixed(1)}%`;
    righe.push(g
      ? `<div class="sistema-orbita" style="${stile}"><a class="sistema-corpo" href="${esc(c.vai(PERCORSO.gioco(c.l, g.slug)))}"${stileGioco(g)}>${pianeta(c, g, { sizes: '90px' })}<span class="sistema-nome">${txt(g.nome)}</span></a></div>`
      : `<div class="sistema-orbita sistema-orbita--vuota" style="${stile}" aria-hidden="true"><span class="sistema-corpo sistema-vuoto">?</span></div>`);
  }
  return `<div class="sistema" data-appari>
        <div class="sistema-testo">
          <h2 class="titolo-blocco">${txt(c.t.mappa.titolo)}</h2>
          <p>${txt(c.t.mappa.testo)}</p>
          <p class="sistema-legenda"><i aria-hidden="true"></i>${txt(c.t.mappa.vuoto)}</p>
        </div>
        <div class="sistema-cielo">
          ${righe.join('\n          ')}
        </div>
      </div>`;
}

function paginaGiochi(l) {
  const percorso = PERCORSO.giochi(l);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.giochi(x)]));
  const statiPresenti = STATI.filter(s => giochi.some(g => g.stato === s));
  const filtro = giochi.length > 3 && statiPresenti.length > 1
    ? `<div class="filtro" role="group" aria-label="${txt(c.t.giochi.filtro)}" data-filtro>
        <button type="button" aria-pressed="true" data-stato="">${txt(c.t.giochi.filtroTutti)}</button>
        ${statiPresenti.map(s => `<button type="button" aria-pressed="false" data-stato="${s}">${txt(c.t.stato[s])}</button>`).join('')}
      </div>
      <p class="filtro-vuoto" data-filtro-vuoto hidden>${txt(c.t.giochi.vuoto)}</p>` : '';
  const corpo = `
  <section class="sezione sezione--prima" aria-labelledby="t-giochi">
    <div class="contenitore">
      ${testaSezione(c, 1, c.t.giochi.etichetta, c.t.giochi.titolo, c.t.giochi.sottotitolo, 't-giochi').replace('<h2', '<h1').replace('</h2>', '</h1>')}
      ${mappaStellare(c)}
      ${filtro}
      <ul class="griglia-giochi">
        ${giochi.map(g => schedaGioco(c, g)).join('\n')}
        ${schedaProssimo(c)}
      </ul>
    </div>
  </section>
  ${sezioneContatti(c, 2)}`;
  pagina({ c, percorso, alternative, corpo, classe: 'p-giochi', titolo: c.t.meta.titoloGiochi, descrizione: c.t.meta.descrizioneGiochi });
}

function trailer(c, g) {
  if (!g.trailer) return '';
  const yt = g.trailer.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  const copertina = immagine(c, g.slug, g.immagini.copertina.file, { alt: '', sizes: '(min-width: 1100px) 1000px, 92vw' });
  let dentro;
  if (yt) {
    dentro = `<a class="trailer-avvio" href="https://www.youtube.com/watch?v=${yt[1]}" data-youtube="${yt[1]}" target="_blank" rel="noopener">${copertina}<span class="trailer-tasto">${ICONE.play}</span><span class="solo-lettori">${txt(c.t.gioco.guardaTrailer)}: ${txt(g.nome)}</span></a>
        <p class="nota">${txt(c.t.gioco.trailerNota)}</p>`;
  } else if (eUrl(g.trailer)) {
    dentro = `<a class="trailer-avvio" href="${esc(g.trailer)}" target="_blank" rel="noopener">${copertina}<span class="trailer-tasto">${ICONE.play}</span><span class="solo-lettori">${txt(c.t.gioco.guardaTrailer)}: ${txt(g.nome)} (${txt(c.t.store.apreNuova)})</span></a>`;
  } else {
    dentro = `<video class="trailer-video" controls preload="none" playsinline poster="${c.p}assets/img/giochi/${g.slug}/${esc(g.immagini.copertina.file)}"><source src="${c.p}assets/img/giochi/${g.slug}/${esc(g.trailer)}"></video>`;
  }
  return `<section class="sezione sezione--stretta" aria-labelledby="t-trailer">
    <div class="contenitore">
      <h2 class="titolo-blocco" id="t-trailer" data-appari>${txt(c.t.gioco.trailer)}</h2>
      <div class="trailer" data-appari>${dentro}</div>
    </div>
  </section>`;
}

function paginaGioco(l, g) {
  const percorso = PERCORSO.gioco(l, g.slug);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.gioco(x, g.slug)]));
  const im = g.immagini;
  const tg = c.t.gioco;
  const base = `${c.p}assets/img/giochi/${g.slug}/`;
  const altri = giochi.filter(x => x !== g).slice(0, 3);
  const legali = LEGALI.filter(k => g.legali?.[k]).map(k => {
    const u = g.legali[k];
    const esterno = eUrl(u);
    return `<li><a href="${esc(esterno ? u : c.p + u.replace(/^\//, ''))}"${esterno ? ' target="_blank" rel="noopener"' : ''}>${txt(tg[k])}${esterno ? `${ICONE.fuori}<span class="solo-lettori"> (${txt(c.t.store.apreNuova)})</span>` : ICONE.freccia}</a></li>`;
  });
  const righeScheda = [
    [tg.genere, g.generi[l].join(', ')],
    [tg.piattaforme, g.piattaforme.map(p => c.t.piattaforme[p]).join(', ')],
    [tg.stato, c.t.stato[g.stato]],
    ...(g.scheda || []).map(r => [r.etichetta[l], r.valore[l]]),
    [tg.sviluppatore, studio.nome],
  ];

  const corpo = `
  <section class="g-eroe" aria-labelledby="t-gioco">
    <div class="contenitore g-indietro"><a class="indietro" href="${esc(c.vai(PERCORSO.giochi(l)))}">${ICONE.indietro}${txt(tg.indietro)}</a></div>
    ${scenaMondo(c, g, { classe: 'g-scena', sizes: '(min-width: 980px) 980px, 140vw', sizesFigura: '(min-width: 980px) 470px, 62vw', subito: true })}
    <div class="contenitore g-eroe-dentro">
      <div class="g-eroe-testo">
        <p class="g-rotta"><b>${txt(c.t.giochi.mondo)} ${numeroMondo(g)}</b><span aria-hidden="true">//</span><span>${txt(tg.avvicinamento)}</span></p>
        <p class="g-eroe-sopra">${im.icona ? immagine(c, g.slug, im.icona, { alt: '', sizes: '64px', classe: 'g-icona', subito: true }) : ''}${etichettaStato(c, g)}</p>
        <h1 id="t-gioco" class="g-nome${classeTitolo(g)}">${txt(g.nome)}</h1>
        <p class="g-motto">${txt(g.motto[l])}</p>
        ${pillole(c, g)}
        ${negozi(c, g)}
      </div>
    </div>
  </section>

  <section class="superficie sezione--stretta" aria-label="${txt(tg.superficie)}">
    <div class="contenitore">
      <figure data-appari>${immagine(c, g.slug, im.copertina.file, { alt: im.copertina.alt[l], sizes: '(min-width: 1400px) 1320px, 94vw' })}<figcaption>${txt(tg.superficie)}</figcaption></figure>
    </div>
  </section>

  ${(g.numeri || []).length ? `<section class="numeri" aria-label="${txt(g.nome)}">
    <ul class="contenitore numeri-riga">
      ${g.numeri.map(n => `<li data-appari><b>${txt(n.valore)}</b><span>${txt(n.etichetta[l])}</span></li>`).join('')}
    </ul>
  </section>` : ''}

  <section class="sezione sezione--stretta" aria-labelledby="t-ilgioco">
    <div class="contenitore racconto">
      <div class="racconto-testo quadro">
        <p class="etichetta" data-appari>${txt(tg.ilGioco)}</p>
        <h2 class="solo-lettori" id="t-ilgioco">${txt(tg.ilGioco)}</h2>
        ${g.descrizione[l].map((p, i) => `<p class="${i === 0 ? 'racconto-primo' : ''}" data-appari>${txt(p)}</p>`).join('\n')}
      </div>
      ${(g.punti || []).length ? `<div class="punti">
        <h2 class="titolo-blocco" data-appari>${txt(tg.caratteristiche)}</h2>
        <ol>
          ${g.punti.map((p, i) => `<li data-appari><span class="punto-n" aria-hidden="true">0${i + 1}</span><h3>${txt(p.titolo[l])}</h3><p>${txt(p.testo[l])}</p></li>`).join('\n')}
        </ol>
      </div>` : ''}
    </div>
  </section>

  ${(im.schermate || []).length ? `<section class="sezione sezione--stretta" aria-labelledby="t-schermate">
    <div class="contenitore">
      <div class="blocco-testa" data-appari><h2 class="titolo-blocco" id="t-schermate">${txt(tg.schermate)}</h2><p class="nota">${txt(tg.schermateTesto)}</p></div>
    </div>
    <ul class="schermate">
      ${im.schermate.map((s, i) => `<li><a href="${esc(base + s.file)}" data-lente data-alt="${txt(s.alt[l])}">${immagine(c, g.slug, s.file, { alt: s.alt[l], sizes: '(min-width: 1000px) 24vw, (min-width: 640px) 46vw, 82vw' })}<span class="solo-lettori"> — ${txt(tg.ingrandisci)} (${i + 1} ${txt(tg.di)} ${im.schermate.length})</span></a></li>`).join('\n')}
    </ul>
  </section>` : ''}

  ${im.vetrina ? `<section class="sezione sezione--stretta vetrina" aria-labelledby="t-vetrina">
    <div class="contenitore">
      <div class="blocco-testa blocco-testa--centro" data-appari><h2 class="titolo-blocco" id="t-vetrina">${txt(im.vetrina.titolo[l])}</h2>${im.vetrina.testo ? `<p>${txt(im.vetrina.testo[l])}</p>` : ''}</div>
      <ul class="ventaglio" style="--quante:${im.vetrina.immagini.length}" data-appari>
        ${im.vetrina.immagini.map((s, i, tutte) => `<li style="--k:${(i - (tutte.length - 1) / 2).toFixed(2)}"><figure data-inclina>${immagine(c, g.slug, s.file, { alt: s.alt[l], sizes: '(min-width: 900px) 230px, 30vw' })}${s.nome ? `<figcaption>${txt(typeof s.nome === 'string' ? s.nome : s.nome[l])}</figcaption>` : ''}</figure></li>`).join('\n')}
      </ul>
    </div>
  </section>` : ''}

  ${im.sequenza ? `<section class="sezione sezione--stretta" aria-labelledby="t-sequenza">
    <div class="contenitore sequenza">
      <div class="blocco-testa" data-appari><h2 class="titolo-blocco" id="t-sequenza">${txt(im.sequenza.titolo[l])}</h2>${im.sequenza.testo ? `<p>${txt(im.sequenza.testo[l])}</p>` : ''}</div>
      <ol class="sequenza-riga">
        ${im.sequenza.immagini.map((s, i) => `<li data-appari style="--passo:${i}"><figure>${immagine(c, g.slug, s.file, { alt: s.alt[l], sizes: '(min-width: 900px) 220px, 22vw' })}${s.nome ? `<figcaption>${txt(typeof s.nome === 'string' ? s.nome : s.nome[l])}</figcaption>` : ''}</figure></li>`).join('\n')}
      </ol>
    </div>
  </section>` : ''}

  ${trailer(c, g)}

  <section class="sezione sezione--stretta" aria-labelledby="t-scheda">
    <div class="contenitore fondo-gioco">
      <div class="fondo-colonna quadro" data-appari>
        <h2 class="titolo-blocco" id="t-scheda">${txt(tg.scheda)}</h2>
        <dl class="scheda-dati">
          ${righeScheda.map(([k, v]) => `<div><dt>${txt(k)}</dt><dd>${txt(v)}</dd></div>`).join('\n')}
        </dl>
      </div>
      <div class="fondo-colonna quadro" data-appari>
        <h2 class="titolo-blocco">${txt(c.t.store.titolo)}</h2>
        ${negozi(c, g)}
        ${(g.note?.[l] || []).map(n => `<p class="nota">${txt(n)}</p>`).join('\n')}
        ${legali.length ? `<h3 class="titolo-piccolo">${txt(tg.legali)}</h3><ul class="legali">${legali.join('')}</ul>` : ''}
        <p class="nota">${txt(tg.assistenza)}: <a href="mailto:${esc(studio.email.contatti)}">${esc(studio.email.contatti)}</a></p>
        ${faq.length ? `<p class="nota"><a href="${esc(c.vai(PERCORSO.assistenza(l)))}">${txt(c.t.assistenza.domande || c.t.nav.assistenza)}</a></p>` : ''}
        ${condividi(c, g.nome)}
      </div>
    </div>
  </section>

  ${diario.some(v => v.gioco === g.slug) ? `<section class="sezione sezione--stretta" aria-labelledby="t-daldiario">
    <div class="contenitore">
      <h2 class="titolo-blocco" id="t-daldiario" data-appari>${txt(c.t.diario.dalDiario)}</h2>
      <ul class="voci voci--strette">
      ${diario.filter(v => v.gioco === g.slug).slice(0, 3).map(v => schedaVoce(c, v)).join('\n')}
      </ul>
    </div>
  </section>` : ''}

  ${altri.length ? `<section class="sezione sezione--stretta" aria-labelledby="t-altri">
    <div class="contenitore">
      <h2 class="titolo-blocco" id="t-altri" data-appari>${txt(tg.altriGiochi)}</h2>
      <ul class="griglia-giochi">${altri.map(x => schedaGioco(c, x)).join('\n')}</ul>
    </div>
  </section>` : ''}

  <dialog class="lente" data-lente-finestra aria-label="${txt(tg.schermate)}">
    <button type="button" class="lente-tasto lente-chiudi" data-lente-chiudi aria-label="${txt(tg.chiudi)}">${ICONE.chiudi}</button>
    <button type="button" class="lente-tasto lente-prima" data-lente-prima aria-label="${txt(tg.precedente)}">${ICONE.indietro}</button>
    <figure><img alt="" data-lente-img><figcaption data-lente-testo></figcaption></figure>
    <button type="button" class="lente-tasto lente-dopo" data-lente-dopo aria-label="${txt(tg.successiva)}">${ICONE.freccia}</button>
  </dialog>`;

  const fileOg = im.condivisione || im.copertina.file;
  const dOg = dimensioni(join(cartellaImg(g.slug), fileOg));
  pagina({
    c, percorso, alternative, corpo, classe: 'p-gioco', stile: stileGioco(g),
    titolo: `${g.nome} — ${studio.nome}`, descrizione: g.descrizioneBreve[l],
    og: { url: `${BASE}/assets/img/giochi/${g.slug}/${fileOg}`, l: dOg.l, a: dOg.a, alt: im.copertina.alt[l] },
    jsonld: {
      '@context': 'https://schema.org', '@type': 'VideoGame', name: g.nome, description: g.descrizioneBreve[l],
      url: c.assoluto(percorso), image: `${BASE}/assets/img/giochi/${g.slug}/${fileOg}`, genre: g.generi[l],
      gamePlatform: g.piattaforme.map(p => testi.en.piattaforme[p]),
      author: { '@type': 'Organization', name: studio.nome, url: BASE + '/' },
      publisher: { '@type': 'Organization', name: studio.nome, url: BASE + '/' },
    },
  });
}

function paginaDiario(l) {
  const percorso = PERCORSO.diario(l);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.diario(x)]));
  const corpo = `
  <section class="sezione sezione--prima" aria-labelledby="t-diario">
    <div class="contenitore">
      ${testaSezione(c, 1, c.t.diario.etichetta, c.t.diario.titolo, c.t.diario.sottotitolo, 't-diario').replace('<h2', '<h1').replace('</h2>', '</h1>')}
      <ul class="voci">
      ${diario.map(v => schedaVoce(c, v)).join('\n')}
      </ul>
      <p class="nota feed" data-appari><a href="${esc(c.vai(percorso + 'feed.xml'))}">${ICONE.rss}${txt(c.t.diario.feed)}</a></p>
    </div>
  </section>`;
  pagina({ c, percorso, alternative, corpo, classe: 'p-diario', attiva: 'diario', feed: percorso + 'feed.xml', titolo: c.t.meta.titoloDiario, descrizione: c.t.meta.descrizioneDiario });

  // il feed RSS della lingua: le date vengono dai dati, così due costruzioni danno lo stesso file
  const voci = diario.map(v => `    <item>
      <title>${txt(v.titolo[l])}</title>
      <link>${esc(c.assoluto(PERCORSO.voce(l, v.slug)))}</link>
      <guid isPermaLink="true">${esc(c.assoluto(PERCORSO.voce(l, v.slug)))}</guid>
      <pubDate>${new Date(v.data + 'T09:00:00Z').toUTCString()}</pubDate>
      <description>${txt(v.sommario[l])}</description>
    </item>`).join('\n');
  writeFileSync(join(USCITA, percorso, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${txt(c.t.diario.titolo)} — ${esc(studio.nome)}</title>
    <link>${esc(c.assoluto(percorso))}</link>
    <description>${txt(c.t.meta.descrizioneDiario)}</description>
    <language>${l}</language>
    <atom:link href="${esc(c.assoluto(percorso + 'feed.xml'))}" rel="self" type="application/rss+xml"/>
${voci}
  </channel>
</rss>
`);
}

function paginaVoce(l, v) {
  const percorso = PERCORSO.voce(l, v.slug);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.voce(x, v.slug)]));
  const g = giochi.find(x => x.slug === v.gioco);
  const altre = diario.filter(x => x !== v).slice(0, 3);
  const corpo = `
  <article class="sezione sezione--prima voce-pagina"${g ? stileGioco(g) : ''} aria-labelledby="t-voce">
    <div class="contenitore contenitore--stretto">
      <p class="voce-indietro"><a class="indietro" href="${esc(c.vai(PERCORSO.diario(l)))}">${ICONE.indietro}${txt(c.t.diario.titolo)}</a></p>
      <header class="sezione-testa voce-testa">
        <p class="etichetta"><span class="etichetta-n">${txt(c.t.diario.voce)} ${numeroVoce(v)}</span><span class="etichetta-linea" aria-hidden="true"></span><time datetime="${v.data}">${dataLunga(l, v.data)}</time></p>
        <h1 id="t-voce">${txt(v.titolo[l])}</h1>
        <p class="sezione-sotto">${txt(v.sommario[l])}</p>
      </header>
      ${g ? `<figure class="voce-figura">${immagine(c, g.slug, g.immagini.copertina.file, { alt: g.immagini.copertina.alt[l], sizes: '(min-width: 1000px) 900px, 94vw', subito: true })}</figure>` : ''}
      <div class="racconto-testo quadro voce-testo">
        ${v.testo[l].map((p, i) => `<p class="${i === 0 ? 'racconto-primo' : ''}">${txt(p)}</p>`).join('\n        ')}
      </div>
      <div class="azioni voce-azioni">
        ${g ? `<a class="bottone bottone--pieno" href="${esc(c.vai(PERCORSO.gioco(l, g.slug)))}">${txt(c.t.diario.vaiAlGioco)}${ICONE.freccia}<span class="solo-lettori">: ${txt(g.nome)}</span></a>` : ''}
        ${condividi(c, v.titolo[l])}
      </div>
    </div>
  </article>

  ${altre.length ? `<section class="sezione sezione--stretta" aria-labelledby="t-altre">
    <div class="contenitore">
      <h2 class="titolo-blocco" id="t-altre" data-appari>${txt(c.t.diario.altre)}</h2>
      <ul class="voci voci--strette">
      ${altre.map(x => schedaVoce(c, x)).join('\n')}
      </ul>
    </div>
  </section>` : ''}`;
  const fileOg = g ? (g.immagini.condivisione || g.immagini.copertina.file) : null;
  const dOg = fileOg ? dimensioni(join(cartellaImg(g.slug), fileOg)) : null;
  const immagineOg = fileOg ? `${BASE}/assets/img/giochi/${g.slug}/${fileOg}` : `${BASE}/assets/img/condivisione.jpg`;
  pagina({
    c, percorso, alternative, corpo, classe: 'p-voce', attiva: 'diario', tipoOg: 'article', feed: PERCORSO.diario(l) + 'feed.xml',
    titolo: `${v.titolo[l]} — ${studio.nome}`, descrizione: v.sommario[l],
    og: fileOg ? { url: immagineOg, l: dOg.l, a: dOg.a, alt: g.immagini.copertina.alt[l] } : undefined,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: v.titolo[l], description: v.sommario[l],
      datePublished: v.data, inLanguage: l, url: c.assoluto(percorso), image: immagineOg,
      author: { '@type': 'Organization', name: studio.nome, url: BASE + '/' },
      publisher: { '@type': 'Organization', name: studio.nome, url: BASE + '/' },
    },
  });
}

// Dove porta il pulsante di una domanda: un indirizzo scritto per intero oppure una pagina del sito.
function destinazione(c, link) {
  if (link.url) return link.url;
  if (link.pagina.startsWith('gioco:')) return c.vai(PERCORSO.gioco(c.l, link.pagina.slice(6)));
  return c.vai(PERCORSO[link.pagina](c.l));
}

function paginaAssistenza(l) {
  const percorso = PERCORSO.assistenza(l);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.assistenza(x)]));
  const domanda = q => `<details class="domanda quadro" data-appari>
          <summary><span>${txt(q.domanda[l])}</span><i aria-hidden="true"></i></summary>
          <div class="risposta">
            ${q.risposta[l].map(p => `<p>${txt(p)}</p>`).join('')}
            ${q.link ? `<p><a class="bottone" href="${esc(destinazione(c, q.link))}">${txt(q.link.etichetta[l])}${ICONE.freccia}</a></p>` : ''}
          </div>
        </details>`;
  const gruppi = [
    { titolo: c.t.assistenza.generali, stile: '', classe: '', voci: faq.filter(q => !q.gioco) },
    ...giochi.map(g => ({ titolo: g.nome, stile: stileGioco(g), classe: classeTitolo(g), voci: faq.filter(q => q.gioco === g.slug) })),
  ].filter(x => x.voci.length);
  const corpo = `
  <section class="sezione sezione--prima" aria-labelledby="t-assistenza">
    <div class="contenitore">
      ${testaSezione(c, 1, c.t.assistenza.etichetta, c.t.assistenza.titolo, c.t.assistenza.sottotitolo, 't-assistenza').replace('<h2', '<h1').replace('</h2>', '</h1>')}
      <div class="domande">
      ${gruppi.map(x => `<section class="domande-gruppo"${x.stile}>
        <h2 class="titolo-blocco${x.classe}" data-appari>${txt(x.titolo)}</h2>
        ${x.voci.map(domanda).join('\n        ')}
      </section>`).join('\n      ')}
      </div>
    </div>
  </section>
  ${sezioneContatti(c, 2)}`;
  pagina({
    c, percorso, alternative, corpo, classe: 'p-assistenza', attiva: 'assistenza',
    titolo: c.t.meta.titoloAssistenza, descrizione: c.t.meta.descrizioneAssistenza,
    jsonld: faq.length ? {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map(q => ({ '@type': 'Question', name: q.domanda[l], acceptedAnswer: { '@type': 'Answer', text: q.risposta[l].join(' ') } })),
    } : null,
  });
}

// ── sala stampa: i file stanno in <uscita>/assets/stampa/studio e in <uscita>/assets/stampa/<slug del gioco>
const DIR_STAMPA = join(USCITA, 'assets', 'stampa');
const NOME_KIT = 'neobyte-studios-press-kit.zip';
const elencoStampa = cartella => {
  const d = join(DIR_STAMPA, cartella);
  return existsSync(d) ? readdirSync(d, { withFileTypes: true }).filter(f => f.isFile() && !/\.zip$/i.test(f.name)).map(f => f.name).sort() : [];
};
const peso = (l, byte) => {
  const kb = byte / 1024;
  const s = kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB';
  return l === 'it' ? s.replace('.', ',') : s;
};

// Uno zip scritto a mano (formato semplice, senza librerie). La data dei file è fissa: stessi file, stesso zip.
function creaZip(voci) {
  const GIORNO = ((2026 - 1980) << 9) | (1 << 5) | 1;
  const parti = [], indice = [];
  let posto = 0;
  for (const v of voci) {
    const nome = Buffer.from(v.nome, 'utf8');
    const stringi = /\.(svg|txt|json|md|xml)$/i.test(v.nome); // immagini e video sono già compressi
    const corpo = stringi ? deflateRawSync(v.dati, { level: 9 }) : v.dati;
    const somma = crc32(v.dati);
    const testa = Buffer.alloc(30);
    testa.writeUInt32LE(0x04034b50, 0); testa.writeUInt16LE(20, 4); testa.writeUInt16LE(0x0800, 6); testa.writeUInt16LE(stringi ? 8 : 0, 8);
    testa.writeUInt16LE(0, 10); testa.writeUInt16LE(GIORNO, 12); testa.writeUInt32LE(somma, 14);
    testa.writeUInt32LE(corpo.length, 18); testa.writeUInt32LE(v.dati.length, 22); testa.writeUInt16LE(nome.length, 26);
    const riga = Buffer.alloc(46);
    riga.writeUInt32LE(0x02014b50, 0); riga.writeUInt16LE(20, 4); riga.writeUInt16LE(20, 6); riga.writeUInt16LE(0x0800, 8); riga.writeUInt16LE(stringi ? 8 : 0, 10);
    riga.writeUInt16LE(0, 12); riga.writeUInt16LE(GIORNO, 14); riga.writeUInt32LE(somma, 16);
    riga.writeUInt32LE(corpo.length, 20); riga.writeUInt32LE(v.dati.length, 24); riga.writeUInt16LE(nome.length, 28); riga.writeUInt32LE(posto, 42);
    parti.push(testa, nome, corpo);
    indice.push(riga, nome);
    posto += 30 + nome.length + corpo.length;
  }
  const centro = Buffer.concat(indice);
  const fine = Buffer.alloc(22);
  fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10); fine.writeUInt32LE(centro.length, 12); fine.writeUInt32LE(posto, 16);
  return Buffer.concat([...parti, centro, fine]);
}

// Il testo che accompagna lo zip: descrizioni in italiano e in inglese, prese dai dati.
function testoKit() {
  const righe = [`${studio.nome} — press kit`, BASE + '/', `${testi.it.stampa.contatto} / ${testi.en.stampa.contatto}: ${studio.email.contatti}`, ''];
  for (const l of LINGUE) {
    const t = testi[l];
    righe.push(l === 'it' ? '=== ITALIANO ===' : '=== ENGLISH ===', '', studio.nome.toUpperCase(), ...t.studio.testo, '');
    for (const g of giochi) {
      const store = NEGOZI.filter(n => g.store?.[n.chiave]).map(n => `${t.store.disponibileSu} ${n.nome}: ${g.store[n.chiave]}`);
      const presto = NEGOZI.filter(n => !g.store?.[n.chiave] && (g.inArrivoSu || []).includes(n.chiave)).map(n => `${t.store.prestoSu} ${n.nome}`);
      righe.push(g.nome.toUpperCase(), g.motto[l], '', ...g.descrizione[l], '',
        `${t.gioco.genere}: ${g.generi[l].join(', ')}`, `${t.gioco.piattaforme}: ${g.piattaforme.map(p => t.piattaforme[p]).join(', ')}`,
        `${t.gioco.stato}: ${t.stato[g.stato]}`, ...store, ...presto, `${t.stampa.pagina}: ${BASE}/${PERCORSO.gioco(l, g.slug)}`, '');
    }
    righe.push(t.stampa.uso, '');
  }
  return apostrofi(righe.join('\r\n'));
}

function costruisciKit() {
  const voci = [];
  for (const cartella of ['studio', ...giochi.map(g => g.slug)]) for (const f of elencoStampa(cartella)) voci.push({ nome: `${cartella}/${f}`, dati: readFileSync(join(DIR_STAMPA, cartella, f)) });
  if (!voci.length) return 0;
  voci.unshift({ nome: 'LEGGIMI-README.txt', dati: Buffer.from('﻿' + testoKit(), 'utf8') });
  const zip = creaZip(voci);
  writeFileSync(join(DIR_STAMPA, NOME_KIT), zip);
  return zip.length;
}

function paginaStampa(l, pesoKit) {
  const percorso = PERCORSO.stampa(l);
  const c = contesto(l, percorso);
  const alternative = Object.fromEntries(LINGUE.map(x => [x, PERCORSO.stampa(x)]));
  const ts = c.t.stampa;
  const base = `${c.p}assets/stampa/`;
  const elencoFile = cartella => {
    const nomi = elencoStampa(cartella);
    return nomi.length ? `<h3 class="titolo-piccolo">${txt(ts.file)}</h3>
        <ul class="file">
          ${nomi.map(n => `<li><a href="${esc(base + cartella + '/' + encodeURIComponent(n))}" download><span class="file-nome">${esc(n)}</span><span class="file-peso">${esc(n.split('.').pop().toUpperCase())} · ${peso(l, statSync(join(DIR_STAMPA, cartella, n)).size)}</span>${ICONE.scarica}<span class="solo-lettori"> — ${txt(ts.scarica)}</span></a></li>`).join('\n          ')}
        </ul>` : '';
  };
  const copia = id => `<button type="button" class="tasto-piccolo" data-copia="${id}" data-fatto="${txt(ts.copiato)}" hidden>${ICONE.copia}<span>${txt(ts.copia)}</span></button>`;
  const loghi = elencoStampa('studio').filter(n => /\.svg$/i.test(n));
  const corpo = `
  <section class="sezione sezione--prima" aria-labelledby="t-stampa">
    <div class="contenitore">
      ${testaSezione(c, 1, ts.etichetta, ts.titolo, ts.sottotitolo, 't-stampa').replace('<h2', '<h1').replace('</h2>', '</h1>')}
      ${pesoKit ? `<div class="kit quadro" data-appari>
        <div><strong class="titolo-blocco">${txt(ts.kitTitolo || ts.scaricaTutto)}</strong><p class="nota">${txt(ts.zipNota)} ZIP · ${peso(l, pesoKit)}</p></div>
        <a class="bottone bottone--pieno" href="${esc(base + NOME_KIT)}" download>${txt(ts.scaricaTutto)}${ICONE.scarica}</a>
      </div>` : ''}
      <p class="nota stampa-uso" data-appari>${txt(ts.uso)} ${txt(ts.contatto)}: <a href="mailto:${esc(studio.email.contatti)}">${esc(studio.email.contatti)}</a></p>
    </div>
  </section>

  <section class="sezione sezione--stretta" aria-labelledby="t-st-studio">
    <div class="contenitore fondo-gioco">
      <div class="fondo-colonna quadro" data-appari>
        <h2 class="titolo-blocco" id="t-st-studio">${txt(ts.studio)}</h2>
        <dl class="scheda-dati">
          <div><dt>${txt(ts.nome)}</dt><dd>${esc(studio.nome)}</dd></div>
          <div><dt>${txt(ts.tipo)}</dt><dd>${txt(ts.tipoValore)}</dd></div>
          <div><dt>${txt(ts.paese)}</dt><dd>${txt(ts.paeseValore)}</dd></div>
          <div><dt>${txt(ts.sito)}</dt><dd>${esc(BASE.replace(/^https?:\/\//, ''))}</dd></div>
          <div><dt>${txt(ts.contatto)}</dt><dd><a href="mailto:${esc(studio.email.contatti)}">${esc(studio.email.contatti)}</a></dd></div>
        </dl>
        <h3 class="titolo-piccolo">${txt(ts.descrizione)}</h3>
        <div class="stampa-testo" id="st-studio">${c.t.studio.testo.map(p => `<p>${txt(p)}</p>`).join('')}</div>
        ${copia('st-studio')}
      </div>
      <div class="fondo-colonna quadro" data-appari>
        <h2 class="titolo-blocco">${txt(ts.logo)}</h2>
        <p class="nota">${txt(ts.logoNota)}</p>
        ${loghi.length ? `<ul class="loghi">${loghi.map(n => `<li><img src="${esc(base + 'studio/' + encodeURIComponent(n))}" alt="" loading="lazy" decoding="async"></li>`).join('')}</ul>` : ''}
        ${elencoFile('studio')}
      </div>
    </div>
  </section>

  ${giochi.map((g, i) => `<section class="sezione sezione--stretta"${stileGioco(g)} aria-labelledby="t-st-${g.slug}">
    <div class="contenitore">
      <div class="blocco-testa" data-appari><p class="vetta-sopra">${etichettaStato(c, g)}<span class="vetta-evidenza">${txt(c.t.giochi.mondo)} ${numeroMondo(g)}</span></p><h2 class="stampa-nome${classeTitolo(g)}" id="t-st-${g.slug}">${txt(g.nome)}</h2></div>
    </div>
    <div class="contenitore fondo-gioco">
      <div class="fondo-colonna quadro" data-appari>
        <h3 class="titolo-piccolo titolo-piccolo--primo">${txt(ts.descrizione)}</h3>
        <div class="stampa-testo" id="st-${g.slug}"><p><strong>${txt(g.motto[l])}</strong></p>${g.descrizione[l].map(p => `<p>${txt(p)}</p>`).join('')}</div>
        ${copia('st-' + g.slug)}
      </div>
      <div class="fondo-colonna quadro" data-appari>
        <h3 class="titolo-piccolo titolo-piccolo--primo">${txt(c.t.gioco.scheda)}</h3>
        <dl class="scheda-dati">
          <div><dt>${txt(c.t.gioco.genere)}</dt><dd>${txt(g.generi[l].join(', '))}</dd></div>
          <div><dt>${txt(c.t.gioco.piattaforme)}</dt><dd>${txt(g.piattaforme.map(p => c.t.piattaforme[p]).join(', '))}</dd></div>
          <div><dt>${txt(c.t.gioco.stato)}</dt><dd>${txt(c.t.stato[g.stato])}</dd></div>
          <div><dt>${txt(ts.pagina)}</dt><dd><a href="${esc(c.vai(PERCORSO.gioco(l, g.slug)))}">${esc(BASE.replace(/^https?:\/\//, '') + '/' + PERCORSO.gioco(l, g.slug))}</a></dd></div>
        </dl>
        ${elencoFile(g.slug)}
      </div>
    </div>
  </section>`).join('\n\n  ')}`;
  pagina({ c, percorso, alternative, corpo, classe: 'p-stampa', attiva: 'stampa', titolo: c.t.meta.titoloStampa, descrizione: c.t.meta.descrizioneStampa });
}

function pagina404() {
  const c = contesto('it', '', true);
  const alternative = { it: '', en: 'en/' };
  const corpo = `
  <section class="sezione sezione--prima errore">
    <div class="contenitore">
      <p class="errore-codice" aria-hidden="true">404</p>
      <p class="etichetta">${txt(testi.it.giochi.prossimoEtichetta)}</p>
      <h1>${txt(testi.it.errore.titolo)}</h1>
      <p class="sezione-sotto">${txt(testi.it.errore.testo)}</p>
      <p><a class="bottone bottone--pieno" href="/">${txt(testi.it.errore.azione)}${ICONE.freccia}</a></p>
      <p><button type="button" class="bottone" data-navicella hidden>${txt(testi.it.errore.gioca)}</button></p>
      <div lang="en" class="errore-en">
        <p><strong>${txt(testi.en.errore.titolo)}</strong> ${txt(testi.en.errore.testo)}</p>
        <p><a class="bottone" href="/en/">${txt(testi.en.errore.azione)}${ICONE.freccia}</a></p>
      </div>
    </div>
  </section>`;
  pagina({ c, percorso: '404.html', alternative, corpo, classe: 'p-errore', titolo: testi.it.meta.titolo404, descrizione: testi.it.errore.testo, indicizza: false, file: '404.html' });
}

// ───────────────────────── costruzione ─────────────────────────

const pesoKit = costruisciKit();
for (const l of LINGUE) {
  paginaHome(l);
  paginaGiochi(l);
  for (const g of giochi) paginaGioco(l, g);
  if (diario.length) { paginaDiario(l); for (const v of diario) paginaVoce(l, v); }
  paginaAssistenza(l);
  paginaStampa(l, pesoKit);
}
pagina404();

writeFileSync(join(USCITA, 'manifest.webmanifest'), JSON.stringify({
  name: studio.nome, short_name: studio.nome.split(' ')[0], start_url: '/', display: 'browser',
  background_color: '#03040b', theme_color: '#03040b',
  icons: [{ src: '/assets/img/icona-180.png', sizes: '180x180', type: 'image/png' }, { src: '/assets/img/icona-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 1) + '\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pagineSitemap.map(p => `  <url>
    <loc>${esc(`${BASE}/${p.percorso}`)}</loc>
${LINGUE.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(`${BASE}/${p.alternative[l]}`)}"/>`).join('\n')}
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(USCITA, 'sitemap.xml'), sitemap);
writeFileSync(join(USCITA, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

// Pagine di giochi che non sono più nei dati: non le cancello, le segnalo.
for (const [cartella, etichetta, validi, cosa] of [[join(USCITA, 'giochi'), 'giochi', slugVisti, 'un gioco che non è più in giochi.json'], [join(USCITA, 'en', 'games'), 'en/games', slugVisti, 'un gioco che non è più in giochi.json'], [join(USCITA, 'diario'), 'diario', slugVoci, 'una voce che non è più in diario.json'], [join(USCITA, 'en', 'log'), 'en/log', slugVoci, 'una voce che non è più in diario.json']]) {
  if (!existsSync(cartella)) continue;
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    if (voce.isDirectory() && !validi.has(voce.name)) avviso(`la cartella ${etichetta}/${voce.name} è di ${cosa}: se non serve, spostala nel Cestino`);
  }
}
const segnaposto = JSON.stringify(studio).match(/\[[^\]"]+\]/g) || [];

console.log(`Sito costruito in ${USCITA}`);
console.log(`  ${giochi.length} ${giochi.length === 1 ? 'gioco' : 'giochi'}, ${diario.length} ${diario.length === 1 ? 'voce' : 'voci'} del diario, ${faq.length} domande, ${scritti.length} pagine, 2 lingue.`);
for (const a of avvisi) console.log('  Avviso: ' + a);
if (segnaposto.length) console.log(`  Da compilare prima di pubblicare (dati/studio.json): ${[...new Set(segnaposto)].join(', ')}`);
