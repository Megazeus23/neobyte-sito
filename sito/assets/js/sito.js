/* NeoByte Studios — script unico del sito.
   Tutto è un di più: senza JavaScript le pagine si leggono lo stesso, sopra uno sfondo fermo.
   Lo sfondo ha tre livelli (attributo data-cosmo su <html>):
     pieno   = nebulosa viva + stelle in volo (computer)
     medio   = immagine ferma + stelle in volo (telefoni)
     leggero = solo immagine ferma, niente animazioni («riduci movimento», risparmio dati, dispositivi deboli, niente WebGL)
   Per le prove: ?cosmo=pieno|medio|leggero forza il livello, ?salto=1 tiene fermo il salto al suo massimo,
   ?lento=1 (o 2) finge un dispositivo lento e fa scendere di uno (o due) livelli.
   Sul dispositivo restano solo due preferenze (localStorage): «nb-suono» (suono acceso o spento) e «nb-record» (mini-gioco). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const radice = document.documentElement;
  const parametri = new URLSearchParams(location.search);
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const questoScript = document.currentScript;
  const inglese = radice.lang === 'en';

  // ── livello dello sfondo
  const scelto = parametri.get('cosmo');
  const forzato = ['pieno', 'medio', 'leggero'].includes(scelto) ? scelto : null;
  const rete = navigator.connection || {};
  const debole = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const piccolo = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  let livello = forzato || (ridotto || rete.saveData || debole ? 'leggero' : piccolo ? 'medio' : 'pieno');
  const fermo = livello === 'leggero';
  radice.dataset.cosmo = livello;

  // ── testata: cambia quando si scorre
  const testata = $('[data-testata]');
  if (testata) {
    const segna = () => testata.classList.toggle('giu', scrollY > 24);
    segna();
    addEventListener('scroll', segna, { passive: true });
  }

  // ── comparsa dei blocchi allo scorrimento
  const blocchi = $$('[data-appari]');
  if (blocchi.length && !fermo && 'IntersectionObserver' in window) {
    radice.classList.add('pronto');
    const oss = new IntersectionObserver(voci => voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('visto'); oss.unobserve(v.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    blocchi.forEach(b => oss.observe(b));
  }

  // ── il cosmo: stelle in volo (e nebulosa) in WebGL, senza librerie
  const cosmo = (() => {
    const tela = $('canvas[data-cosmo]');
    if (!tela || fermo) return null;
    let gl;
    try { gl = tela.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true }); } catch (e) { gl = null; }
    if (!gl) return null;

    const ALTA = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
    const VS_STELLE = `
      attribute vec3 aPos; attribute vec3 aSeme; attribute float aCoda;
      uniform float uViaggio, uStira, uTempo, uScala, uVigore;
      uniform vec2 uMira, uForma;
      varying float vLuce; varying vec3 vTinta;
      void main() {
        float z = fract(aPos.z - uViaggio);
        float d = 0.05 + (z + aCoda * uStira) * 0.95;
        vec2 p = (aPos.xy * 2.4 - uMira * 0.06) / d;
        gl_Position = vec4(p * uForma, 0.0, 1.0);
        float bordo = smoothstep(0.0, 0.06, z) * (1.0 - smoothstep(0.8, 1.0, z));
        float brilla = 0.7 + 0.3 * sin(uTempo * (0.5 + aSeme.z * 2.4) + aSeme.y * 43.0);
        vLuce = bordo * brilla * (0.5 + 0.5 * aSeme.x) * mix(1.0, 0.04, aCoda) * uVigore;
        vTinta = mix(mix(vec3(0.66, 0.82, 1.0), vec3(1.0, 0.9, 0.78), step(0.8, aSeme.y)), vec3(1.0), 0.3);
        gl_PointSize = clamp(uScala * (1.1 + aSeme.x * 1.9) * (0.4 / d + 0.8), 1.0, uScala * 8.0);
      }`;
    const FS_STELLE = `
      precision mediump float;
      uniform float uLinea;
      varying float vLuce; varying vec3 vTinta;
      void main() {
        float a = 1.0;
        if (uLinea < 0.5) { float r = length(gl_PointCoord - 0.5) * 2.0; a = clamp(1.15 - r * 1.15, 0.0, 1.0); a *= a * (3.0 - 2.0 * a); }
        vec3 c = vTinta * vLuce * a;
        gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
      }`;
    const VS_PIANO = 'attribute vec2 aP; varying vec2 vUv; void main() { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
    const FS_NEBULOSA = ALTA + `
      uniform vec2 uRis, uSposta; uniform float uTempo;
      float h(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.y); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * n(p); p = mat2(1.6, -1.2, 1.2, 1.6) * p + vec2(17.3, 9.1); a *= 0.5; } return v; }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uRis) / uRis.y;
        vec2 p = uv * 1.5 + uSposta;
        float t = uTempo * 0.012;
        vec2 w = vec2(fbm(p * 1.2 + vec2(t, -t * 0.6)), fbm(p * 1.2 + vec2(5.2 - t * 0.7, 1.3 + t)));
        float f = fbm(p * 0.9 + w * 2.0);
        float g = fbm(p * 1.8 - w * 1.4 + 7.0);
        float banda = exp(-pow((uv.y - uv.x * 0.36 + 0.03) * 1.2, 2.0));
        float nube = smoothstep(0.38, 0.84, f) * (0.16 + 0.84 * banda) * 0.78;
        float fili = pow(1.0 - abs(g * 2.0 - 1.0), 5.0);
        vec3 col = vec3(0.008, 0.012, 0.036);
        col += vec3(0.06, 0.13, 0.46) * nube * 1.15;
        col += vec3(0.44, 0.12, 0.64) * nube * smoothstep(0.4, 0.78, g);
        col += vec3(0.04, 0.50, 0.62) * nube * nube * (1.0 - smoothstep(0.3, 0.6, g)) * 0.85;
        col += vec3(1.0, 0.5, 0.28) * pow(nube, 3.0) * smoothstep(0.55, 0.85, g) * 0.6;
        col += vec3(0.5, 0.72, 1.0) * fili * nube * 0.2;
        col = max(col * (1.0 - 0.28 * dot(uv, uv)), 0.0);
        // tetto di luminosità: sopra la nebulosa il testo chiaro deve restare leggibile (contrasto oltre 4,5 a 1)
        float luce = dot(pow(col, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, pow(0.055 / max(luce, 0.0001), 0.4545));
        gl_FragColor = vec4(col, 1.0);
      }`;
    const FS_COPIA = `
      precision mediump float;
      uniform sampler2D uT; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() { vec3 c = texture2D(uT, vUv).rgb + (h(gl_FragCoord.xy) - 0.5) * 0.012; gl_FragColor = vec4(c, 1.0); }`;

    const programma = (vs, fs) => {
      const p = gl.createProgram();
      for (const [tipo, testo] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, testo); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, vs === VS_PIANO ? 'aP' : 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'programma');
      const u = {};
      for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const nome = gl.getActiveUniform(p, i).name; u[nome] = gl.getUniformLocation(p, nome); }
      return { p, u };
    };

    let stelle, nebulosa, copia;
    try {
      stelle = programma(VS_STELLE, FS_STELLE);
      if (livello === 'pieno') { nebulosa = programma(VS_PIANO, FS_NEBULOSA); copia = programma(VS_PIANO, FS_COPIA); }
    } catch (e) { return null; }

    // ogni stella ha due vertici: testa e coda (la coda serve solo per le scie del salto)
    const QUANTE = livello === 'pieno' ? 3400 : 1400;
    const PASSO = 7;
    const dati = new Float32Array(QUANTE * 2 * PASSO);
    for (let i = 0; i < QUANTE; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1, z = Math.random();
      const a = Math.pow(Math.random(), 2.2), b = Math.random(), c = Math.random();
      for (let k = 0; k < 2; k++) dati.set([x, y, z, a, b, c, k], (i * 2 + k) * PASSO);
    }
    const bufStelle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStelle);
    gl.bufferData(gl.ARRAY_BUFFER, dati, gl.STATIC_DRAW);
    const bufPiano = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPiano);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posto = { pos: gl.getAttribLocation(stelle.p, 'aPos'), seme: gl.getAttribLocation(stelle.p, 'aSeme'), coda: gl.getAttribLocation(stelle.p, 'aCoda') };

    // la nebulosa si disegna piccola in una trama e poi si ingrandisce: costa poco e resta morbida
    let trama = null, cornice = null, risNebulosa = [2, 2];
    const preparaNebulosa = (l, a) => {
      risNebulosa = [Math.max(2, Math.round(l / 3)), Math.max(2, Math.round(a / 3))];
      if (!trama) { trama = gl.createTexture(); cornice = gl.createFramebuffer(); }
      gl.bindTexture(gl.TEXTURE_2D, trama);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, risNebulosa[0], risNebulosa[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cornice);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trama, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    let larga = 0, alta = 0, scala = 1;
    const misura = () => {
      const l = tela.clientWidth, a = tela.clientHeight;
      if (!l || !a) return;
      scala = Math.min(devicePixelRatio || 1, livello === 'pieno' ? 1.5 : 1.25);
      const nl = Math.round(l * scala), na = Math.round(a * scala);
      // sui telefoni la barra del browser cambia l'altezza di continuo: si ridisegna la tela solo se serve davvero
      if (nl === larga && Math.abs(na - alta) < 160 * scala) return;
      larga = nl; alta = na;
      tela.width = larga; tela.height = alta;
      if (livello === 'pieno') preparaNebulosa(larga, alta);
    };

    const CROCIERA = 0.007;
    const tieni = parametri.has('salto');
    const lento = Number(parametri.get('lento')) || 0; // solo per le prove: finge fotogrammi lenti per questo numero di discese
    let discese = 0;
    let vivo = true, giro = 0, prima = 0, viaggio = Math.random(), tempo = 20;
    let scorri = scrollY, scorriVisto = scrollY;
    let fase = ridotto ? 'crociera' : 'arrivo', inizioFase = 0;
    const mira = [0, 0], miraVera = [0, 0];
    let lenti = 0, contati = 0;

    const declassa = () => {
      if (forzato) return;
      discese++;
      if (livello === 'pieno') { livello = 'medio'; radice.dataset.cosmo = 'medio'; larga = 0; misura(); }
      else { livello = 'leggero'; radice.dataset.cosmo = 'leggero'; vivo = false; tela.hidden = true; }
    };

    const disegna = ora => {
      giro = 0;
      if (!vivo) return;
      if (!prima) { prima = ora; inizioFase = ora; }
      const dt = Math.min(0.05, (ora - prima) / 1000);
      // controllo dei fotogrammi: se il dispositivo non regge, si scende di livello da soli
      if (ora - inizioFase > 2200 && fase === 'crociera') {
        contati++; if (ora - prima > 34 || discese < lento) lenti++;
        if (contati >= 90) { if (lenti > 40) declassa(); contati = 0; lenti = 0; }
      }
      prima = ora;
      tempo += dt;

      let stira = 0, spinta = 0, vigore = 1;
      let t = ora - inizioFase;
      if (fase === 'arrivo' && t >= 1500) { fase = 'crociera'; inizioFase = ora; t = 0; }
      if (tieni) { stira = 0.24; spinta = 1.6; vigore = 2.6; }
      else if (fase === 'arrivo') {
        const e = Math.pow(1 - Math.min(1, t / 1500), 3);
        stira = 0.2 * e; spinta = 1.5 * e; vigore = 1 + 1.6 * e;
      } else if (fase === 'partenza') {
        const k = Math.pow(Math.min(1, t / 460), 2);
        stira = 0.26 * k; spinta = 2.4 * k; vigore = 1 + 1.8 * k;
      }
      scorriVisto += (scorri - scorriVisto) * Math.min(1, dt * 7);
      const corsa = scorri - scorriVisto;
      stira += Math.min(0.035, Math.abs(corsa) * 0.00006);
      viaggio += dt * (CROCIERA + spinta) + corsa * 0.0000022;
      mira[0] += (miraVera[0] - mira[0]) * Math.min(1, dt * 3);
      mira[1] += (miraVera[1] - mira[1]) * Math.min(1, dt * 3);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufPiano);
      if (livello === 'pieno' && nebulosa) {
        gl.disable(gl.BLEND);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, cornice);
        gl.viewport(0, 0, risNebulosa[0], risNebulosa[1]);
        gl.useProgram(nebulosa.p);
        gl.uniform2f(nebulosa.u.uRis, risNebulosa[0], risNebulosa[1]);
        gl.uniform2f(nebulosa.u.uSposta, mira[0] * 0.035 + 3.1, mira[1] * 0.035 - scorriVisto * 0.00012 + 1.7);
        gl.uniform1f(nebulosa.u.uTempo, tempo);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, larga, alta);
        gl.useProgram(copia.p);
        gl.bindTexture(gl.TEXTURE_2D, trama);
        gl.uniform1i(copia.u.uT, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else {
        gl.viewport(0, 0, larga, alta);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(stelle.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufStelle);
      gl.enableVertexAttribArray(posto.pos); gl.enableVertexAttribArray(posto.seme); gl.enableVertexAttribArray(posto.coda);
      gl.uniform1f(stelle.u.uViaggio, viaggio % 1);
      gl.uniform1f(stelle.u.uStira, stira);
      gl.uniform1f(stelle.u.uTempo, tempo);
      gl.uniform1f(stelle.u.uScala, scala);
      gl.uniform2f(stelle.u.uMira, mira[0], mira[1]);
      gl.uniform2f(stelle.u.uForma, larga > alta ? alta / larga : 1, larga > alta ? 1 : larga / alta);
      const punta = passo => {
        gl.vertexAttribPointer(posto.pos, 3, gl.FLOAT, false, passo, 0);
        gl.vertexAttribPointer(posto.seme, 3, gl.FLOAT, false, passo, 12);
        gl.vertexAttribPointer(posto.coda, 1, gl.FLOAT, false, passo, 24);
      };
      // punti: si salta un vertice sì e uno no, così si prendono solo le teste
      punta(PASSO * 4 * 2);
      gl.uniform1f(stelle.u.uLinea, 0);
      gl.uniform1f(stelle.u.uVigore, 1);
      gl.drawArrays(gl.POINTS, 0, QUANTE);
      if (stira > 0.002) {
        punta(PASSO * 4);
        gl.uniform1f(stelle.u.uLinea, 1);
        gl.uniform1f(stelle.u.uVigore, vigore);
        gl.drawArrays(gl.LINES, 0, QUANTE * 2);
      }
      giro = requestAnimationFrame(disegna);
    };

    const riparti = () => { if (vivo && !giro) { prima = 0; giro = requestAnimationFrame(disegna); } };
    misura();
    riparti();
    let attesa;
    addEventListener('resize', () => { clearTimeout(attesa); attesa = setTimeout(misura, 150); });
    addEventListener('scroll', () => { scorri = scrollY; }, { passive: true });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      addEventListener('pointermove', e => { miraVera[0] = (e.clientX / innerWidth) * 2 - 1; miraVera[1] = 1 - (e.clientY / innerHeight) * 2; }, { passive: true });
    }
    let inPausa = false; // il mini-gioco chiede allo sfondo di fermarsi
    const sveglia = () => {
      if (livello === 'leggero') return;
      vivo = !document.hidden && !inPausa;
      if (vivo) riparti(); else if (giro) { cancelAnimationFrame(giro); giro = 0; }
    };
    document.addEventListener('visibilitychange', sveglia);
    document.addEventListener('neobyte:pausa', () => { inPausa = true; sveglia(); });
    document.addEventListener('neobyte:ripresa', () => { inPausa = false; sveglia(); });
    tela.addEventListener('webglcontextlost', e => { e.preventDefault(); vivo = false; tela.hidden = true; radice.dataset.cosmo = 'leggero'; });

    return {
      parti() { fase = 'partenza'; inizioFase = performance.now(); },
      torna() { fase = 'crociera'; inizioFase = performance.now(); },
    };
  })();
  if (!cosmo && !fermo) { livello = 'leggero'; radice.dataset.cosmo = 'leggero'; }

  // ── salto nell'iperspazio quando si passa a un'altra pagina del sito
  if (cosmo && !ridotto) {
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return;
      if (/\.(zip|svg|png|jpe?g|webp|gif|xml|txt|pdf|webmanifest)$/i.test(u.pathname)) return; // file, non pagine
      if (radice.dataset.cosmo === 'leggero') return;
      e.preventDefault();
      radice.classList.add('salto');
      cosmo.parti();
      setTimeout(() => { location.href = u.href; }, 440);
    });
    // tornando indietro la pagina può riapparire dalla memoria del browser: mai lasciarla a metà salto
    addEventListener('pageshow', e => { if (e.persisted || radice.classList.contains('salto')) { radice.classList.remove('salto'); cosmo.torna(); } });
  }

  // ── l'orizzonte della prima schermata segue lo scorrimento
  const eroe = $('[data-eroe]');
  if (eroe && !fermo) {
    let segnato = false;
    const muovi = () => { segnato = false; const s = Math.min(1, scrollY / Math.max(1, eroe.offsetHeight)); eroe.style.setProperty('--s', s.toFixed(3)); };
    addEventListener('scroll', () => { if (!segnato && scrollY < eroe.offsetHeight * 1.2) { segnato = true; requestAnimationFrame(muovi); } }, { passive: true });
  }

  // ── carte che si inclinano sotto il mouse
  if (!fermo && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-inclina]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 16 + 'deg');
        el.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 12 + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });
  }

  // ── lente: le schermate ingrandite, con frecce e tastiera
  const finestra = $('[data-lente-finestra]');
  const voci = $$('a[data-lente]');
  if (finestra && voci.length && typeof finestra.showModal === 'function') {
    const img = $('[data-lente-img]', finestra), testo = $('[data-lente-testo]', finestra);
    let ora = 0, daDove = null;
    const mostra = i => {
      ora = (i + voci.length) % voci.length;
      img.src = voci[ora].href;
      img.alt = voci[ora].dataset.alt || '';
      testo.textContent = `${voci[ora].dataset.alt || ''}\n${ora + 1} / ${voci.length}`;
      new Image().src = voci[(ora + 1) % voci.length].href; // la prossima è già pronta
    };
    let tocco = null;
    finestra.addEventListener('pointerdown', e => { tocco = e.pointerType === 'mouse' ? null : e.clientX; });
    finestra.addEventListener('pointerup', e => { if (tocco !== null && Math.abs(e.clientX - tocco) > 48) mostra(ora + (e.clientX < tocco ? 1 : -1)); tocco = null; });
    finestra.addEventListener('pointercancel', () => { tocco = null; });
    voci.forEach((v, i) => v.addEventListener('click', e => { e.preventDefault(); daDove = v; mostra(i); finestra.showModal(); }));
    $('[data-lente-chiudi]', finestra).addEventListener('click', () => finestra.close());
    $('[data-lente-prima]', finestra).addEventListener('click', () => mostra(ora - 1));
    $('[data-lente-dopo]', finestra).addEventListener('click', () => mostra(ora + 1));
    finestra.addEventListener('click', e => { if (e.target === finestra) finestra.close(); });
    finestra.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') mostra(ora - 1); if (e.key === 'ArrowRight') mostra(ora + 1); });
    finestra.addEventListener('close', () => { img.removeAttribute('src'); if (daDove) daDove.focus(); });
  }

  // ── trailer: YouTube si carica solo dopo il tocco
  $$('a[data-youtube]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(a.dataset.youtube)}?autoplay=1&rel=0`;
    f.title = a.textContent.trim();
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    a.replaceWith(f);
  }));

  // ── filtro del catalogo per stato
  const filtro = $('[data-filtro]');
  if (filtro) {
    const schede = $$('.scheda-gioco[data-stato]');
    const vuoto = $('[data-filtro-vuoto]');
    filtro.addEventListener('click', e => {
      const tasto = e.target.closest('button');
      if (!tasto) return;
      $$('button', filtro).forEach(b => b.setAttribute('aria-pressed', String(b === tasto)));
      let visibili = 0;
      schede.forEach(s => { const si = !tasto.dataset.stato || s.dataset.stato === tasto.dataset.stato; s.hidden = !si; if (si) visibili++; });
      if (vuoto) vuoto.hidden = visibili > 0;
    });
  }

  // ── menu sugli schermi stretti: «Menu» apre un pannello (senza JavaScript porta ai link in fondo alla pagina)
  const tastoMenu = $('[data-menu-tasto]');
  const menu = $('#menu');
  if (tastoMenu && menu) {
    const scritta = $('span', tastoMenu);
    const dietro = [$('main'), $('.piede')];
    tastoMenu.setAttribute('role', 'button');
    tastoMenu.setAttribute('aria-controls', 'menu');
    const metti = aperto => {
      radice.classList.toggle('menu-aperto', aperto);
      tastoMenu.setAttribute('aria-expanded', String(aperto));
      scritta.textContent = aperto ? tastoMenu.dataset.chiudi : tastoMenu.dataset.apri;
      dietro.forEach(el => { if (el) el.inert = aperto; });
    };
    metti(false);
    tastoMenu.addEventListener('click', e => { e.preventDefault(); metti(!radice.classList.contains('menu-aperto')); });
    tastoMenu.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); tastoMenu.click(); } });
    menu.addEventListener('click', e => { if (e.target.closest('a')) metti(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && radice.classList.contains('menu-aperto')) { metti(false); tastoMenu.focus(); } });
    matchMedia('(max-width: 900px)').addEventListener('change', () => metti(false));
    addEventListener('pageshow', () => metti(false));
  }

  // ── «Condividi» e «Copia il testo»: compaiono solo se il browser li sa fare
  const fatto = b => {
    const s = $('span', b), prima = s.textContent;
    s.textContent = b.dataset.fatto; b.classList.add('fatto');
    setTimeout(() => { s.textContent = prima; b.classList.remove('fatto'); }, 1800);
  };
  const appunti = navigator.clipboard && navigator.clipboard.writeText;
  if (navigator.share || appunti) $$('[data-condividi]').forEach(b => {
    b.hidden = false;
    b.addEventListener('click', async () => {
      const url = location.href.split('#')[0].split('?')[0];
      try {
        if (navigator.share) await navigator.share({ title: b.dataset.titolo, url });
        else { await navigator.clipboard.writeText(url); fatto(b); }
      } catch (e) { /* condivisione annullata */ }
    });
  });
  if (appunti) $$('[data-copia]').forEach(b => {
    const fonte = document.getElementById(b.dataset.copia);
    if (!fonte) return;
    b.hidden = false;
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(fonte.innerText.trim()); fatto(b); } catch (e) { /* niente appunti */ } });
  });

  // ── suono d'ambiente: spento finché non lo accendi. Nessun file: il suono nasce nel browser.
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (Audio && document.body) {
    const testi = inglese ? ['Ambient sound: off', 'Ambient sound: on'] : ['Suono d’ambiente: spento', 'Suono d’ambiente: acceso'];
    const leggi = () => { try { return localStorage.getItem('nb-suono') === '1'; } catch (e) { return false; } };
    const ricorda = v => { try { localStorage.setItem('nb-suono', v ? '1' : '0'); } catch (e) { /* senza memoria vale solo per questa pagina */ } };
    const tasto = document.createElement('button');
    tasto.type = 'button'; tasto.className = 'suono';
    tasto.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path class="onde" d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><path class="muto" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    let ctx = null, uscita = null, acceso = false;
    const costruisci = () => {
      ctx = new Audio();
      uscita = ctx.createGain(); uscita.gain.value = 0; uscita.connect(ctx.destination);
      const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 420; filtro.Q.value = 0.7; filtro.connect(uscita);
      // un accordo basso e fermo, come il ronzio di una nave
      for (const [nota, tipo, forza] of [[55, 'sine', 0.5], [82.5, 'sine', 0.22], [110.4, 'triangle', 0.12], [164.6, 'sine', 0.06]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = tipo; o.frequency.value = nota; g.gain.value = forza; o.connect(g); g.connect(filtro); o.start();
      }
      const onda = (frequenza, ampiezza, verso) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = frequenza; g.gain.value = ampiezza; o.connect(g); g.connect(verso); o.start(); };
      onda(0.06, 180, filtro.frequency);
      // un filo di vento: rumore filtrato che va e viene
      const lungo = ctx.sampleRate * 2, pezzo = ctx.createBuffer(1, lungo, ctx.sampleRate), d = pezzo.getChannelData(0);
      for (let i = 0; i < lungo; i++) d[i] = Math.random() * 2 - 1;
      const rumore = ctx.createBufferSource(), banda = ctx.createBiquadFilter(), g = ctx.createGain();
      rumore.buffer = pezzo; rumore.loop = true; banda.type = 'bandpass'; banda.frequency.value = 700; banda.Q.value = 0.5; g.gain.value = 0.035;
      rumore.connect(banda); banda.connect(g); g.connect(uscita); rumore.start();
      onda(0.09, 350, banda.frequency);
    };
    const mostra = () => { tasto.setAttribute('aria-pressed', String(acceso)); tasto.setAttribute('aria-label', testi[+acceso]); tasto.title = testi[+acceso]; };
    const suona = () => {
      try {
        if (!ctx) costruisci();
        ctx.resume();
        uscita.gain.cancelScheduledValues(ctx.currentTime);
        uscita.gain.setTargetAtTime(0.16, ctx.currentTime, 0.8);
      } catch (e) { acceso = false; mostra(); }
    };
    const taci = () => {
      if (!ctx) return;
      uscita.gain.cancelScheduledValues(ctx.currentTime);
      uscita.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => { if (!acceso && ctx) ctx.suspend(); }, 900);
    };
    acceso = leggi();
    mostra();
    document.body.appendChild(tasto);
    // i browser lasciano partire il suono solo dopo un gesto: se era acceso, riparte al primo tocco o tasto
    const primoGesto = () => { removeEventListener('pointerdown', primoGesto); removeEventListener('keydown', primoGesto); if (acceso) suona(); };
    if (acceso) { addEventListener('pointerdown', primoGesto); addEventListener('keydown', primoGesto); }
    tasto.addEventListener('click', () => { acceso = !acceso; mostra(); ricorda(acceso); if (acceso) suona(); else taci(); });
    document.addEventListener('visibilitychange', () => { if (ctx && acceso) { if (document.hidden) ctx.suspend(); else ctx.resume(); } });
    addEventListener('pagehide', () => { if (ctx) ctx.suspend(); });
    addEventListener('pageshow', e => { if (e.persisted && ctx && acceso) ctx.resume(); });
  }

  // ── mini-gioco nascosto: il suo script si carica solo quando serve
  const fileGioco = questoScript && questoScript.dataset.navicella;
  if (fileGioco && typeof HTMLDialogElement === 'function') {
    let caricando = false;
    const apriGioco = () => {
      if (window.NeoByteNavicella) return window.NeoByteNavicella();
      if (caricando) return;
      caricando = true;
      const s = document.createElement('script');
      s.src = fileGioco;
      s.onload = () => { if (window.NeoByteNavicella) window.NeoByteNavicella(); };
      s.onerror = () => { caricando = false; };
      document.head.appendChild(s);
    };
    $$('[data-navicella]').forEach(b => { b.hidden = false; b.addEventListener('click', apriGioco); });
    // due modi segreti: scrivere «neobyte» sulla tastiera, o cinque tocchi veloci sul motto in fondo alla pagina
    let scritto = '';
    addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || !e.key || e.key.length !== 1 || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], dialog'))) return;
      scritto = (scritto + e.key.toLowerCase()).slice(-7);
      if (scritto === 'neobyte') { scritto = ''; apriGioco(); }
    });
    const motto = $('.piede-marchio p');
    let tocchi = 0, primo = 0;
    if (motto) motto.addEventListener('click', () => {
      const ora = Date.now();
      if (ora - primo > 2500) { primo = ora; tocchi = 0; }
      if (++tocchi >= 5) { tocchi = 0; apriGioco(); }
    });
  }
})();
