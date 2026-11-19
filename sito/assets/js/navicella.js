/* NeoByte Studios — «Rotta di rientro», il mini-gioco nascosto del sito.
   Si carica solo quando qualcuno lo apre (pulsante nella pagina 404, parola «neobyte» sulla tastiera,
   cinque tocchi veloci sul motto in fondo alla pagina). Niente librerie: una tela 2D.
   Il record resta solo su questo dispositivo (localStorage «nb-record»). */
(() => {
  'use strict';
  const it = document.documentElement.lang !== 'en';
  const T = it
    ? { titolo: 'Rotta di rientro', regole: 'Guida la navicella con il dito, il mouse o le frecce. Evita i detriti, raccogli i byte.', parti: 'Parti', ancora: 'Riprova', chiudi: 'Chiudi', punti: 'Punti', scudi: 'Scudi', record: 'Record', fine: 'Segnale perso', nuovo: 'Nuovo record!' }
    : { titolo: 'Re-entry route', regole: 'Steer the ship with your finger, the mouse or the arrow keys. Dodge the debris, collect the bytes.', parti: 'Launch', ancora: 'Try again', chiudi: 'Close', punti: 'Score', scudi: 'Shields', record: 'Best', fine: 'Signal lost', nuovo: 'New best!' };
  const leggiRecord = () => { try { return Number(localStorage.getItem('nb-record')) || 0; } catch (e) { return 0; } };
  const scriviRecord = v => { try { localStorage.setItem('nb-record', String(v)); } catch (e) { /* senza memoria si gioca lo stesso */ } };

  let finestra, tela, c, hud, pannello;
  let larga = 0, alta = 0, scala = 1, giro = 0, prima = 0;
  let stato = 'attesa', punti = 0, scudi = 3, tempo = 0, record = leggiRecord(), salvo = 0, prossimo = 0, prossimoByte = 0;
  const nave = { x: 0, y: 0, mira: 0 };
  const tasti = { sinistra: false, destra: false };
  let cose = [], stelle = [], scintille = [];

  const misura = () => {
    scala = Math.min(devicePixelRatio || 1, 2);
    larga = tela.clientWidth; alta = tela.clientHeight;
    tela.width = Math.round(larga * scala); tela.height = Math.round(alta * scala);
    nave.y = alta * 0.8;
    if (!nave.x) { nave.x = nave.mira = larga / 2; }
    nave.mira = Math.min(larga - 20, Math.max(20, nave.mira));
    stelle = Array.from({ length: Math.round(Math.min(140, larga * alta / 6000)) }, () => ({ x: Math.random() * larga, y: Math.random() * alta, v: 0.3 + Math.random() * 1.4 }));
  };

  const scriviHud = () => { hud.innerHTML = `<span>${T.punti} <b>${Math.floor(punti)}</b></span><span>${T.scudi} <b>${'◆'.repeat(Math.max(0, scudi)) || '—'}</b></span><span>${T.record} <b>${Math.max(record, Math.floor(punti))}</b></span>`; };

  const mostraPannello = (titolo, testo, tasto) => {
    pannello.innerHTML = `<h2>${titolo}</h2><p>${testo}</p><button type="button" class="bottone bottone--pieno" data-via>${tasto}</button>`;
    pannello.hidden = false;
    pannello.querySelector('[data-via]').focus();
  };

  const parti = () => {
    stato = 'gioco'; punti = 0; scudi = 3; tempo = 0; salvo = 0; prossimo = 0.6; prossimoByte = 1.5;
    cose = []; scintille = [];
    nave.x = nave.mira = larga / 2;
    pannello.hidden = true;
    scriviHud();
  };

  const finisci = () => {
    stato = 'fine';
    const totale = Math.floor(punti), meglio = totale > record;
    if (meglio) { record = totale; scriviRecord(record); }
    mostraPannello(T.fine, `${T.punti}: <strong>${totale}</strong> · ${T.record}: <strong>${record}</strong>${meglio ? ` — ${T.nuovo}` : ''}`, T.ancora);
  };

  const scoppio = (x, y, colore, quante) => { for (let i = 0; i < quante; i++) { const a = Math.random() * 6.283, v = 40 + Math.random() * 160; scintille.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: 0.5 + Math.random() * 0.4, colore }); } };

  const aggiorna = dt => {
    tempo += dt;
    const corsa = 150 + Math.min(330, tempo * 7); // i detriti scendono sempre più in fretta
    if (tasti.sinistra) nave.mira -= 520 * dt;
    if (tasti.destra) nave.mira += 520 * dt;
    nave.mira = Math.min(larga - 20, Math.max(20, nave.mira));
    nave.x += (nave.mira - nave.x) * Math.min(1, dt * 14);
    salvo = Math.max(0, salvo - dt);
    punti += dt * 10;

    prossimo -= dt;
    if (prossimo <= 0) {
      prossimo = Math.max(0.2, 0.95 - tempo * 0.014) * (0.6 + Math.random() * 0.8) * Math.min(1.6, 700 / Math.max(320, larga) + 0.5);
      const r = 12 + Math.random() * 22;
      cose.push({ tipo: 'detrito', x: r + Math.random() * (larga - 2 * r), y: -r, r, vx: (Math.random() - 0.5) * 60, vy: corsa * (0.8 + Math.random() * 0.5), giro: Math.random() * 6, vg: (Math.random() - 0.5) * 2.4, lati: Array.from({ length: 8 }, () => 0.7 + Math.random() * 0.3) });
    }
    prossimoByte -= dt;
    if (prossimoByte <= 0) {
      prossimoByte = 1.1 + Math.random() * 1.6;
      cose.push({ tipo: 'byte', x: 24 + Math.random() * (larga - 48), y: -12, r: 9, vx: 0, vy: corsa * 0.7, giro: 0, vg: 2 });
    }
    for (const o of cose) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.giro += o.vg * dt;
      const d = Math.hypot(o.x - nave.x, o.y - nave.y);
      if (o.tipo === 'byte' && d < o.r + 20) { o.via = true; punti += 25; scoppio(o.x, o.y, '#7fe0ff', 8); }
      if (o.tipo === 'detrito' && !salvo && d < o.r * 0.82 + 12) { o.via = true; scudi--; salvo = 1.2; scoppio(o.x, o.y, '#ffb36b', 18); if (scudi <= 0) finisci(); }
      if (o.y > alta + 50) o.via = true;
    }
    cose = cose.filter(o => !o.via);
    for (const s of scintille) { s.x += s.vx * dt; s.y += s.vy * dt; s.vita -= dt; }
    scintille = scintille.filter(s => s.vita > 0);
    scriviHud();
  };

  const disegna = () => {
    c.setTransform(scala, 0, 0, scala, 0, 0);
    c.fillStyle = '#03040b'; c.fillRect(0, 0, larga, alta);
    const spinta = stato === 'gioco' ? 1 + Math.min(4, tempo * 0.08) : 0.4;
    c.fillStyle = 'rgba(200,225,255,.8)';
    for (const s of stelle) {
      s.y += s.v * spinta; if (s.y > alta) { s.y = -4; s.x = Math.random() * larga; }
      c.fillRect(s.x, s.y, s.v > 1.2 ? 2 : 1, 1 + s.v * spinta * 1.6);
    }
    for (const o of cose) {
      c.save(); c.translate(o.x, o.y); c.rotate(o.giro);
      if (o.tipo === 'byte') { c.fillStyle = '#7fe0ff'; c.shadowColor = '#7fe0ff'; c.shadowBlur = 14; c.fillRect(-o.r * 0.7, -o.r * 0.7, o.r * 1.4, o.r * 1.4); }
      else {
        c.beginPath();
        o.lati.forEach((k, i) => { const a = i / o.lati.length * 6.283; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * o.r * k, Math.sin(a) * o.r * k); });
        c.closePath(); c.fillStyle = '#2a3158'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#8f9ccc'; c.stroke();
      }
      c.restore();
    }
    for (const s of scintille) { c.globalAlpha = Math.min(1, s.vita * 2); c.fillStyle = s.colore; c.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); }
    c.globalAlpha = 1;
    if (stato !== 'fine' && (!salvo || Math.floor(salvo * 12) % 2)) {
      c.save(); c.translate(nave.x, nave.y); c.rotate((nave.mira - nave.x) * 0.006);
      c.fillStyle = 'rgba(127,224,255,.55)'; c.beginPath(); c.moveTo(-6, 14); c.lineTo(0, 26 + Math.random() * 12); c.lineTo(6, 14); c.fill();
      c.shadowColor = '#7fe0ff'; c.shadowBlur = 16; c.fillStyle = '#eafaff';
      c.beginPath(); c.moveTo(0, -20); c.lineTo(15, 14); c.lineTo(0, 7); c.lineTo(-15, 14); c.closePath(); c.fill();
      c.restore();
    }
  };

  const passo = ora => {
    giro = requestAnimationFrame(passo);
    const dt = Math.min(0.05, (ora - (prima || ora)) / 1000); prima = ora;
    if (stato === 'gioco') aggiorna(dt);
    disegna();
  };

  const crea = () => {
    finestra = document.createElement('dialog');
    finestra.className = 'gioco';
    finestra.setAttribute('aria-label', T.titolo);
    finestra.innerHTML = `<canvas></canvas><p class="gioco-hud" aria-live="off"></p>
      <button type="button" class="lente-tasto gioco-chiudi" aria-label="${T.chiudi}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
      <div class="gioco-pannello"></div>`;
    document.body.appendChild(finestra);
    tela = finestra.querySelector('canvas'); c = tela.getContext('2d');
    hud = finestra.querySelector('.gioco-hud'); pannello = finestra.querySelector('.gioco-pannello');
    finestra.querySelector('.gioco-chiudi').addEventListener('click', () => finestra.close());
    pannello.addEventListener('click', e => { if (e.target.closest('[data-via]')) parti(); });
    const punta = e => { if (stato === 'gioco') nave.mira = e.clientX; };
    tela.addEventListener('pointerdown', punta); tela.addEventListener('pointermove', punta);
    finestra.addEventListener('keydown', e => {
      const giu = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { tasti.sinistra = giu; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { tasti.destra = giu; e.preventDefault(); }
    });
    finestra.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') tasti.sinistra = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') tasti.destra = false;
    });
    finestra.addEventListener('close', () => {
      cancelAnimationFrame(giro); giro = 0; stato = 'attesa'; tasti.sinistra = tasti.destra = false;
      document.dispatchEvent(new Event('neobyte:ripresa'));
    });
    addEventListener('resize', () => { if (finestra.open) misura(); });
    document.addEventListener('visibilitychange', () => { if (!finestra.open) return; if (document.hidden) { cancelAnimationFrame(giro); giro = 0; } else if (!giro) { prima = 0; giro = requestAnimationFrame(passo); } });
  };

  window.NeoByteNavicella = () => {
    if (!finestra) crea();
    if (finestra.open || typeof finestra.showModal !== 'function') return;
    document.dispatchEvent(new Event('neobyte:pausa')); // lo sfondo del sito si ferma finché si gioca
    finestra.showModal();
    misura();
    stato = 'attesa'; punti = 0; scudi = 3; cose = []; scintille = []; record = leggiRecord();
    scriviHud();
    mostraPannello(T.titolo, T.regole, T.parti);
    prima = 0; giro = requestAnimationFrame(passo);
  };
})();
