# Pubblicare il sito

Il sito sta nell'archivio GitHub **Megazeus23/neobyte-sito** (pubblico). A ogni `git push` sul ramo `main`, GitHub pubblica da solo la cartella `sito/` su GitHub Pages (flusso `.github/workflows/pagine.yml`, circa un minuto). La cartella `anteprima/` resta solo sul PC.

## Aggiornare il sito

Dalla cartella `C:\Users\jetmi\Progetti\neobyte-sito`:

```
node costruisci.mjs
git add -A
git commit -m "Cosa è cambiato"
git push
```

Esito della pubblicazione: `gh run list --limit 1` (oppure `gh run watch`), o la scheda «Actions» dell'archivio su GitHub.

Le tre pagine legali di Sigilli (`sito/giochi/sigilli-dell-eclisse/privacy|termini|elimina-account/`) non le rigenera `costruisci.mjs`: se cambia il testo in `sigilli-2/client`, vanno aggiornate a mano.

## Dominio

Su GitHub Pages il dominio personalizzato è `neobytestudios.com`. Il sito si vede su quell'indirizzo solo dopo il cambio dei record DNS su Squarespace (Domini → neobytestudios.com → DNS):

| Tipo | Nome | Oggi | Da mettere |
|---|---|---|---|
| A | @ | 216.198.79.1 | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (quattro record) |
| CNAME | www | cname.vercel-dns.com | megazeus23.github.io |

Da **non** toccare: il record MX (`smtp.google.com`, posta Google) e i TXT (`v=spf1 …` e `google-site-verification=…`).

Dopo il cambio (da pochi minuti a qualche ora): Settings → Pages dell'archivio, quando il controllo del dominio è verde attivare «Enforce HTTPS» (oppure `gh api -X PUT repos/Megazeus23/neobyte-sito/pages -F https_enforced=true`).
