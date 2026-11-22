(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Integer pixel scaling: keeps every pixel square ---------- */
  function scaleImg(img) {
    if (!img.naturalWidth || !img.isConnected) return;
    let k;
    if (img.dataset.scale) {
      k = +img.dataset.scale * (innerWidth < 640 ? 0.5 : 1);
    } else {
      const box = img.parentElement;
      const cs = getComputedStyle(box);
      const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const fit = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      k = Math.max(1, Math.floor(fit));
      if (k * 1.4 < fit) k = fit * 0.92; // very small sprite: allow a fractional step so it is not tiny
    }
    img.style.width = img.naturalWidth * k + 'px';
    img.style.height = img.naturalHeight * k + 'px';
    img.style.maxWidth = 'none';
  }
  const pxImgs = [...document.querySelectorAll('img.actor, img.fit')];
  pxImgs.forEach(img => img.complete ? scaleImg(img) : img.addEventListener('load', () => scaleImg(img)));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => pxImgs.forEach(scaleImg), 120); });

  /* ---------- Nav background + hero parallax ---------- */
  const hud = document.querySelector('.hud');
  const layers = [['.far', .15], ['.mid', .3], ['.near', .45]].map(([s, f]) => [document.querySelector(s), f]);
  addEventListener('scroll', () => {
    const y = scrollY;
    hud.classList.toggle('solid', y > 40);
    if (!reduce && y < innerHeight) layers.forEach(([el, f]) => el.style.transform = `translateY(${y * f}px)`);
  }, { passive: true });

  /* ---------- Sprite sheet marks follow the sheet height ---------- */
  const sheet = document.querySelector('.sheet');
  const markH = () => sheet.parentElement.style.setProperty('--sheet-h', sheet.clientHeight + 'px');
  sheet.complete ? markH() : sheet.addEventListener('load', markH); addEventListener('resize', markH);

  /* ---------- Sprite sheet player ---------- */
  const runner = document.getElementById('runner');
  const fno = document.getElementById('fno');
  const FRAMES = 11, FW = 210;
  let frame = 0, fps = 12, playing = !reduce, last = 0;
  const draw = () => { runner.style.backgroundPosition = `${-frame * FW}px 0`; fno.textContent = frame + 1; };
  function tick(t) {
    if (playing && t - last >= 1000 / fps) { frame = (frame + 1) % FRAMES; draw(); last = t; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  const pp = document.getElementById('pp');
  const setPP = () => { pp.textContent = playing ? '❚❚' : '▶'; pp.setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
  setPP();
  pp.onclick = () => { playing = !playing; setPP(); };
  document.getElementById('step').onclick = () => { playing = false; setPP(); frame = (frame + 1) % FRAMES; draw(); };
  document.querySelectorAll('.spd').forEach(b => b.onclick = () => {
    document.querySelectorAll('.spd').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); fps = +b.dataset.fps; playing = true; setPP();
  });

  /* ---------- Gallery slots: show image if the file exists ---------- */
  const pending = new Map();
  function settle(fig) {
    const gal = fig.closest('.gallery');
    const left = pending.get(gal) - 1; pending.set(gal, left);
    if (left === 0) {
      gal.querySelectorAll('.slot.empty').forEach(s => s.remove());
      if (!gal.querySelector('.slot')) {
        gal.classList.add('none');
        let p = gal.previousElementSibling;
        while (p && (p.classList.contains('block-note') || p.classList.contains('block-title'))) {
          p.classList.add('none'); if (p.classList.contains('block-title')) break; p = p.previousElementSibling;
        }
      }
    }
  }
  document.querySelectorAll('.gallery').forEach(g => pending.set(g, g.querySelectorAll('.slot[data-src]').length));
  document.querySelectorAll('.slot[data-src]').forEach(fig => {
    const img = new Image();
    img.alt = fig.querySelector('figcaption')?.textContent || 'Artwork by Tran Quang Khanh';
    img.onload = () => { fig.prepend(img); settle(fig); };
    img.onerror = () => { fig.classList.add('empty'); settle(fig); };
    img.src = fig.dataset.src;
  });

  /* ---------- Optional portrait photo ---------- */
  const pImg = document.querySelector('.portrait img');
  if (pImg && pImg.dataset.photo) {
    const ph = new Image();
    ph.onload = () => {
      pImg.replaceWith(ph); ph.className = 'photo'; ph.alt = 'Tran Quang Khanh';
      ph.parentElement.classList.add('has-photo');
    };
    ph.src = pImg.dataset.photo;
  }

  /* ---------- Phone slider ---------- */
  const track = document.getElementById('track');
  if (track) {
    const slides = [...track.children], dots = document.getElementById('dots'), pcap = document.getElementById('pcap');
    const caps = ['Instagram profile', 'Top reel · 25.6M views · 2.3M likes', 'Instagram grid', 'Reel · 863K views', 'Reel · 1.3M views', 'TikTok profile · 669K likes'];
    slides.forEach((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Screen ' + (i + 1)); b.onclick = () => go(i); dots.appendChild(b); });
    let cur = 0;
    const go = i => { cur = (i + slides.length) % slides.length; track.scrollTo({ left: cur * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); };
    const mark = () => { cur = Math.round(track.scrollLeft / track.clientWidth); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === cur)); pcap.textContent = caps[cur] || ''; };
    track.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(mark, 60); }, { passive: true });
    document.getElementById('prev').onclick = () => go(cur - 1);
    document.getElementById('next').onclick = () => go(cur + 1);
    slides.forEach(s => s.querySelector('img').onclick = e => openLB(e.target.src, e.target.alt, false));
    mark();
  }

  /* ---------- Cinema carousel ---------- */
  const ct = document.getElementById('cintrack');
  if (ct) {
    const n = ct.children.length, th = [...document.getElementById('cinthumbs').children], cc = document.getElementById('cincount');
    let ci = 0;
    const cgo = i => { ci = (i + n) % n; ct.scrollTo({ left: ci * ct.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); };
    const cmark = () => { ci = Math.round(ct.scrollLeft / ct.clientWidth); th.forEach((b, k) => b.classList.toggle('on', k === ci)); cc.textContent = (ci + 1) + ' / ' + n; };
    ct.addEventListener('scroll', () => { clearTimeout(ct._t); ct._t = setTimeout(cmark, 60); }, { passive: true });
    document.getElementById('cinprev').onclick = () => cgo(ci - 1);
    document.getElementById('cinnext').onclick = () => cgo(ci + 1);
    th.forEach((b, k) => b.onclick = () => cgo(k));
    ct.querySelectorAll('img').forEach(im => im.onclick = () => openLB(im.src, im.alt, false));
    cmark();
  }
  document.querySelectorAll('.m-item img, .cast img, .b-item img, .sketch-big img').forEach(im => im.addEventListener('click', () => openLB(im.src, im.alt, false)));

  /* ---------- Raw clips: play while on screen ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()), { threshold: .4 });
    document.querySelectorAll('.raw video').forEach(v => io.observe(v));
  }

  /* ---------- Sketch / final compare ---------- */
  const cmp = document.getElementById('compare');
  if (cmp) { const r = cmp.querySelector('.cmp-range'); r.addEventListener('input', () => cmp.style.setProperty('--pos', r.value + '%')); }

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lb'), lbimg = document.getElementById('lbimg'), lbcap = document.getElementById('lbcap');
  function openLB(src, cap, pixel) {
    lbimg.src = src; lbcap.textContent = cap || '';
    lbimg.classList.toggle('px', pixel);
    lbimg.style.width = lbimg.style.height = '';
    lb.hidden = false;
    if (pixel) lbimg.onload = () => {
      const k = Math.max(1, Math.floor(Math.min(innerWidth * .9 / lbimg.naturalWidth, innerHeight * .75 / lbimg.naturalHeight)));
      lbimg.style.width = lbimg.naturalWidth * k + 'px'; lbimg.style.height = lbimg.naturalHeight * k + 'px';
    };
  }
  document.querySelectorAll('.card').forEach(c => c.onclick = () => {
    const i = c.querySelector('img'); openLB(i.src, c.querySelector('b').textContent, true);
  });
  document.addEventListener('click', e => {
    const i = e.target.closest('.slot img'); if (i) openLB(i.src, i.alt, false);
  });
  const closeLB = () => { lb.hidden = true; lbimg.removeAttribute('src'); };
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-close')) closeLB(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLB(); });

  /* ---------- Video: play muted while on screen ---------- */
  const vid = document.getElementById('gameplay');
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { en.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }, { threshold: .5 }).observe(vid);
  }

  /* ---------- CONTINUE? countdown ---------- */
  const cd = document.querySelector('.countdown');
  let n = 9, timer;
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      clearInterval(timer);
      if (en.isIntersecting) { n = 9; cd.textContent = n; timer = setInterval(() => { n = n > 0 ? n - 1 : 9; cd.textContent = n; }, 900); }
    }, { threshold: .4 }).observe(cd);
  }
})();

// One More Game strip arrows
(()=>{const t=document.getElementById('omgtrack');if(!t)return;
const step=d=>{const w=t.querySelector('.b-item');t.scrollBy({left:d*((w?w.offsetWidth:300)+14),behavior:'smooth'})};
document.getElementById('omgprev').addEventListener('click',()=>step(-1));
document.getElementById('omgnext').addEventListener('click',()=>step(1));})();
