/* LaCheie (machetă demo): meniul cu secțiunea curentă, bara „Înainte → După”
   sincronizată cu video-ul, calculatorul orientativ (constante în js/data.js),
   comparațiile înainte/după (mouse, touch, tastatură), formularul Netlify
   cu validarea pozelor și rezumatul pe WhatsApp. */
(function () {
  'use strict';
  var D = window.LACHEIE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var waLink = function (text) { return 'https://wa.me/' + D.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text); };

  // ---------- meniu: secțiunea curentă în pastilă ----------
  var links = $$('#meniu a');
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var pill = document.getElementById('meniu');
  var current = null;
  function spy() {
    var mark = window.innerHeight * 0.35, idx = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < mark) idx = i; });
    var a = links[idx] || null;
    if (a === current) return;
    current = a;
    links.forEach(function (l) { if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    if (a && pill.scrollWidth > pill.clientWidth) {
      var left = a.offsetLeft - (pill.clientWidth - a.offsetWidth) / 2;
      pill.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { tick = false; spy(); });
  }, { passive: true });
  spy();

  // ---------- video erou: încărcat după pagină, bara Înainte → După ----------
  var video = document.getElementById('hero-video');
  var fill = document.getElementById('prog-fill');
  var phase = document.getElementById('phase');
  var lbls = $$('[data-lbl]');
  var PH = [[0, 'Înainte'], [0.24, 'După'], [0.62, 'După · exterior']];
  function paint() {
    var d = video.duration, p = d && isFinite(d) ? video.currentTime / d : 0;
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var name = PH[0][1];
    PH.forEach(function (x) { if (p >= x[0]) name = x[1]; });
    if (phase && phase.textContent !== name) phase.textContent = name;
    var after = p >= PH[1][0];
    lbls.forEach(function (l) { l.classList.toggle('on', (l.getAttribute('data-lbl') === '1') === after); });
  }
  var raf = 0;
  function loop() { paint(); raf = !video.paused ? requestAnimationFrame(loop) : 0; }
  if (video && fill) {
    video.addEventListener('play', function () { if (!raf) raf = requestAnimationFrame(loop); });
    video.addEventListener('timeupdate', function () { if (!raf) paint(); });
    video.addEventListener('seeked', paint);
    var saveData = navigator.connection && navigator.connection.saveData;
    var startVideo = function () {
      if (reduce || saveData) return;
      $$('source[data-src]', video).forEach(function (s) { s.src = s.getAttribute('data-src'); });
      video.load();
      var p = video.play(); if (p && p.catch) p.catch(function () {});
    };
    var later = function () { setTimeout(startVideo, 1200); };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
  }

  // ---------- calculator orientativ ----------
  var r500 = function (x) { return Math.round(x / 500) * 500; };
  var UNIT = {
    zile: { div: 1, pas: 1, one: 'zi', many: 'zile' },
    saptamani: { div: 7, pas: 1, one: 'săptămână', many: 'săptămâni' },
    luni: { div: 30.4, pas: 0.5, one: 'lună', many: 'luni' }
  };
  var num = function (x) { return String(x).replace('.', ','); };
  function estimeaza(o) {
    var t = D.tipuri[o.tip], p = t.pret[o.fin], n = D.nivele[o.fin];
    var manopera = p.manopera * o.mp + t.costFix / 2;
    var materiale = p.materiale * o.mp + t.costFix / 2;
    var demolare = o.demolare ? t.demolare.leiMp * o.mp + t.demolare.fix : 0;
    var total = manopera + materiale + demolare;
    var zile = (t.durata.baza + t.durata.zileMp * o.mp) * n.factorDurata + (o.demolare ? t.durata.demolare : 0);
    var u = UNIT[t.durata.unitate];
    var rnd = function (x) { return Math.max(u.pas, Math.round(x / u.div / u.pas) * u.pas); };
    var dMin = rnd(zile * D.durataMin), dMax = rnd(zile * D.durataMax), dMed = rnd(zile);
    if (dMax <= dMin) dMax = dMin + u.pas;
    return {
      o: o, total: total,
      min: r500(total * (1 - D.marjaPret)), max: r500(total * (1 + D.marjaPret)), med: r500(total),
      perMp: Math.round(total / o.mp / 10) * 10,
      zile: zile, dMin: dMin, dMax: dMax, dMed: dMed, unit: u,
      split: [['Manoperă', manopera], ['Materiale', materiale], ['Demolare', demolare]]
    };
  }
  window.LACHEIE.estimeaza = estimeaza; // folosit și la testele din consolă

  function durata(r) { return num(r.dMin) + '–' + num(r.dMax) + ' ' + r.unit.many; }
  function rezumat(r) {
    var o = r.o;
    return D.tipuri[o.tip].nume + ', ' + o.mp + ' m², finisaj ' + D.nivele[o.fin].nume + (o.demolare ? ', cu demolare' : ', fără demolare') +
      ': ' + fmt(r.min) + '–' + fmt(r.max) + ' lei, ' + durata(r);
  }

  var calc = document.getElementById('calc');
  var mp = document.getElementById('mp');
  var lastTip = 'baie', last = null;
  function read() {
    return {
      tip: ($('input[name="tip"]:checked', calc) || {}).value || 'baie',
      fin: ($('input[name="fin"]:checked', calc) || {}).value || 'premium',
      mp: +mp.value, demolare: calc.elements.demolare.checked
    };
  }
  function render() {
    var o = read();
    if (o.tip !== lastTip) {
      var t = D.tipuri[o.tip]; lastTip = o.tip;
      mp.min = t.mp.min; mp.max = t.mp.max; mp.value = t.mp.implicit; o.mp = t.mp.implicit;
    }
    mp.setAttribute('aria-valuetext', o.mp + ' metri pătrați');
    var r = last = estimeaza(o);
    var out = document.getElementById('mp-out');
    out.textContent = o.mp; var sm = document.createElement('small'); sm.textContent = 'm²'; out.appendChild(sm);
    var rng = document.getElementById('r-rng');
    rng.textContent = fmt(r.min) + ' – ' + fmt(r.max) + ' lei';
    var s2 = document.createElement('small');
    s2.textContent = '≈ ' + fmt(r.med) + ' lei · ' + fmt(r.perMp) + ' lei/m² · ' + D.tipuri[o.tip].nume + ', finisaj ' + D.nivele[o.fin].nume.toLowerCase();
    rng.appendChild(s2);
    document.getElementById('r-dur').textContent = num(r.dMin) + '–' + num(r.dMax);
    document.getElementById('r-dur2').textContent = r.unit.many + ' · durată estimată ≈ ' + num(r.dMed) + ' ' + (r.dMed === 1 ? r.unit.one : r.unit.many);
    var ul = document.getElementById('r-split');
    ul.textContent = '';
    r.split.forEach(function (s) {
      if (s[1] <= 0) return;
      var share = s[1] / r.total;
      var li = document.createElement('li');
      var a = document.createElement('span'); a.textContent = s[0];
      var b = document.createElement('span'); b.className = 'b'; b.setAttribute('aria-hidden', 'true');
      var i = document.createElement('i'); i.style.transform = 'scaleX(' + share.toFixed(3) + ')'; b.appendChild(i);
      var c = document.createElement('span'); c.className = 'v';
      c.textContent = fmt(r500(s[1] * (1 - D.marjaPret))) + '–' + fmt(r500(s[1] * (1 + D.marjaPret))) + ' lei · ' + Math.round(share * 100) + '%';
      li.appendChild(a); li.appendChild(b); li.appendChild(c); ul.appendChild(li);
    });
  }
  if (calc) {
    calc.addEventListener('input', render);
    calc.addEventListener('change', render);
    calc.addEventListener('submit', function (e) { e.preventDefault(); });
    render();
  }

  // ---------- „Cere ofertă pentru această estimare” → precompletează formularul ----------
  var form = document.getElementById('oferta-form');
  var toOffer = $('[data-to-offer]');
  if (toOffer && form) toOffer.addEventListener('click', function () {
    if (!last) return;
    var o = last.o;
    document.getElementById('f-tip').value = D.tipuri[o.tip].nume;
    document.getElementById('f-nivel').value = D.nivele[o.fin].nume;
    document.getElementById('f-mp').value = o.mp;
    document.getElementById('f-dem').checked = o.demolare;
    document.getElementById('f-est').value = fmt(last.min) + '–' + fmt(last.max) + ' lei · ' + durata(last) + ' (orientativ)';
    var msg = document.getElementById('f-msg');
    if (!msg.value.trim()) msg.value = 'Estimare din calculator: ' + rezumat(last) + '.';
    setTimeout(function () { document.getElementById('f-oras').focus({ preventScroll: true }); }, reduce ? 0 : 450);
  });
  // dacă vizitatorul schimbă manual datele, estimarea veche nu mai corespunde
  ['f-tip', 'f-nivel', 'f-mp', 'f-dem'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { document.getElementById('f-est').value = ''; });
  });

  // ---------- comparații înainte / după: mouse, touch, tastatură ----------
  $$('[data-cmp]').forEach(function (r) {
    var box = r.closest('.cmp');
    var set = function () {
      box.style.setProperty('--x', r.value + '%');
      r.setAttribute('aria-valuetext', r.value + '% înainte, ' + (100 - r.value) + '% după');
    };
    var fromX = function (x) {
      var b = box.getBoundingClientRect();
      r.value = Math.round(Math.min(100, Math.max(0, (x - b.left) / b.width * 100)));
      set();
    };
    var drag = false;
    box.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      drag = true;
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      fromX(e.clientX);
      if (e.pointerType === 'mouse') { e.preventDefault(); r.focus({ preventScroll: true }); }
    });
    box.addEventListener('pointermove', function (e) { if (drag) fromX(e.clientX); });
    var end = function () { drag = false; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    r.addEventListener('input', set);
    set();
  });

  // ---------- formular: poze (JPG/PNG, max 10, max 8 MB total) ----------
  var poze = document.getElementById('f-poze');
  var errBox = document.getElementById('f-err');
  var fileBox = document.getElementById('f-filebox');
  var mb = function (b) { return (b / 1048576).toFixed(1).replace('.', ','); };
  function checkFiles() {
    var files = poze.files ? Array.prototype.slice.call(poze.files) : [];
    var msg = '';
    var bad = files.filter(function (f) { return !/^image\/(jpeg|png)$/.test(f.type) && !/\.(jpe?g|png)$/i.test(f.name); });
    var total = files.reduce(function (s, f) { return s + f.size; }, 0);
    if (bad.length) msg = '„' + bad[0].name + '” nu este JPG sau PNG. Alege doar poze JPG sau PNG.';
    else if (files.length > D.POZE_MAX) msg = 'Ai ales ' + files.length + ' poze – poți trimite cel mult ' + D.POZE_MAX + '.';
    else if (total > D.POZE_MAX_MB * 1048576) msg = 'Pozele au împreună ' + mb(total) + ' MB – limita este ' + D.POZE_MAX_MB + ' MB în total. Alege mai puține poze sau micșorează-le.';
    poze.setCustomValidity(msg);
    errBox.textContent = msg;
    fileBox.classList.toggle('bad', !!msg);
    var box = document.getElementById('f-files');
    box.textContent = '';
    var st = document.createElement('strong'); st.style.color = 'var(--coal)';
    var n = files.length;
    st.textContent = n ? n + (n === 1 ? ' poză aleasă' : ' poze alese') + ' · ' + mb(total) + ' MB' : 'Adaugă poze';
    box.appendChild(st);
    box.appendChild(document.createTextNode(n ? ' · apasă din nou pentru a schimba' : ' (opțional) · JPG sau PNG, maximum 10, în total până la 8 MB'));
    return { ok: !msg, files: files };
  }
  if (poze) poze.addEventListener('change', checkFiles);

  // ---------- trimitere: Netlify Forms (fetch), apoi mulțumire ----------
  function thanks(nume) {
    var box = document.getElementById('oferta-box');
    box.textContent = '';
    var d = document.createElement('div'); d.className = 'thanks'; d.setAttribute('role', 'status'); d.tabIndex = -1;
    var k = document.createElement('p'); k.className = 'kick'; k.textContent = 'Cerere trimisă';
    var h = document.createElement('h3'); h.textContent = 'Mulțumim' + (nume ? ', ' + nume : '') + '!';
    var p1 = document.createElement('p'); p1.textContent = 'Am primit cererea de ofertă. Te sunăm în aceeași zi lucrătoare ca să stabilim vizita gratuită.';
    var p2 = document.createElement('p'); p2.textContent = 'Machetă demo: pe site-ul real, cererea ajunge pe e-mailul firmei.';
    var a = document.createElement('a'); a.className = 'btn btn-l'; a.href = '#calculator'; a.textContent = 'Fă o altă estimare';
    d.appendChild(k); d.appendChild(h); d.appendChild(p1); d.appendChild(p2); d.appendChild(a);
    box.appendChild(d); d.focus();
  }
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var chk = checkFiles();
    if (!chk.ok) { poze.focus(); return; }
    if (!form.reportValidity()) return;
    var btn = document.getElementById('f-send');
    var fd = new FormData(form);
    for (var i = 1; i <= 10; i++) fd.delete('poza' + i);
    // Netlify Forms primește câte un fișier pe câmp: poza1 … poza10
    chk.files.forEach(function (f, i) { fd.append('poza' + (i + 1), f, f.name); });
    btn.disabled = true; btn.textContent = 'Se trimite…';
    errBox.textContent = '';
    fetch('/', { method: 'POST', body: fd })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); thanks(fd.get('nume')); })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Trimite cererea de ofertă';
        errBox.textContent = 'Cererea nu a putut fi trimisă acum. Încearcă din nou, sună-ne la ' + D.TELEFON_AFISAT + ' sau trimite-o pe WhatsApp.';
      });
  });

  // ---------- WhatsApp: același rezumat ca formularul ----------
  function waFormText() {
    var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var lines = ['Bună ziua, LaCheie! Aș dori o ofertă de renovare:',
      '• Lucrare: ' + v('f-tip') + ', ' + v('f-mp') + ' m², finisaj ' + v('f-nivel') + (document.getElementById('f-dem').checked ? ', cu demolare' : ', fără demolare')];
    if (v('f-est')) lines.push('• Estimare calculator: ' + v('f-est'));
    if (v('f-oras')) lines.push('• Oraș: ' + v('f-oras'));
    lines.push('• Termen dorit: ' + v('f-termen'));
    if (v('f-nume')) lines.push('• Nume: ' + v('f-nume'));
    if (v('f-tel')) lines.push('• Telefon: ' + v('f-tel'));
    if (v('f-msg')) lines.push('• Mesaj: ' + v('f-msg'));
    lines.push('Atașez câteva poze cu spațiul de acum.');
    return lines.join('\n');
  }
  var fwa = document.getElementById('f-wa');
  if (fwa) {
    var upd = function () { fwa.href = waLink(waFormText()); };
    fwa.addEventListener('click', upd);
    fwa.addEventListener('focus', upd);
    fwa.addEventListener('mouseenter', upd);
    upd();
  }
  var simple = waLink('Bună ziua, LaCheie! Aș dori o ofertă de renovare. Vă trimit câteva poze cu spațiul de acum.');
  $$('[data-wa]').forEach(function (a) { a.href = simple; });
})();
