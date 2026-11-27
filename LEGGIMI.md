# Sito di NeoByte Studios

Sito statico (HTML, CSS e JavaScript puri, nessun pacchetto da installare, nessuna libreria esterna). Le pagine si costruiscono dai dati con un solo comando. **Stato: locale, non pubblicato.**

Aspetto attuale (versione 2): **spazio**. Sfondo con nebulosa e stelle in volo, salto nell'iperspazio quando si cambia pagina, ogni gioco è un pianeta sulla «Mappa dei mondi», interfaccia da plancia di comando.

## Aprirlo in locale

```
cd C:\Users\jetmi\Progetti\neobyte-sito
python -m http.server 8791 --directory sito
```

Poi apri `http://127.0.0.1:8791/` (italiano) o `http://127.0.0.1:8791/en/` (inglese). Serve il piccolo server: con il doppio clic sui file i link tra le pagine non funzionano.

## Cosa c'è nella cartella

| Percorso | A cosa serve |
|---|---|
| `dati/giochi.json` | **Il catalogo: un elemento per gioco.** È l'unico file da toccare per aggiungere un gioco. |
| `dati/studio.json` | Nome, indirizzo del sito, email, dati legali del piè di pagina, link social. |
| `dati/testi.json` | Tutti i testi dello studio e dell'interfaccia, in italiano e in inglese. |
| `dati/diario.json` | Le voci del «Diario di bordo» (novità). Facoltativo: senza questo file il diario non compare. |
| `dati/faq.json` | Le domande frequenti della pagina «Assistenza». Facoltativo. |
| `sito/assets/stampa/` | I file della sala stampa: `studio/` (logo) e una cartella per gioco, con il nome dello slug. |
| `logo/` | Il logo in SVG. Quello scelto è il numero 3, «Rotta N» (`logo-3-rotta-n-simbolo.svg` e `logo-3-rotta-n-completo.svg`): è quello usato in tutto il sito. Le proposte 1, 2 e 4 restano qui ma non sono usate. |
| `costruisci.mjs` | Legge i dati e scrive in `sito/` le pagine, la sitemap, i feed del diario, il manifest e lo zip della sala stampa. Solo Node, nessuna dipendenza. |
| `strumenti/immagini.py` | Riduce un'immagine in WebP (versione grande + piccola). |
| `strumenti/loghi.py` | Rigenera gli SVG della cartella `logo/` (serve solo se si ridisegna il logo). |
| `strumenti/icone.py` | Rifà con il logo scelto `favicon.svg`, le due icone e le anteprime per i social (dello studio e di un gioco). |
| `strumenti/sala-stampa.py` | Prepara i file della sala stampa: logo dello studio e immagini di un gioco. |
| `strumenti/_comune.py`, `strumenti/modelli/` | Parti usate da `icone.py` e `sala-stampa.py`: il nome del logo scelto e le pagine che vengono fotografate. |
| `sito/` | **La cartella da pubblicare.** Pagine generate + `assets/` (CSS, JS, font, immagini). |
| `anteprima/` | Foto del sito fatte durante la verifica. Quelle con `-v3` sono del sito di adesso ma con il marchio di prima, il pianeta (le `-v2` sono di prima delle pagine nuove): sono pagine intere cucite una schermata sotto l'altra, quindi lo sfondo (che nel sito resta fermo dietro) lì si ripete a ogni schermata. `home-salto-v2.png` mostra il salto nell'iperspazio, `menu-telefono-v3.png` il menu aperto, `mini-gioco-v3.png` il mini-gioco, `logo-proposte-v2.png` le 4 proposte di logo. Le foto con `-v3b` sono le principali rifatte con il logo «Rotta N». |

Pagine generate: `/` e `/en/` (home), `/giochi/` e `/en/games/` (mappa dei mondi), `/giochi/<slug>/` e `/en/games/<slug>/` (una per gioco), `404.html`, `sitemap.xml`, `robots.txt`.

## Aggiungere un gioco

1. **Immagini** in `sito/assets/img/giochi/<slug>/`. Per ridurle:
   `python strumenti/immagini.py C:\percorso\originale.png sito/assets/img/giochi/<slug>/copertina.webp`
   (crea `copertina.webp` e `copertina.s.webp`; la piccola viene usata da sola sugli schermi piccoli).
