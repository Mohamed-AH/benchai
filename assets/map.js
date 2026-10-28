// Chapter maps: a 3D relief of the Arabian Peninsula with the chapter's places,
// events and routes. The data comes from _data/maps.yml and _data/places.yml,
// printed into the page as JSON by _includes/chapter-map.html.
//
// Labels are HTML laid over the canvas (not WebGL text) so Arabic joins correctly
// and uses the site's fonts. Without WebGL the static image in the figure stays.

const BOUNDS = { lon0: 34.5, lon1: 57.5, lat0: 12.5, lat1: 32.5 }; // keep in sync with bake_terrain.py
const K = 10;                       // world units per degree of latitude
const LAT_C = (BOUNDS.lat0 + BOUNDS.lat1) / 2;
const LON_C = (BOUNDS.lon0 + BOUNDS.lon1) / 2;
const COS = Math.cos(LAT_C * Math.PI / 180);
const V_EXAG = 1.25;                // height units per 1000 m
const BASE = new URL('.', import.meta.url).pathname;

const TEXT = {
  en: { approx: 'approximate', reset: 'Reset view', hint: 'Drag to turn the map. Dashed lines and ≈ mark approximate routes and positions.',
        hintTouch: 'Use two fingers to turn the map. Dashed lines and ≈ mark approximate routes and positions.',
        credit: 'Terrain: AWS Terrain Tiles (SRTM, ETOPO1)', year: y => `${y} AH` },
  ar: { approx: 'تقريبي', reset: 'إعادة العرض', hint: 'اسحب لتدوير الخريطة. الخطوط المتقطعة وعلامة ≈ تعني مسارًا أو موقعًا تقريبيًا.',
        hintTouch: 'استخدم إصبعين لتدوير الخريطة. الخطوط المتقطعة وعلامة ≈ تعني مسارًا أو موقعًا تقريبيًا.',
        credit: 'التضاريس: AWS Terrain Tiles (SRTM, ETOPO1)', year: y => `${y}هـ` },
};

const KIND_COLOUR = { battle: '--adobe', siege: '--gold', taken: '--palm', surrender: '--palm', settlement: '--palm', event: '--ink' };

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function cssColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
}

const toXZ = (lat, lon) => [(lon - LON_C) * COS * K, -(lat - LAT_C) * K];

function loadImage(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

async function heightField() {
  const img = await loadImage(BASE + 'maps/arabia-height.png');
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const w = c.width, h = c.height;
  const at = (x, y) => {
    const v = px[(y * w + x) * 4];
    return v === 0 ? -0.15 : (v - 1) * 12 / 1000 * V_EXAG;
  };
  // world height at a lat/lon (bilinear)
  const sample = (lat, lon) => {
    const fx = (lon - BOUNDS.lon0) / (BOUNDS.lon1 - BOUNDS.lon0) * (w - 1);
    const fy = (BOUNDS.lat1 - lat) / (BOUNDS.lat1 - BOUNDS.lat0) * (h - 1);
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(fy)));
    const dx = fx - x0, dy = fy - y0;
    return at(x0, y0) * (1 - dx) * (1 - dy) + at(x0 + 1, y0) * dx * (1 - dy) + at(x0, y0 + 1) * (1 - dx) * dy + at(x0 + 1, y0 + 1) * dx * dy;
  };
  return { w, h, at, sample };
}

async function build(fig) {
  const data = JSON.parse(fig.querySelector('.map-data').textContent);
  const lang = data.lang === 'ar' ? 'ar' : 'en';
  const T = TEXT[lang];
  const places = data.places;
  // marker size and relief height follow the size of the area the chapter covers:
  // close views get flatter relief, so the coarse elevation data does not look spiky
  const m = data.map || {};
  const ids = [...(m.events || []).map(e => e.place), ...(m.places || []).map(q => q.id), ...(m.routes || []).flatMap(r => r.path)];
  const ll = ids.map(id => places[id]).filter(Boolean);
  const extent = ll.length ? Math.max(...ll.map(p => p.lat)) - Math.min(...ll.map(p => p.lat)) + Math.max(...ll.map(p => p.lon)) - Math.min(...ll.map(p => p.lon)) : 12;
  const S = Math.min(3, Math.max(0.9, extent / 4));
  const RELIEF = Math.min(1, Math.max(0.35, extent / 8));
  const stage = fig.querySelector('.map-stage');
  const THREE = await import(BASE + 'three/three.module.min.js');
  const { OrbitControls } = await import(BASE + 'three/OrbitControls.js');
  const field = await heightField();

  // ---------- renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  const overlay = document.createElement('div');
  overlay.className = 'map-labels';
  stage.appendChild(overlay);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(cssColour('--sand'), 100, 400);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 2000);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5240, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-60, 90, -60);
  scene.add(sun);

  // ---------- terrain ----------
  const [x0, z0] = toXZ(BOUNDS.lat1, BOUNDS.lon0);
  const [x1, z1] = toXZ(BOUNDS.lat0, BOUNDS.lon1);
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, field.w - 1, field.h - 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, field.at(i % field.w, Math.floor(i / field.w)) * RELIEF);
  geo.computeVertexNormals();

  const loader = new THREE.TextureLoader();
  const textures = {};
  const texture = theme => textures[theme] || (textures[theme] = loader.load(BASE + `maps/arabia-${theme}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }));
  const terrainMat = new THREE.MeshStandardMaterial({ map: texture(isDark() ? 'dark' : 'light'), roughness: 1, metalness: 0 });
  scene.add(new THREE.Mesh(geo, terrainMat));

  // ---------- markers ----------
  const groundAt = (lat, lon) => Math.max(0, field.sample(lat, lon) * RELIEF);
  const markers = [];   // { obj, top: Vector3, el, priority }
  const mats = [];      // [material, cssVar] so colours follow the theme
  const mat = v => { const m = new THREE.MeshStandardMaterial({ color: cssColour(v), roughness: .6 }); mats.push([m, v]); return m; };
  const pillarGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 10);
  const capGeo = new THREE.OctahedronGeometry(0.26);
  const discGeo = new THREE.CircleGeometry(0.75, 40).rotateX(-Math.PI / 2);

  // marker size follows the size of the area the chapter covers

  function addMarker(p, opts) {
    const [x, z] = toXZ(p.lat, p.lon);
    const y = groundAt(p.lat, p.lon);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData.s = S;
    const height = (opts.event ? 2.2 : 1.3) * S;
    if (p.approximate) {
      const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: cssColour(opts.colour), transparent: true, opacity: .28, depthWrite: false }));
      mats.push([disc.material, opts.colour]);
      disc.position.y = 0.06;
      disc.scale.setScalar(S);
      g.add(disc);
    }
    const pillar = new THREE.Mesh(pillarGeo, mat('--ink'));
    pillar.scale.set(S * 1.6, height, S * 1.6); pillar.position.y = height / 2;
    g.add(pillar);
    const cap = new THREE.Mesh(capGeo, mat(opts.colour));
    cap.position.y = height + 0.18 * S;
    cap.scale.setScalar(S * (opts.event ? 1 : 0.6));
    g.add(cap);
    scene.add(g);
    const el = document.createElement('div');
    el.className = 'map-label' + (opts.event ? ' is-event kind-' + opts.kind : '');
    for (const line of opts.lines) {
      const t = document.createElement('span');
      t.className = 'ml-t';
      t.textContent = (p.approximate ? '≈ ' : '') + line.label;
      el.appendChild(t);
      if (line.year) {
        const yr = document.createElement('span');
        yr.className = 'ml-y';
        yr.textContent = T.year(line.year);
        el.appendChild(yr);
      }
    }
    overlay.appendChild(el);
    markers.push({ obj: g, top: new THREE.Vector3(x, y + height + 0.6 * S, z), el, priority: opts.event ? 2 : 1, born: markers.length });
  }

  // events at the same spot (or a few km apart, like Al-Masmak and Riyadh) share one marker
  const eventPlaces = new Set((m.events || []).map(e => e.place));
  const groups = [];
  for (const e of m.events || []) {
    const p = places[e.place];
    if (!p) continue;
    const g = groups.find(g => Math.abs(g.p.lat - p.lat) + Math.abs(g.p.lon - p.lon) < 0.15);
    if (g) g.events.push(e); else groups.push({ p, events: [e] });
  }
  for (const g of groups) {
    addMarker(g.p, { event: true, kind: g.events[0].kind, colour: KIND_COLOUR[g.events[0].kind] || '--ink',
                     // the pin shows the place and year; the full captions are in the legend under the map
                     lines: [{ label: [...new Set(g.events.map(e => places[e.place][lang]))].join(' · '),
                               year: [...new Set(g.events.map(e => e.year).filter(Boolean))].join('–') }] });
  }
  // a place a few km from an event marker (Al-Shuqaib, Al-Swaidi next to Al-Masmak) is left to the
  // caption below the map, so the pins don't pile up
  const nearEvent = p => groups.some(g => Math.abs(g.p.lat - p.lat) + Math.abs(g.p.lon - p.lon) < 0.15);
  for (const item of m.places || []) {
    const p = places[item.id];
    if (p && !eventPlaces.has(item.id) && !nearEvent(p)) addMarker(p, { colour: '--ink-soft', lines: [{ label: p[lang] }] });
  }
  // places that only appear as route stops get a small label too
  for (const r of m.routes || []) for (const id of r.path) {
    if (places[id] && !eventPlaces.has(id) && !nearEvent(places[id]) && !(m.places || []).some(q => q.id === id) && !markers.some(k => k.id === id)) {
      addMarker(places[id], { colour: '--ink-soft', lines: [{ label: places[id][lang] }] });
      markers[markers.length - 1].id = id;
    }
  }

  // ---------- routes ----------
  const routes = [];
  for (const r of m.routes || []) {
    const pts = [];
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = places[r.path[i]], b = places[r.path[i + 1]];
      if (!a || !b) continue;
      const steps = 60;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, lat = a.lat + (b.lat - a.lat) * t, lon = a.lon + (b.lon - a.lon) * t;
        const [x, z] = toXZ(lat, lon);
        pts.push(new THREE.Vector3(x, groundAt(lat, lon) + 0.35 * S + Math.sin(t * Math.PI) * 0.6 * S, z));
      }
    }
    // the route is drawn as short tubes: dashes when approximate, one run when not
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1];
    const dash = r.approximate ? 0.7 * S : total, gap = r.approximate ? 0.45 * S : 0;
    const pointAt = d => {
      let i = cum.findIndex(c => c >= d);
      if (i <= 0) return pts[Math.max(0, i)].clone();
      const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return pts[i - 1].clone().lerp(pts[i], f);
    };
    const tubeMat = mat('--adobe');
    const pieces = [];
    for (let d = 0; d < total; d += dash + gap) {
      const e = Math.min(total, d + dash), seg = [];
      for (let k = 0; k <= 6; k++) seg.push(pointAt(d + (e - d) * k / 6));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seg), 6, 0.075 * S, 6), tubeMat);
      tube.visible = reduceMotion;
      scene.add(tube);
      pieces.push({ tube, at: d / total });
    }
    routes.push({ pieces });
  }

  // ---------- regions (overview maps): soft glows that light up year by year ----------
  const regions = [];
  let years = [], yearIdx = 0, userMoved = false;
  if (m.overview && data.regions) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 128, 128);
    const glow = new THREE.CanvasTexture(c);
    for (const r of data.regions) {
      const [x, z] = toXZ(r.centre[0], r.centre[1]);
      const size = r.radius_km / 111 * K * 2;
      const rm = new THREE.MeshBasicMaterial({ map: glow, color: cssColour('--adobe'), transparent: true, opacity: 0, depthTest: false, depthWrite: false });
      mats.push([rm, '--adobe']);
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), rm);
      disc.position.set(x, 4, z);
      disc.renderOrder = 2;
      scene.add(disc);
      const holder = new THREE.Group();
      holder.position.set(x, 0, z);
      const el = document.createElement('div');
      el.className = 'map-label is-event kind-region';
      const t = document.createElement('span'); t.className = 'ml-t'; t.textContent = r[lang];
      const yr = document.createElement('span'); yr.className = 'ml-y'; yr.textContent = T.year(r.year);
      el.append(t, yr);
      overlay.appendChild(el);
      const region = { rm, year: r.year, on: false };
      regions.push(region);
      markers.push({ obj: holder, top: new THREE.Vector3(x, groundAt(r.centre[0], r.centre[1]) + 2, z), el, priority: 3, born: 0, region });
    }
    years = [...new Set(data.regions.map(r => r.year))].sort();
    yearIdx = reduceMotion ? years.length - 1 : 0;
    const bar = document.createElement('div');
    bar.className = 'map-years';
    bar.innerHTML = '<input type="range" min="0" step="1"><output></output>';
    const range = bar.querySelector('input'), out = bar.querySelector('output');
    range.max = years.length - 1;
    range.setAttribute('aria-label', lang === 'ar' ? 'السنة' : 'Year');
    const show = () => { range.value = yearIdx; out.textContent = T.year(years[yearIdx]); for (const r of regions) r.on = r.year <= years[yearIdx]; };
    range.addEventListener('input', () => { userMoved = true; yearIdx = +range.value; show(); });
    fig.insertBefore(bar, fig.querySelector('figcaption'));
    show();
    regions.show = show;
  }

  // ---------- camera: overview, then glide to the chapter ----------
  const focusPts = markers.map(k => k.obj.position);
  if (!focusPts.length) { const [rx, rz] = toXZ(24.7, 46.7); focusPts.push(new THREE.Vector3(rx, 0, rz)); }
  const box = new THREE.Box3().setFromPoints(focusPts);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 22);
  const dir = new THREE.Vector3(0, 1.15, 1).normalize();
  const endTarget = centre.clone();
  const endPos = centre.clone().add(dir.clone().multiplyScalar(span * (m.overview ? 2.5 : 1.0) + 4));
  const startTarget = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2 + 10);
  const startPos = startTarget.clone().add(new THREE.Vector3(0, 1.6, 1).normalize().multiplyScalar(330));

  // back the camera off until every pin (and room for its label above) fits in the frame
  function fit() {
    const pv = new THREE.Vector3();
    for (let i = 0; i < 40; i++) {
      camera.position.copy(endPos);
      camera.lookAt(endTarget);
      camera.updateMatrixWorld();
      const inside = markers.every(k => {
        pv.copy(k.top).project(camera);
        return Math.abs(pv.x) < 0.8 && pv.y > -0.8 && pv.y < 0.6;
      });
      if (inside) return;
      endPos.sub(endTarget).multiplyScalar(1.1).add(endTarget);
    }
  }
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  fit();
  const dist = endPos.distanceTo(endTarget);
  scene.fog.near = dist * 1.1; scene.fog.far = dist * 3.2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.05;
  controls.minAzimuthAngle = -0.7; controls.maxAzimuthAngle = 0.7;
  controls.minDistance = 6; controls.maxDistance = 340;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.touches = { ONE: null, TWO: 2 /* TOUCH.DOLLY_ROTATE */ };
  renderer.domElement.style.touchAction = 'pan-y';
  controls.enabled = false;

  const intro = { t0: 0, dur: reduceMotion ? 0 : 2600, done: false };
  if (intro.dur === 0) { camera.position.copy(endPos); controls.target.copy(endTarget); }
  else { camera.position.copy(startPos); controls.target.copy(startTarget); }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ---------- chrome: reset button, hint, credit ----------
  const ui = document.createElement('div');
  ui.className = 'map-ui';
  ui.innerHTML = '<button type="button" class="map-reset"></button>';
  const reset = ui.querySelector('button');
  reset.textContent = T.reset;
  reset.addEventListener('click', () => { camera.position.copy(endPos); controls.target.copy(endTarget); controls.update(); });
  stage.appendChild(ui);
  const note = fig.querySelector('.map-note');
  if (note) note.textContent = (coarse ? T.hintTouch : T.hint) + ' ' + T.credit + '.';

  // ---------- theme ----------
  const applyTheme = () => {
    terrainMat.map = texture(isDark() ? 'dark' : 'light');
    terrainMat.needsUpdate = true;
    for (const [mm, v] of mats) mm.color.set(cssColour(v));
    scene.fog.color.set(cssColour('--sand'));
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- size ----------
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- labels ----------
  const v = new THREE.Vector3();
  function placeLabels(reveal) {
    const w = stage.clientWidth, h = stage.clientHeight;
    const shown = [];
    const order = markers.slice().sort((a, b) => b.priority - a.priority || a.born - b.born);
    for (const k of order) {
      v.copy(k.top).project(camera);
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      const visible = v.z < 1 && x > -40 && x < w + 40 && y > 0 && y < h;
      let ok = visible && reveal >= k.born && (!k.region || k.region.on);
      let pos = 'above', lx = x - (k.w || 0) / 2, ly = y - (k.h || 0);
      if (ok) {
        // try above the pin, then below, right and left; hide the label only if all four collide
        if (!k.w) { k.w = k.el.offsetWidth; k.h = k.el.offsetHeight; }
        const { w: bw, h: bh } = k;
        const tries = [['above', x - bw / 2, y - bh - 8], ['below', x - bw / 2, y + 30], ['right', x + 14, y - bh / 2 + 10], ['left', x - bw - 14, y - bh / 2 + 10]];
        ok = false;
        for (const [name, tx, ty] of tries) {
          const box = { l: tx - 3, r: tx + bw + 3, t: ty - 3, b: ty + bh + 3 };
          if (box.l < 0 || box.r > w || box.t < 0 || box.b > h) continue;
          if (!shown.some(s => box.l < s.r && box.r > s.l && box.t < s.b && box.b > s.t)) {
            shown.push(box); ok = true; pos = name; lx = tx; ly = ty; break;
          }
        }
      }
      k.el.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px)`;
      k.el.dataset.pos = pos;
      k.el.classList.toggle('is-on', ok);
    }
  }

  // ---------- loop (only while on screen) ----------
  let running = false, raf = 0;
  const clock = new THREE.Clock();
  let elapsed = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    elapsed += clock.getDelta() * 1000;
    if (!intro.done) {
      const t = intro.dur ? Math.min(1, elapsed / intro.dur) : 1;
      const e = ease(t);
      camera.position.lerpVectors(startPos, endPos, e);
      controls.target.lerpVectors(startTarget, endTarget, e);
      if (t >= 1) { intro.done = true; controls.enabled = true; }
    }
    // markers rise after the glide, then routes draw in
    const after = intro.dur ? Math.max(0, elapsed - intro.dur * 0.7) : 1e9;
    markers.forEach((k, i) => {
      const s = Math.min(1, Math.max(0, (after - i * 140) / 380));
      k.obj.scale.set(1, Math.max(0.001, ease(s)), 1);
    });
    const reveal = intro.dur ? Math.floor(after / 140) - 2 : 1e9;
    routes.forEach((r, i) => {
      const p = Math.min(1, Math.max(0, (after - markers.length * 140 - i * 900) / 1400));
      for (const piece of r.pieces) piece.tube.visible = piece.at <= p;
    });
    // overview: step through the years once after the glide, unless the visitor takes the slider
    if (regions.length) {
      if (!userMoved && intro.done && yearIdx < years.length - 1 && elapsed > intro.dur + 600 + yearIdx * 1100) { yearIdx++; regions.show(); }
      for (const r of regions) r.rm.opacity += ((r.on ? 0.55 : 0) - r.rm.opacity) * 0.08;
    }
    controls.update();
    renderer.render(scene, camera);
    placeLabels(reveal);
  }
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; clock.getDelta(); frame(); }
    else if (!en.isIntersecting) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: 0.05 }).observe(stage);

  fig.classList.add('is-live');
}

for (const fig of document.querySelectorAll('.chapter-map')) {
  if (!hasWebGL()) continue;
  const io = new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    build(fig).catch(err => { console.error('map failed', err); fig.classList.remove('is-live'); });
  }, { rootMargin: '200px' });
  io.observe(fig);
}