2. **Un elemento nuovo** in `dati/giochi.json`: copia quello di Sigilli e cambia i valori. Campi:
   - obbligatori: `slug` (minuscolo con trattini), `nome`, `stato` (`in-sviluppo`, `in-arrivo`, `disponibile`), `motto`, `descrizioneBreve`, `descrizione`, `generi` (ognuno con `it` e `en`), `piattaforme` (`android`, `ios`, `pc`, `mac`, `linux`, `web`, `console`), `immagini.copertina`;
   - facoltativi: `inEvidenza` (il mondo grande in home), `tema.accento` (colore del gioco), `tema.fontTitolo` (`"cinzel"`), `numeri`, `punti`, `scheda`, `note`, `immagini.icona`, `immagini.personaggio`, `immagini.condivisione` (1200×630 per i social), `immagini.schermate`, `immagini.vetrina`, `immagini.sequenza`, `trailer` (link YouTube o file video), `store`, `inArrivoSu`, `legali`.
3. **Costruisci:** `node costruisci.mjs`. Se manca qualcosa (un testo in inglese, un'immagine, un link scritto male) si ferma e dice che cosa correggere.

Non si tocca nessun file HTML: le pagine si rigenerano da sole.

**Come un gioco diventa un pianeta.** Non serve niente in più: il pianeta è la `copertina` del gioco dentro una sfera, l'alone e le orbite prendono `tema.accento`, e se c'è `immagini.personaggio` (figura ritagliata, senza sfondo) compare davanti al pianeta. Nella pagina del gioco la copertina si rivede intera sotto, come «Vista dalla superficie»: lì ogni gioco tiene la sua grafica com'è. Il numero «Mondo 01, 02…» segue l'ordine in `giochi.json`.

### Store e stato

- `store`: `googlePlay`, `appStore`, `steam`, `epic`, `itch` (un link `https://…` ciascuno) e `altro` (elenco di `{ "nome": "GOG", "url": "https://…" }`). **Il pulsante compare solo se il link c'è.**
- `inArrivoSu`: per esempio `["googlePlay"]`. Senza link compare l'etichetta «Presto su Google Play», non cliccabile. Quando metti il link, diventa da sola un pulsante.
- `stato: "disponibile"` vuole almeno un link di store, altrimenti la costruzione si ferma.

**Quando Sigilli esce su Google Play:** in `dati/giochi.json` metti il link in `store.googlePlay`, cambia `stato` in `"disponibile"`, poi `node costruisci.mjs`.

### Pagine legali del gioco

`legali.privacy`, `legali.termini`, `legali.eliminazioneAccount` accettano:
- un indirizzo esterno `https://…` (com'è ora per Sigilli, sulla VPS);
- oppure un percorso del sito, per esempio `/giochi/sigilli-dell-eclisse/privacy/`. In quel caso la pagina va messa in `sito/giochi/sigilli-dell-eclisse/privacy/index.html` (la costruzione controlla che esista e non la tocca).

## Le pagine in più (v3)

Tutto in italiano e in inglese, tutto dai file dati. Menu: Giochi, Diario, Missione, Assistenza, Stampa; sotto i 900 px c'è il pulsante «Menu» che apre un pannello (senza JavaScript porta ai link in fondo alla pagina).

### Diario di bordo (`/diario/`, `/en/log/`)

Ogni voce di `dati/diario.json` diventa una pagina, compare nell'elenco, nella home (le ultime 3) e nel feed RSS (`/diario/feed.xml`, `/en/log/feed.xml`). Per aggiungerne una:

```json
{
  "slug": "nome-della-voce",
  "data": "2026-12-01",
  "gioco": "sigilli-dell-eclisse",
  "titolo": { "it": "…", "en": "…" },
  "sommario": { "it": "…", "en": "…" },
  "testo": { "it": ["primo paragrafo", "secondo"], "en": ["first paragraph", "second"] }
}
```

`gioco` è facoltativo: se c'è, la voce prende la copertina e il colore di quel gioco, ha il pulsante verso la sua pagina e compare anche lì («Dal diario di bordo»). L'ordine lo dà la data, dalla più recente. Poi `node costruisci.mjs`.

### Assistenza (`/assistenza/`, `/en/support/`)

Domande e risposte da `dati/faq.json`, più i contatti. Una domanda con `"gioco": "slug"` finisce nel gruppo di quel gioco, le altre in «Domande generali». Il pulsante sotto la risposta è facoltativo: `"link": { "etichetta": {…}, "pagina": "giochi" }` (valgono `home`, `giochi`, `diario`, `assistenza`, `stampa`, `gioco:slug`) oppure `"url": "https://…"` o `"mailto:…"`.

### Sala stampa (`/stampa/`, `/en/press/`)

Mostra la scheda dello studio, le descrizioni dei giochi (con «Copia il testo») e i file da scaricare. I file si mettono a mano in `sito/assets/stampa/studio/` e in `sito/assets/stampa/<slug del gioco>/`: la costruzione li elenca da sola e crea `neobyte-studios-press-kit.zip` con tutto dentro, più un testo con le descrizioni nelle due lingue. I file di Sigilli e il logo sono stati preparati con `strumenti/sala-stampa.py` (vedi «Logo e strumenti»).

### Mappa stellare, mini-gioco, suono

- **Mappa stellare** (pagina «Giochi»): ogni gioco è un pianeta sulla sua orbita, le orbite libere restano vuote. Si riempie da sola da `giochi.json` (fino a 4 pianeti).
- **Mini-gioco nascosto** «Rotta di rientro» (`assets/js/navicella.js`, si carica solo quando serve): pulsante nella pagina 404; oppure si scrive `neobyte` sulla tastiera; oppure cinque tocchi veloci sul motto in fondo alla pagina. I suoi testi sono dentro lo script.
- **Suono d'ambiente**: il tasto tondo in basso a destra. È spento finché non lo si accende; nessun file audio, il suono nasce nel browser.
- **Condividi** (pagina del gioco e voci del diario), **Torna su** (piè di pagina) e scorrimento col dito nella galleria delle schermate.
- **Trailer**: basta compilare `trailer` nel gioco (link di YouTube o file video nella cartella delle sue immagini).

## Lo sfondo: tre livelli

Lo sfondo è fatto in WebGL dentro `sito/assets/js/sito.js`, senza librerie. Il sito sceglie da solo il livello:

| Livello | Quando | Cosa si vede |
|---|---|---|
| pieno | computer | nebulosa viva, stelle in volo che seguono mouse e scorrimento, salto nell'iperspazio |
| medio | telefoni e tablet | immagine ferma della nebulosa + stelle in volo e salto |
| leggero | «riduci movimento», risparmio dati, dispositivi deboli, niente WebGL | solo l'immagine ferma (`assets/img/cosmo.webp`), nessuna animazione continua |

Senza JavaScript resta lo sfondo fermo e le pagine si leggono lo stesso. Se il dispositivo non regge (fotogrammi lenti), il sito scende di livello da solo. Per provarli a mano: aggiungi all'indirizzo `?cosmo=pieno`, `?cosmo=medio` o `?cosmo=leggero`; `?lento=1` (o `2`) finge un dispositivo lento e fa vedere la discesa di uno (o due) livelli; `?salto=1` tiene fermo il salto nell'iperspazio.

La nebulosa ha un tetto di luminosità scritto nello sfondo stesso: il testo chiaro sopra resta sempre oltre il contrasto 4,5 a 1.

## Segnaposto da compilare prima di pubblicare

Tutti in `dati/studio.json`, sezione `legale` (la costruzione li ricorda a ogni giro):

- `[TITOLARE DELLA DITTA]` — nome del titolare della ditta individuale
- `[INDIRIZZO]` — sede
- `[P.IVA]` — partita IVA (compilata: 03297110219; il numero REA è in `dati/studio.json`)

Compaiono nel piè di ogni pagina. Altre cose da confermare:

- `urlSito` in `studio.json` (ora `https://neobytestudios.com`): entra nei link per i social e nella sitemap.
- `email.contatti` (ora `support@neobytestudios.com`, preso dai Termini di Sigilli) e `email.privacy`.
- `social` in `studio.json`: vuoti; un link compilato compare da solo nel piè di pagina.
- La frase «Questo sito non usa cookie né strumenti di tracciamento» (`testi.json` → `piede.cookie`): è vera finché non si aggiungono statistiche o video incorporati di terzi. Il trailer di YouTube si carica solo dopo il tocco. Sul dispositivo di chi visita restano solo due preferenze (`localStorage`): suono acceso o spento e record del mini-gioco; non vanno a nessun server.
- **Da approvare nella v3:** il testo della prima voce del diario, le risposte di `faq.json` e la frase sull'uso dei materiali nella sala stampa (`testi.json` → `stampa.uso`).
- **Provvisori, da approvare:** il motto «Ogni gioco è un mondo. Noi li costruiamo.» e i testi dello studio in `testi.json`. Il logo invece è scelto: è la proposta 3, «Rotta N».

## Logo e strumenti

Il logo è «Rotta N» (`logo/logo-3-rotta-n-…`). Nel sito sta in questi posti:

| Dove | Come si rifà |
|---|---|
| Testata e piè di pagina | È disegnato dentro `marchio()` in `costruisci.mjs` (stessi numeri del file `…-simbolo.svg`, con i nomi delle sfumature `m-a` e `m-b`). |
| `favicon.svg`, `icona-180.png`, `icona-512.png`, `condivisione.jpg`, `condivisione-it.jpg`, `condivisione-en.jpg` | `python strumenti/icone.py` |
| Anteprima social di un gioco (`giochi/<slug>/condivisione.jpg`) | `python strumenti/icone.py gioco <slug>` (esempio completo sotto la tabella) |
| Logo nella sala stampa (2 SVG e 2 PNG in `sito/assets/stampa/studio/`) | `python strumenti/sala-stampa.py` |
| Immagini di un gioco nella sala stampa | `python strumenti/sala-stampa.py gioco sigilli-dell-eclisse sigilli C:\cartella\degli\screenshot` (la cartella è facoltativa: sono gli screenshot originali, quelli di Sigilli erano in `sigilli-2\work\store-screenshot`) |
| Zip «press kit» | Lo rifà `node costruisci.mjs` |

Esempio per l'anteprima di Sigilli (la barra dritta nel titolo dice dove andare a capo; il titolo si può anche non mettere):

```
python strumenti/icone.py gioco sigilli-dell-eclisse "Sigilli|dell’Eclisse"
```

Tutti i comandi si lanciano dalla cartella del progetto, e alla fine va lanciato `node costruisci.mjs`. Per passare a un altro logo: cambiare `LOGO` in `strumenti/_comune.py`, lanciare `icone.py` e `sala-stampa.py`, e ridisegnare `marchio()`.

Cosa serve: Python con Pillow (e fontTools per `loghi.py`) e Chrome installato, tutti già presenti sul PC. `icone.py` e `sala-stampa.py` aprono Chrome senza finestra, con un profilo temporaneo loro, per fotografare le pagine di `strumenti/modelli/`: non toccano il Chrome aperto. Nessuno script installa qualcosa o va in rete.

## Note

- La costruzione **non cancella mai niente**. Se togli un gioco o una voce del diario dai dati, avvisa che la sua cartella è rimasta: spostala tu nel Cestino.
- Font: Syncopate (titoli, licenza Apache 2.0), Space Grotesk (testo), JetBrains Mono (scritte da plancia) e Cinzel (titolo di Sigilli), questi tre con licenza SIL Open Font. I file di licenza sono accanto ai font in `sito/assets/font/`. Sono dentro il sito: nessuna richiesta a server esterni.
- Immagini dello studio in `sito/assets/img/`: `favicon.svg`, `icona-180.png`, `icona-512.png`, `condivisione.jpg`, `condivisione-it.jpg` e `condivisione-en.jpg` (anteprime per i social), `cosmo.webp` (lo sfondo fermo).
- Logo in `logo/`: per ogni numero un file `…-simbolo.svg` (solo il simbolo) e uno `…-completo.svg` (simbolo e scritta, già in tracciati: non serve il font). Sono fatti per fondi scuri.
