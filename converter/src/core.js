/* Garden Concept Converter - core (no DOM). Layout text -> model -> 3D objects -> DAE / DXF. */
(function (root) {
  "use strict";
  const GC = {};

  // ------------------------------------------------------------------ palette (his concept style)
  const C = {
    sage: "#b9c1a2", lawn: "#7f9b45", planting: "#5b4a3d", paving: "#f2f1ec", sandstone: "#dccaa3",
    resin: "#dddcd6", gravel: "#a39380", hoggin: "#8a7563", decking: "#b98b5c", water: "#7fb2d4",
    pool: "#6fb0d8", raised: "#9a5a32", veg: "#4f6b34", bark: "#7d5d43", meadow: "#a7b46a",
    wall: "#c9c4bb", house: "#c9d3dc", roof: "#8e99a6", roofFlat: "#b7c2cc", timber: "#7a4e2f",
    white: "#f4f4f2", glass: "#dfe9ef", fence: "#9c825f", hedge: "#4f6e3a", soil: "#5b4a3d",
    steel: "#3a3a3a", fire: "#c26a35", stone: "#b6b1a8", car: "#2f6db3", person: "#e2c27a", trunk: "#5a4634",
  };
  GC.colours = C;

  const ZONES = {
    lawn: { colour: C.lawn, label: "LAWN" },
    planting: { colour: C.planting, label: "PLANTING" },
    paving: { colour: C.paving, label: "PAVING" },
    sandstone: { colour: C.sandstone, label: "PAVING" },
    resin_bound: { colour: C.resin, label: "RESIN BOUND GRAVEL" },
    gravel: { colour: C.gravel, label: "GRAVEL" },
    hoggin: { colour: C.hoggin, label: "HOGGIN" },
    decking: { colour: C.decking, label: "DECKING" },
    water: { colour: C.water, label: "POND" },
    pool: { colour: C.pool, label: "POOL" },
    raised_bed: { colour: C.raised, label: "RAISED BED", height: 0.45, top: C.soil },
    veg_bed: { colour: C.timber, label: "VEG BED", height: 0.3, top: C.veg },
    bark: { colour: C.bark, label: "PLAY AREA" },
    meadow: { colour: C.meadow, label: "MEADOW" },
  };
  const ZONE_ALIASES = { patio: "paving", terrace: "paving", path: "paving", stone: "sandstone", resin: "resin_bound",
    rbg: "resin_bound", driveway: "resin_bound", drive: "resin_bound", deck: "decking", pond: "water",
    swimming_pool: "pool", beds: "planting", border: "planting", bed: "planting", grass: "lawn", wildflower: "meadow",
    raised: "raised_bed", veg: "veg_bed", vegetable_bed: "veg_bed", play: "bark", chippings: "bark" };
  const LINES = {
    wall: { t: 0.215, h: 1.0, colour: C.wall },
    retaining_wall: { t: 0.3, h: 0.6, colour: C.wall },
    fence: { t: 0.05, h: 1.8, colour: C.fence },
    screen: { t: 0.08, h: 1.8, colour: C.timber },
    hedge: { t: 0.7, h: 1.5, colour: C.hedge },
    trellis: { t: 0.05, h: 1.8, colour: C.white },
    edging: { t: 0.06, h: 0.06, colour: C.steel },
    stepping_stones: { t: 0.5, h: 0.04, colour: C.stone },
  };
  const STRUCTURES = ["pergola", "carport", "shed", "summerhouse", "greenhouse", "garden_room", "gazebo"];
  const BUILDINGS = ["house", "garage", "extension", "outbuilding"];
  const FEATURES = {
    firebowl: 0.9, dining_table: 2.0, bench: 1.8, pot: 0.6, water_feature: 0.9, sculpture: 0.5, boulder: 1.0,
    car: 4.4, person: 0.5, lounger: 2.0, hot_tub: 2.2, bin_store: 2.0,
  };
  const TREE_SIZES = { small: { h: 4.5, r: 1.4 }, medium: { h: 6.5, r: 2.0 }, large: { h: 9.0, r: 3.0 } };
  GC.ZONES = ZONES; GC.LINES = LINES; GC.STRUCTURES = STRUCTURES; GC.FEATURES = FEATURES;

  // ------------------------------------------------------------------ small maths
  const rad = (d) => (d * Math.PI) / 180;
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
  function ccw(p) { return area(p) < 0 ? p.slice().reverse() : p; }
  function centroid(p) {
    const A = area(p);
    if (Math.abs(A) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
    let cx = 0, cy = 0;
    for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; const f = x1 * y2 - x2 * y1; cx += (x1 + x2) * f; cy += (y1 + y2) * f; }
    return [cx / (6 * A), cy / (6 * A)];
  }
  function inPoly(pt, poly) {
    let inside = false; const [x, y] = pt;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function edgeDist(p, poly) { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(p, poly[i], poly[(i + 1) % poly.length])); return d; }
  function labelPoint(p) {
    const c = centroid(p);
    if (inPoly(c, p)) return c;
    let best = c, bd = -1; const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let i = 1; i < 16; i++) for (let j = 1; j < 16; j++) {
      const q = [x0 + ((x1 - x0) * i) / 16, y0 + ((y1 - y0) * j) / 16];
      if (inPoly(q, p)) { const d = edgeDist(q, p); if (d > bd) { bd = d; best = q; } }
    }
    return best;
  }
  function cleanPoly(p) {
    const out = [];
    for (const q of p) { const l = out[out.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1e-6) out.push(q); }
    if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
    return out;
  }
  function triangulate(poly) {
    const p = poly, idx = p.map((_, i) => i), tris = [];
    const cr = (a, b, c) => (p[b][0] - p[a][0]) * (p[c][1] - p[b][1]) - (p[b][1] - p[a][1]) * (p[c][0] - p[b][0]);
    const inTri = (q, a, b, c) => {
      const s = (u, v, w) => (p[v][0] - p[u][0]) * (q[1] - p[u][1]) - (p[v][1] - p[u][1]) * (q[0] - p[u][0]);
      const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
      return d1 >= -1e-12 && d2 >= -1e-12 && d3 >= -1e-12;
    };
    let guard = 0;
    while (idx.length > 3 && guard++ < 20000) {
      let found = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (cr(a, b, c) <= 1e-12) continue;
        let blocked = false;
        for (const j of idx) { if (j === a || j === b || j === c) continue; if (inTri(p[j], a, b, c)) { blocked = true; break; } }
        if (blocked) continue;
        tris.push([a, b, c]); idx.splice(i, 1); found = true; break;
      }
      if (!found) { for (let i = 1; i < idx.length - 1; i++) tris.push([idx[0], idx[i], idx[i + 1]]); return tris; }
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }
  function offsetLine(pts, d) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(n - 1, i + 1)];
      let nx = 0, ny = 0;
      const add = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; nx += -dy / L; ny += dx / L; };
      if (i > 0) add(prev, pts[i]);
      if (i < n - 1) add(pts[i], next);
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      let k = 1;
      if (i > 0 && i < n - 1) {
        const dx = next[0] - pts[i][0], dy = next[1] - pts[i][1], Ls = Math.hypot(dx, dy) || 1;
        const cos = nx * (-dy / Ls) + ny * (dx / Ls); k = 1 / Math.max(0.35, cos);
      }
      out.push([pts[i][0] + nx * d * k, pts[i][1] + ny * d * k]);
    }
    return out;
  }
  function smooth(pts, per = 8) {
    // Catmull-Rom curve through the given points
    if (pts.length < 3) return pts;
    const out = [], P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function band(pts, w) { return offsetLine(pts, w / 2).concat(offsetLine(pts, -w / 2).reverse()); }
  function lineLength(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  function along(p, step, start) {
    const out = []; const total = lineLength(p); if (total <= 0) return out;
    let s = start == null ? step / 2 : start, acc = 0;
    for (let i = 1; i < p.length; i++) {
      const [x1, y1] = p[i - 1], [x2, y2] = p[i], L = Math.hypot(x2 - x1, y2 - y1);
      while (s <= acc + L + 1e-9) { const t = L ? (s - acc) / L : 0; out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1), Math.atan2(y2 - y1, x2 - x1)]); s += step; }
      acc += L;
    }
    return out;
  }
  function circlePts(cx, cy, r, n, a0 = 0, a1 = 2 * Math.PI, closedArc) {
    const full = Math.abs(a1 - a0) >= 2 * Math.PI - 1e-9, out = [];
    const m = full ? n : n + 1;
    for (let i = 0; i < m; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  }
  function blobPts(cx, cy, rx, ry, seed) {
    const r = mulberry(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28], out = [], n = 36, j = 0.16;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      const k = 1 + (j * (Math.sin(2 * a + ph[0]) + 0.6 * Math.sin(3 * a + ph[1]) + 0.3 * Math.sin(5 * a + ph[2]))) / 1.9;
      out.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
    }
    return out;
  }
  GC.util = { smooth, area, ccw, centroid, inPoly, labelPoint, band, offsetLine, along, circlePts, mulberry, edgeDist, lineLength };

  // ------------------------------------------------------------------ parsing
  GC.parse = function (text) {
    let t = String(text || "").trim();
    const fence = t.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    if (!t.startsWith("{")) { const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i >= 0 && j > i) t = t.slice(i, j + 1); }
    // tolerate // comments and trailing commas (common in pasted AI output)
    t = t.replace(/(^|[^:"'])\/\/[^\n]*/g, "$1").replace(/,\s*([}\]])/g, "$1")
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    try { return { layout: JSON.parse(t) }; }
    catch (e) {
      const m = /position (\d+)/.exec(e.message);
      let where = "";
      if (m) { const pos = +m[1]; const line = t.slice(0, pos).split("\n").length; where = ` (around line ${line})`; }
      return { error: `The layout text isn't complete or has a typing slip${where}. Copy the whole layout block from the Gem again, including the first { and the last }.` };
    }
  };

  // ------------------------------------------------------------------ shapes
  function rectInfo(s, itemRotate) {
    const [x, y, w, d] = s.rect.map(Number);
    const ang = rad(Number(s.rotate != null ? s.rotate : itemRotate || 0));
    return { cx: x + w / 2, cy: y + d / 2, w, d, ang };
  }
  function rectCorners(R) {
    const c = Math.cos(R.ang), s = Math.sin(R.ang);
    return [[-R.w / 2, -R.d / 2], [R.w / 2, -R.d / 2], [R.w / 2, R.d / 2], [-R.w / 2, R.d / 2]].map(([u, v]) => [R.cx + u * c - v * s, R.cy + u * s + v * c]);
  }
  function shapeOf(item) {
    const s = item.shape || item;
    if (Array.isArray(s)) return { kind: "points", poly: ccw(cleanPoly(s.map((q) => [+q[0], +q[1]]))) };
    if (s.rect) { const R = rectInfo(s, item.rotate); return { kind: "rect", R, poly: ccw(rectCorners(R)) }; }
    if (s.circle) { const [cx, cy, r] = s.circle.map(Number); return { kind: "circle", cx, cy, r, poly: circlePts(cx, cy, r, 48) }; }
    if (s.ellipse) { const [cx, cy, rx, ry] = s.ellipse.map(Number); const p = []; for (let i = 0; i < 48; i++) { const a = (2 * Math.PI * i) / 48; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return { kind: "ellipse", poly: p }; }
    if (s.blob) { const [cx, cy, rx, ry] = s.blob.map(Number); return { kind: "blob", poly: blobPts(cx, cy, rx, ry || rx, hashStr(JSON.stringify(s.blob))) }; }
    if (s.arc) {
      const [cx, cy, r1, r2, a0, a1] = s.arc.map(Number);
      const n = Math.max(8, Math.round(Math.abs(a1 - a0) / 6));
      const outer = circlePts(cx, cy, Math.max(r1, r2), n, rad(a0), rad(a1));
      const inner = circlePts(cx, cy, Math.min(r1, r2), n, rad(a0), rad(a1)).reverse();
      return { kind: "arc", cx, cy, r1, r2, a0, a1, poly: ccw(outer.concat(inner)) };
    }
    if (s.path) { const w = Number(s.width || item.width || 1.0); let pts = s.path.map((q) => [+q[0], +q[1]]); if (s.curve || item.curve) pts = smooth(pts); return { kind: "path", poly: ccw(band(pts, w)) }; }
    if (s.points) return { kind: "points", poly: ccw(cleanPoly(s.points.map((q) => [+q[0], +q[1]]))) };
    return null;
  }
  GC.shapeOf = shapeOf;

  // ------------------------------------------------------------------ normalise + validate
  GC.normalise = function (L) {
    const errors = [], warnings = [], E = (m) => errors.push(m), W = (m) => warnings.push(m);
    const isPt = (p) => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]);
    const M = { project: L.project || {}, zones: [], lines: [], buildings: [], structures: [], trees: [], shrubs: [], features: [], labels: [] };
    M.north = Number(M.project.north || 0);
    // site
    const site = L.site || {};
    const bShape = site.boundary ? shapeOf({ shape: Array.isArray(site.boundary) ? { points: site.boundary } : site.boundary }) : null;
    if (!bShape || bShape.poly.length < 3) { E("The layout needs a site boundary (site.boundary) - at least three corner points in metres."); return { errors, warnings }; }
    M.boundary = bShape.poly;
    M.ground = ZONES[ZONE_ALIASES[site.ground] || site.ground] ? (ZONE_ALIASES[site.ground] || site.ground) : "lawn";
    M.groundLabel = site.label ? String(site.label) : "";
    M.groundLabelAt = isPt(site.label_at) ? site.label_at.map(Number) : null;

    const checkShape = (where, item) => {
      let sh = null;
      try { sh = shapeOf(item); } catch (e) { sh = null; }
      if (!sh || !sh.poly || sh.poly.length < 3 || sh.poly.some((q) => !isFinite(q[0]) || !isFinite(q[1]))) {
        E(`${where}: its shape is missing or incomplete. Use rect [x, y, width, depth], circle [x, y, radius], blob, arc, path or points.`); return null;
      }
      if (Math.abs(area(sh.poly)) < 0.02) { E(`${where}: its shape has (almost) no area.`); return null; }
      return sh;
    };

    (L.zones || []).forEach((z, i) => {
      const t0 = String(z.type || "").toLowerCase().replace(/[\s-]+/g, "_");
      const t = ZONES[t0] ? t0 : ZONE_ALIASES[t0];
      const where = `Zone ${i + 1} (${z.label || z.type || "no type"})`;
      if (!t) { E(`${where}: "${z.type}" isn't a zone type I know. Use one of: ${Object.keys(ZONES).join(", ")}.`); return; }
      const sh = checkShape(where, z); if (!sh) return;
      M.zones.push({ type: t, poly: sh.poly, label: z.label === undefined ? ZONES[t].label : String(z.label || ""),
        labelAt: isPt(z.label_at) ? z.label_at.map(Number) : null, fill: z.fill === undefined ? true : z.fill, seed: hashStr(JSON.stringify(z)) + i });
    });
    (L.lines || []).forEach((l, i) => {
      const t = String(l.type || "").toLowerCase().replace(/[\s-]+/g, "_");
      const where = `Line ${i + 1} (${l.label || l.type || "no type"})`;
      if (!LINES[t]) { E(`${where}: "${l.type}" isn't a line type I know. Use one of: ${Object.keys(LINES).join(", ")}.`); return; }
      let pts = (l.points || []).filter(isPt).map((q) => [+q[0], +q[1]]);
      if (pts.length < 2) { E(`${where}: needs at least two points.`); return; }
      const curve = l.curve != null ? !!l.curve : t === "stepping_stones" || t === "hedge" ? pts.length > 2 : false;
      if (curve) pts = smooth(pts);
      const size = Number(l.size || l.thickness || LINES[t].t);
      M.lines.push({ type: t, pts, h: Number(l.height || LINES[t].h), t: size, spacing: Number(l.spacing || Math.max(size + 0.15, 0.6)),
        label: l.label || "", labelAt: isPt(l.label_at) ? l.label_at.map(Number) : null, seed: hashStr(JSON.stringify(l)) + i });
    });
    (L.buildings || []).forEach((b, i) => {
      const t = String(b.type || "house").toLowerCase();
      const where = `Building ${i + 1} (${b.label || t})`;
      if (!BUILDINGS.includes(t)) W(`${where}: type "${b.type}" treated as a house.`);
      const sh = checkShape(where, b); if (!sh) return;
      const storeys = Number(b.storeys || (t === "house" ? 2 : 1));
      const roof = String(b.roof || (t === "house" ? "hip" : "flat")).toLowerCase();
      M.buildings.push({ type: t, sh, poly: sh.poly, storeys, h: Number(b.height || storeys * 2.7), roof, ridge: b.ridge || null,
        label: b.label || "", labelAt: isPt(b.label_at) ? b.label_at.map(Number) : null });
      if (roof !== "flat" && sh.kind !== "rect") W(`${where}: a ${roof} roof needs a rect shape - drawn with a flat roof instead.`);
    });
    (L.structures || []).forEach((s, i) => {
      const t = String(s.type || "").toLowerCase().replace(/[\s-]+/g, "_");
      const where = `Structure ${i + 1} (${s.label || s.type || "no type"})`;
      if (!STRUCTURES.includes(t)) { E(`${where}: "${s.type}" isn't a structure I know. Use one of: ${STRUCTURES.join(", ")}.`); return; }
      const sh = checkShape(where, s); if (!sh) return;
      if (t === "gazebo" && sh.kind !== "circle") { E(`${where}: give a gazebo a circle shape [x, y, radius].`); return; }
      if (t !== "gazebo" && !(sh.kind === "rect" || (t === "pergola" && sh.kind === "arc"))) {
        E(`${where}: give it a rect shape [x, y, width, depth]${t === "pergola" ? " or an arc for a curved pergola" : ""}.`); return;
      }
      M.structures.push({ type: t, sh, poly: sh.poly, h: s.height ? Number(s.height) : null, label: s.label === undefined ? "" : s.label,
        labelAt: isPt(s.label_at) ? s.label_at.map(Number) : null });
    });
    (L.planting || []).forEach((p, i) => {
      const t = String(p.type || "tree").toLowerCase();
      if (!isPt(p.at)) { E(`Planting ${i + 1}: needs "at": [x, y].`); return; }
      const at = p.at.map(Number);
      if (t === "tree") {
        const size = TREE_SIZES[p.size] ? p.size : "medium";
        const base = TREE_SIZES[size];
        M.trees.push({ x: at[0], y: at[1], h: Number(p.height || base.h), r: Number(p.spread ? p.spread / 2 : base.r), form: p.form || "round", seed: hashStr(JSON.stringify(p)) + i });
      } else {
        const r = { small: 0.35, medium: 0.55, large: 0.8 }[p.size] || 0.5;
        M.shrubs.push({ x: at[0], y: at[1], r, h: r * 1.5, tone: i % 4, seed: hashStr(JSON.stringify(p)) + i });
      }
    });
    (L.features || []).forEach((f, i) => {
      const t = String(f.type || "").toLowerCase().replace(/[\s-]+/g, "_");
      if (!FEATURES[t]) { E(`Feature ${i + 1}: "${f.type}" isn't a feature I know. Use one of: ${Object.keys(FEATURES).join(", ")}.`); return; }
      if (!isPt(f.at)) { E(`Feature ${i + 1} (${t}): needs "at": [x, y].`); return; }
      M.features.push({ type: t, x: +f.at[0], y: +f.at[1], size: Number(f.size || FEATURES[t]), rot: rad(Number(f.rotate || 0)), label: f.label || "", labelAt: isPt(f.label_at) ? f.label_at.map(Number) : null });
    });
    (L.labels || []).forEach((l, i) => {
      if (!l.text || !isPt(l.at)) { W(`Label ${i + 1} skipped: it needs "text" and "at".`); return; }
      M.labels.push({ text: String(l.text), at: l.at.map(Number), pointer: isPt(l.pointer) ? l.pointer.map(Number) : null, boxed: l.style === "box" || !!l.pointer });
    });

    // automatic loose planting in planting zones (concept only - no species)
    M.zones.forEach((z) => {
      if (z.type !== "planting" || z.fill === false) return;
      const rnd = mulberry(z.seed), poly = z.poly;
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const step = z.fill === "dense" ? 0.8 : z.fill === "sparse" ? 1.5 : 1.05;
      const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
      const nx = Math.max(1, Math.floor((X1 - X0) / step)), ny = Math.max(1, Math.floor((Y1 - Y0) / step));
      const sx = X0 + (X1 - X0 - (nx - 1) * step) / 2, sy = Y0 + (Y1 - Y0 - (ny - 1) * step) / 2;
      let n = 0;
      for (let ix = 0; ix < nx; ix++)
        for (let iy = 0; iy < ny; iy++) {
          const x = sx + ix * step, y = sy + iy * step;
          const q = [x + (rnd() - 0.5) * step * 0.5, y + (rnd() - 0.5) * step * 0.5];
          const ed = inPoly(q, poly) ? edgeDist(q, poly) : -1;
          if (ed < 0.18) continue;
          const r = Math.min(0.3 + rnd() * 0.25, ed * 1.05);
          if (n < 300) {
            // skip spots that a later hard zone covers
            M.shrubs.push({ x: q[0], y: q[1], r, h: r * (1.2 + rnd() * 0.8), tone: Math.floor(rnd() * 4), seed: Math.floor(rnd() * 1e9), auto: true, zone: z });
            n++;
          }
        }
    });
    // drop auto shrubs hidden under later zones / buildings
    M.shrubs = M.shrubs.filter((s) => {
      if (!s.auto) return true;
      const zi = M.zones.indexOf(s.zone);
      for (let k = zi + 1; k < M.zones.length; k++) if (inPoly([s.x, s.y], M.zones[k].poly)) return false;
      for (const b of M.buildings.concat(M.structures)) if (b.type !== "pergola" && inPoly([s.x, s.y], b.poly)) return false;
      return true;
    });

    // extents
    const pts = [].concat(M.boundary, ...M.zones.map((z) => z.poly), ...M.buildings.map((b) => b.poly), ...M.structures.map((s) => s.poly), ...M.lines.map((l) => l.pts));
    M.trees.forEach((t) => pts.push([t.x - t.r, t.y - t.r], [t.x + t.r, t.y + t.r]));
    const textBox = (str, at) => { const w = Math.max(...String(str).split("\n").map((t) => t.length)) * 0.13 + 0.5; pts.push([at[0] - w, at[1] - 0.6], [at[0] + w, at[1] + 0.6]); };
    M.labels.forEach((l) => textBox(l.text, l.at));
    M.features.forEach((f) => { pts.push([f.x, f.y]); if (f.label) textBox(f.label, f.labelAt || [f.x + 1.6, f.y - 1.6]); });
    M.lines.forEach((l) => { if (l.label && l.labelAt) textBox(l.label, l.labelAt); });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    M.ext = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    const bx = M.boundary.map((q) => q[0]), by = M.boundary.map((q) => q[1]);
    if (Math.max(...bx) - Math.min(...bx) > 300 || Math.max(...by) - Math.min(...by) > 300) W("The site is over 300 m across - check the layout is in metres, not millimetres.");
    if (!M.zones.length) W("No zones yet - the plan will just show the site boundary.");
    return { model: M, errors, warnings };
  };

  // ------------------------------------------------------------------ 3D geometry
  function Obj(name, group) { return { name, group, parts: {} }; }
  function part(o, colour) { return (o.parts[colour] = o.parts[colour] || []); }
  function tri(o, colour, a, b, c, out) {
    // out: optional reference point; flips winding so the face points away from it
    if (out) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const mx = (a[0] + b[0] + c[0]) / 3 - out[0], my = (a[1] + b[1] + c[1]) / 3 - out[1], mz = (a[2] + b[2] + c[2]) / 3 - out[2];
      if (nx * mx + ny * my + nz * mz < 0) { const t = b; b = c; c = t; }
    }
    part(o, colour).push(a, b, c);
  }
  function quad(o, colour, a, b, c, d, out) { tri(o, colour, a, b, c, out); tri(o, colour, a, c, d, out); }
  function flat(o, colour, poly, z, down) {
    const p = ccw(poly), T = triangulate(p);
    for (const [i, j, k] of T) {
      if (down) tri(o, colour, [p[i][0], p[i][1], z], [p[k][0], p[k][1], z], [p[j][0], p[j][1], z]);
      else tri(o, colour, [p[i][0], p[i][1], z], [p[j][0], p[j][1], z], [p[k][0], p[k][1], z]);
    }
  }
  function prism(o, colour, poly, z0, z1, top) {
    const p = ccw(poly);
    flat(o, top || colour, p, z1);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      tri(o, colour, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1]);
      tri(o, colour, [a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]);
    }
  }
  function box(o, colour, cx, cy, w, d, z0, z1, ang = 0, top) {
    prism(o, colour, rectCorners({ cx, cy, w, d, ang }), z0, z1, top);
  }
  function beam(o, colour, a, b, w, z0, z1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) return;
    box(o, colour, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, L, w, z0, z1, Math.atan2(dy, dx));
  }
  function cylinder(o, colour, cx, cy, r, z0, z1, n = 16, top) { prism(o, colour, circlePts(cx, cy, r, n), z0, z1, top); }
  function cone(o, colour, cx, cy, r, z0, z1, n = 12) {
    const p = circlePts(cx, cy, r, n), apex = [cx, cy, z1], ref = [cx, cy, z0 - 0.01];
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; tri(o, colour, [a[0], a[1], z0], [b[0], b[1], z0], apex, [cx, cy, z0]); }
  }
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => { const L = Math.hypot(...p); return p.map((x) => x / L); });
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const mid = {}; const getMid = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (mid[k] != null) return mid[k]; const p = v[a].map((x, i) => (x + v[b][i]) / 2); const L = Math.hypot(...p); v.push(p.map((x) => x / L)); return (mid[k] = v.length - 1); };
    const f2 = []; for (const [a, b, c] of f) { const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a); f2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    return { v, f: f2 };
  })();
  function blobSphere(o, colour, cx, cy, cz, rx, ry, rz, seed) {
    const r = mulberry(seed);
    const jit = ICO.v.map(() => 0.88 + r() * 0.2);
    const P = ICO.v.map((p, i) => [cx + p[0] * rx * jit[i], cy + p[1] * ry * jit[i], cz + p[2] * rz * jit[i]]);
    for (const [a, b, c] of ICO.f) tri(o, colour, P[a], P[b], P[c], [cx, cy, cz]);
  }
  const GREENS = [["#5f7d3a", "#7c9a4c", "#9cb766"], ["#6e8a45", "#8ea85a", "#b3c77d"], ["#4f6e3a", "#6a8c4c", "#86a964"], ["#7d8f46", "#a0ad5d", "#c4c87c"]];
  const SHRUBS = [["#4c6b33", "#68873f"], ["#5d7a3a", "#7a9850"], ["#3f5f35", "#587a45"], ["#6f7e3c", "#8f9c52"]];
  GC.GREENS = GREENS; GC.SHRUBS = SHRUBS;

  function hipRoof(o, colour, R, ze, zr, over = 0.3) {
    const w = R.w + 2 * over, d = R.d + 2 * over;
    const c = Math.cos(R.ang), s = Math.sin(R.ang);
    const W = (u, v, z) => [R.cx + u * c - v * s, R.cy + u * s + v * c, z];
    const ref = [R.cx, R.cy, ze - 2];
    const x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
    if (w >= d) {
      const r0 = W(x0 + d / 2, 0, zr), r1 = W(x1 - d / 2, 0, zr);
      quad(o, colour, W(x0, y0, ze), W(x1, y0, ze), r1, r0, ref);
      quad(o, colour, W(x1, y1, ze), W(x0, y1, ze), r0, r1, ref);
      tri(o, colour, W(x1, y0, ze), W(x1, y1, ze), r1, ref);
      tri(o, colour, W(x0, y1, ze), W(x0, y0, ze), r0, ref);
    } else {
      const r0 = W(0, y0 + w / 2, zr), r1 = W(0, y1 - w / 2, zr);
      quad(o, colour, W(x1, y0, ze), W(x1, y1, ze), r1, r0, ref);
      quad(o, colour, W(x0, y1, ze), W(x0, y0, ze), r0, r1, ref);
      tri(o, colour, W(x0, y0, ze), W(x1, y0, ze), r0, ref);
      tri(o, colour, W(x1, y1, ze), W(x0, y1, ze), r1, ref);
    }
    // soffit underneath
    quad(o, colour, W(x0, y0, ze), W(x0, y1, ze), W(x1, y1, ze), W(x1, y0, ze), [R.cx, R.cy, ze + 5]);
  }
  function gableRoof(o, colour, endColour, R, ze, zr, alongLong = true, over = 0.25) {
    // ridge runs along the longer side unless told otherwise
    let w = R.w, d = R.d, ang = R.ang;
    if ((alongLong && d > w) || (!alongLong && w > d)) { w = R.d; d = R.w; ang = R.ang + Math.PI / 2; }
    const c = Math.cos(ang), s = Math.sin(ang);
    const W = (u, v, z) => [R.cx + u * c - v * s, R.cy + u * s + v * c, z];
    const ref = [R.cx, R.cy, ze - 2];
    const x0 = -w / 2 - over, x1 = w / 2 + over, y0 = -d / 2 - over, y1 = d / 2 + over;
    quad(o, colour, W(x0, y0, ze), W(x1, y0, ze), W(x1, 0, zr), W(x0, 0, zr), ref);
    quad(o, colour, W(x1, y1, ze), W(x0, y1, ze), W(x0, 0, zr), W(x1, 0, zr), ref);
    quad(o, colour, W(x0, y0, ze), W(x0, y1, ze), W(x1, y1, ze), W(x1, y0, ze), [R.cx, R.cy, ze + 5]);
    // gable end walls
    const ref2 = [R.cx, R.cy, (ze + zr) / 2];
    tri(o, endColour, W(-w / 2, -d / 2, ze), W(-w / 2, d / 2, ze), W(-w / 2, 0, zr), ref2);
    tri(o, endColour, W(w / 2, -d / 2, ze), W(w / 2, d / 2, ze), W(w / 2, 0, zr), ref2);
  }

  GC.build3D = function (M) {
    const objs = [];
    const add = (o) => { if (Object.keys(o.parts).length) objs.push(o); return o; };
    // ground (site)
    const g = Obj("Site ground", "Ground"); flat(g, ZONES[M.ground].colour, M.boundary, 0); add(g);
    // zones (later zones sit slightly higher so faces never fight)
    M.zones.forEach((z, i) => {
      const o = Obj(`${(z.label || z.type).replace(/\n/g, " ")} (${z.type.replace(/_/g, " ")})`, "Surfaces");
      const zz = 0.005 * (i + 1);
      const info = ZONES[z.type];
      if (info.height) prism(o, info.colour, z.poly, 0, info.height, info.top);
      else flat(o, info.colour, z.poly, zz);
      add(o);
    });
    // lines
    M.lines.forEach((l, i) => {
      const o = Obj(l.label || l.type.replace(/_/g, " "), "Boundaries & walls");
      const col = LINES[l.type].colour;
      if (l.type === "fence" || l.type === "trellis") {
        prism(o, col, band(l.pts, l.t), 0.05, l.h);
        for (const [x, y, a] of along(l.pts, 1.8, 0)) box(o, col, x, y, 0.1, 0.1, 0, l.h + 0.05, a);
      } else if (l.type === "screen") {
        for (const [x, y, a] of along(l.pts, 0.16, 0.08)) box(o, col, x, y, 0.07, l.t, 0, l.h, a);
        const end = l.pts.length - 1;
        for (let k = 1; k <= end; k++) beam(o, col, l.pts[k - 1], l.pts[k], l.t + 0.04, l.h, l.h + 0.08);
      } else if (l.type === "hedge") {
        prism(o, col, band(l.pts, l.t), 0, l.h, "#5f7f45");
      } else if (l.type === "stepping_stones") {
        const r = mulberry(l.seed);
        for (const [x, y, a] of along(l.pts, l.spacing, l.t / 2)) {
          const st = []; for (let k = 0; k < 9; k++) { const tt = (k / 9) * 2 * Math.PI; const rr = (l.t / 2) * (0.85 + r() * 0.2); st.push([x + rr * Math.cos(tt + a), y + rr * 0.75 * Math.sin(tt + a)]); }
          prism(o, col, st, 0.01, 0.06 + 0.002 * i);
        }
      } else {
        prism(o, col, band(l.pts, l.t), 0, l.h);
      }
      add(o);
    });
    // buildings
    M.buildings.forEach((b) => {
      const o = Obj(b.label || b.type, "Buildings");
      const hasPitch = b.roof !== "flat" && b.sh.kind === "rect";
      prism(o, C.house, b.poly, 0, b.h, hasPitch ? C.house : C.roofFlat);
      if (hasPitch) {
        const R = b.sh.R, span = Math.min(R.w, R.d);
        const zr = b.h + span * 0.42;
        if (b.roof === "gable") gableRoof(o, C.roof, C.house, R, b.h, zr, b.ridge !== "short");
        else hipRoof(o, C.roof, R, b.h, zr);
      }
      add(o);
    });
    // structures
    M.structures.forEach((s) => {
      const o = Obj(s.label || s.type.replace(/_/g, " "), "Structures");
      const t = s.type;
      if (t === "pergola" && s.sh.kind === "arc") {
        const { cx, cy, r1, r2, a0, a1 } = s.sh; const rin = Math.min(r1, r2), rout = Math.max(r1, r2);
        const h = s.h || 2.6, span = Math.abs(a1 - a0), nPosts = Math.max(3, Math.round(((span / 360) * 2 * Math.PI * rout) / 2.2) + 1);
        const pi = rin + 0.15, po = rout - 0.15;
        for (let k = 0; k < nPosts; k++) {
          const a = rad(a0 + ((a1 - a0) * k) / (nPosts - 1));
          for (const rr of [pi, po]) box(o, C.white, cx + rr * Math.cos(a), cy + rr * Math.sin(a), 0.15, 0.15, 0, h, a);
        }
        const seg = Math.max(8, Math.round(span / 7));
        for (const rr of [pi, po]) for (let k = 0; k < seg; k++) {
          const aa = rad(a0 + ((a1 - a0) * k) / seg), ab = rad(a0 + ((a1 - a0) * (k + 1)) / seg);
          beam(o, C.white, [cx + rr * Math.cos(aa), cy + rr * Math.sin(aa)], [cx + rr * Math.cos(ab), cy + rr * Math.sin(ab)], 0.14, h, h + 0.2);
        }
        const nr = Math.max(6, Math.round(((span / 360) * 2 * Math.PI * (rin + rout) / 2) / 0.55));
        for (let k = 0; k < nr; k++) {
          const a = rad(a0 + ((a1 - a0) * (k + 0.5)) / nr);
          beam(o, C.white, [cx + (rin - 0.25) * Math.cos(a), cy + (rin - 0.25) * Math.sin(a)], [cx + (rout + 0.25) * Math.cos(a), cy + (rout + 0.25) * Math.sin(a)], 0.08, h + 0.2, h + 0.35);
        }
      } else if (t === "pergola") {
        const R = s.sh.R, h = s.h || 2.5;
        let w = R.w, d = R.d, ang = R.ang; if (d > w) { w = R.d; d = R.w; ang = R.ang + Math.PI / 2; }
        const c = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [R.cx + u * c - v * sn, R.cy + u * sn + v * c];
        const nPosts = Math.max(2, Math.ceil(w / 2.6) + 1);
        for (let k = 0; k < nPosts; k++) { const u = -w / 2 + 0.1 + ((w - 0.2) * k) / (nPosts - 1); for (const v of [-d / 2 + 0.1, d / 2 - 0.1]) { const p = P(u, v); box(o, C.white, p[0], p[1], 0.15, 0.15, 0, h, ang); } }
        for (const v of [-d / 2 + 0.1, d / 2 - 0.1]) beam(o, C.white, P(-w / 2 - 0.2, v), P(w / 2 + 0.2, v), 0.15, h, h + 0.2);
        const nr = Math.max(3, Math.round(w / 0.5));
        for (let k = 0; k <= nr; k++) { const u = -w / 2 + (w * k) / nr; beam(o, C.white, P(u, -d / 2 - 0.25), P(u, d / 2 + 0.25), 0.08, h + 0.2, h + 0.35); }
      } else if (t === "gazebo") {
        const { cx, cy, r } = s.sh, h = s.h || 2.4;
        for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; box(o, C.white, cx + (r - 0.1) * Math.cos(a), cy + (r - 0.1) * Math.sin(a), 0.15, 0.15, 0, h, a); }
        cone(o, C.roof, cx, cy, r + 0.3, h, h + r * 0.8, 6);
      } else if (t === "carport") {
        const R = s.sh.R, h = s.h || 2.5;
        for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const c = Math.cos(R.ang), sn = Math.sin(R.ang), uu = (u * (R.w / 2 - 0.15)), vv = (v * (R.d / 2 - 0.15));
          box(o, C.white, R.cx + uu * c - vv * sn, R.cy + uu * sn + vv * c, 0.15, 0.15, 0, h, R.ang);
        }
        box(o, C.roofFlat, R.cx, R.cy, R.w + 0.2, R.d + 0.2, h, h + 0.2, R.ang);
      } else {
        const R = s.sh.R;
        const cfg = { shed: [2.1, C.timber, C.roof], summerhouse: [2.3, "#e8e2d4", C.roof], greenhouse: [1.9, C.glass, C.glass], garden_room: [2.5, "#e8e2d4", C.roofFlat] }[t];
        const h = s.h || cfg[0];
        if (t === "garden_room") { prism(o, cfg[1], s.poly, 0, h, cfg[2]); box(o, cfg[2], R.cx, R.cy, R.w + 0.3, R.d + 0.3, h, h + 0.15, R.ang); }
        else { prism(o, cfg[1], s.poly, 0, h); gableRoof(o, cfg[2], cfg[1], R, h, h + Math.min(R.w, R.d) * 0.35, true, 0.12); }
      }
      add(o);
    });
    // features
    M.features.forEach((f) => {
      const o = Obj(f.label || f.type.replace(/_/g, " "), "Features");
      const { x, y, size: S, rot: a } = f;
      switch (f.type) {
        case "firebowl": cylinder(o, C.steel, x, y, S / 2, 0, 0.45, 18, C.fire); break;
        case "dining_table": {
          const c = Math.cos(a), s = Math.sin(a), P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
          box(o, C.timber, x, y, S, 0.9, 0.7, 0.76, a);
          for (const [u, v] of [[-S / 2 + 0.1, -0.35], [S / 2 - 0.1, -0.35], [S / 2 - 0.1, 0.35], [-S / 2 + 0.1, 0.35]]) { const p = P(u, v); box(o, C.timber, p[0], p[1], 0.07, 0.07, 0, 0.7, a); }
          for (const v of [-0.8, 0.8]) { const p = P(0, v); box(o, C.timber, p[0], p[1], S * 0.9, 0.35, 0.4, 0.46, a); box(o, C.timber, p[0], p[1], S * 0.85, 0.08, 0, 0.4, a); }
          break;
        }
        case "bench": box(o, C.timber, x, y, S, 0.45, 0.4, 0.46, a); box(o, C.timber, x, y, S * 0.9, 0.08, 0, 0.4, a); break;
        case "pot": cylinder(o, "#8b6a52", x, y, S / 2, 0, S * 0.8, 16, C.soil); blobSphere(o, "#6a8c4c", x, y, S * 0.8 + S * 0.25, S * 0.45, S * 0.45, S * 0.35, f.x * 7 + f.y); break;
        case "water_feature": cylinder(o, C.stone, x, y, S / 2, 0, 0.5, 18, C.water); cylinder(o, C.stone, x, y, S * 0.12, 0.5, 0.9, 10); break;
        case "sculpture": box(o, "#8c8c88", x, y, S, S, 0, S * 3, a); break;
        case "boulder": blobSphere(o, C.stone, x, y, S * 0.15, S / 2, S * 0.42, S * 0.4, Math.round(x * 13 + y * 7)); break;
        case "car": {
          const c = Math.cos(a), s = Math.sin(a), P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
          box(o, C.car, x, y, S, 1.8, 0.25, 0.85, a);
          const p = P(-S * 0.05, 0); box(o, "#9fb8d0", p[0], p[1], S * 0.5, 1.6, 0.85, 1.4, a);
          for (const [u, v] of [[-S * 0.32, -0.8], [S * 0.32, -0.8], [S * 0.32, 0.8], [-S * 0.32, 0.8]]) { const q = P(u, v); cylinder(o, "#222", q[0], q[1], 0.32, 0, 0.3, 10); }
          break;
        }
        case "person": cylinder(o, C.person, x, y, 0.17, 0, 1.35, 10); blobSphere(o, "#d9b38c", x, y, 1.55, 0.13, 0.13, 0.15, 3); break;
        case "lounger": box(o, C.white, x, y, S, 0.65, 0.25, 0.35, a); break;
        case "hot_tub": box(o, C.timber, x, y, S, S, 0, 0.9, a, C.water); break;
        case "bin_store": box(o, C.timber, x, y, S, 0.9, 0, 1.3, a); break;
      }
      add(o);
    });
    // trees
    M.trees.forEach((t, i) => {
      const o = Obj(`Tree ${i + 1}`, "Planting");
      const pal = GREENS[t.seed % GREENS.length], rnd = mulberry(t.seed);
      if (t.form === "conifer") { cylinder(o, C.trunk, t.x, t.y, 0.12, 0, t.h * 0.25, 8); cone(o, pal[0], t.x, t.y, t.r, t.h * 0.2, t.h, 10); }
      else {
        const trunks = t.form === "multistem" ? 3 : 1;
        for (let k = 0; k < trunks; k++) {
          const dx = trunks > 1 ? Math.cos((k * 2 * Math.PI) / 3) * 0.3 : 0, dy = trunks > 1 ? Math.sin((k * 2 * Math.PI) / 3) * 0.3 : 0;
          cylinder(o, C.trunk, t.x + dx, t.y + dy, trunks > 1 ? 0.08 : 0.14, 0, t.h * 0.55, 8);
        }
        const upright = t.form === "upright";
        const n = t.form === "airy" ? 7 : 5;
        const cz = t.h - t.r * (upright ? 1.3 : 0.95);
        for (let k = 0; k < n; k++) {
          const a = rnd() * 6.28, rr = rnd() * t.r * 0.45;
          const sx = t.r * (0.55 + rnd() * 0.2) * (upright ? 0.75 : 1);
          blobSphere(o, pal[k % 3], t.x + rr * Math.cos(a), t.y + rr * Math.sin(a), cz + (rnd() - 0.4) * t.r * (upright ? 1.0 : 0.6), sx, sx, sx * (upright ? 1.5 : 0.85), Math.floor(rnd() * 1e9));
        }
      }
      add(o);
    });
    // shrubs: one object per zone (keeps the SketchUp outliner tidy)
    const shrubGroups = new Map();
    M.shrubs.forEach((s) => {
      const key = s.zone ? s.zone : "free";
      if (!shrubGroups.has(key)) shrubGroups.set(key, Obj(s.zone ? `Planting mass ${M.zones.indexOf(s.zone) + 1}` : "Shrubs", "Planting"));
      const o = shrubGroups.get(key), pal = SHRUBS[s.tone % SHRUBS.length];
      blobSphere(o, pal[s.seed % 2], s.x, s.y, s.h * 0.45, s.r, s.r, s.h * 0.55, s.seed);
    });
    shrubGroups.forEach((o) => add(o));
    return objs;
  };

  // ------------------------------------------------------------------ COLLADA (.dae) for SketchUp
  function esc(s) { return String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c])); }
  function hexToRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
  GC.toDAE = function (objs, M) {
    const colours = [...new Set(objs.flatMap((o) => Object.keys(o.parts)))];
    const mid = (c) => "mat" + colours.indexOf(c);
    const r6 = (v) => (Math.round(v * 1e5) / 1e5).toString();
    let geoms = "", effects = "", materials = "";
    colours.forEach((c) => {
      const [r, g, b] = hexToRgb(c);
      effects += `<effect id="${mid(c)}-fx"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} 1</color></diffuse></lambert></technique></profile_COMMON></effect>\n`;
      materials += `<material id="${mid(c)}" name="${mid(c)}_${c.replace("#", "")}"><instance_effect url="#${mid(c)}-fx"/></material>\n`;
    });
    const groups = new Map();
    objs.forEach((o, oi) => {
      const pos = [], nor = [], tris = {};
      const vIndex = new Map();
      Object.entries(o.parts).forEach(([colour, verts]) => {
        const idx = (tris[colour] = []);
        for (let k = 0; k < verts.length; k += 3) {
          const a = verts[k], b = verts[k + 1], c = verts[k + 2];
          const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz);
          if (L < 1e-12) continue;
          nx /= L; ny /= L; nz /= L;
          const ni = nor.length / 3; nor.push(nx, ny, nz);
          for (const v of [a, b, c]) {
            const key = r6(v[0]) + "," + r6(v[1]) + "," + r6(v[2]);
            let vi = vIndex.get(key); if (vi == null) { vi = pos.length / 3; pos.push(v[0], v[1], v[2]); vIndex.set(key, vi); }
            idx.push(vi, ni);
          }
        }
      });
      const gid = `g${oi}`;
      let tr = "";
      Object.entries(tris).forEach(([colour, idx]) => { if (idx.length) tr += `<triangles material="${mid(colour)}" count="${idx.length / 6}"><input semantic="VERTEX" source="#${gid}-v" offset="0"/><input semantic="NORMAL" source="#${gid}-n" offset="1"/><p>${idx.join(" ")}</p></triangles>`; });
      geoms += `<geometry id="${gid}" name="${esc(o.name)}"><mesh>` +
        `<source id="${gid}-p"><float_array id="${gid}-pa" count="${pos.length}">${pos.map(r6).join(" ")}</float_array><technique_common><accessor source="#${gid}-pa" count="${pos.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` +
        `<source id="${gid}-n"><float_array id="${gid}-na" count="${nor.length}">${nor.map(r6).join(" ")}</float_array><technique_common><accessor source="#${gid}-na" count="${nor.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` +
        `<vertices id="${gid}-v"><input semantic="POSITION" source="#${gid}-p"/></vertices>` +
        tr + `</mesh></geometry>\n`;
      if (!groups.has(o.group)) groups.set(o.group, []);
      const bind = Object.keys(tris).map((c) => `<instance_material symbol="${mid(c)}" target="#${mid(c)}"/>`).join("");
      groups.get(o.group).push(`<node id="n${oi}" name="${esc(o.name)}"><instance_geometry url="#${gid}"><bind_material><technique_common>${bind}</technique_common></bind_material></instance_geometry></node>`);
    });
    let nodes = "";
    let gi = 0;
    groups.forEach((list, name) => { nodes += `<node id="grp${gi++}" name="${esc(name)}">${list.join("")}</node>\n`; });
    const title = esc(M.project.name || "Garden concept");
    const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
<asset><contributor><authoring_tool>Garden Concept Converter</authoring_tool></contributor><created>${now}</created><modified>${now}</modified><title>${title}</title><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset>
<library_effects>
${effects}</library_effects>
<library_materials>
${materials}</library_materials>
<library_geometries>
${geoms}</library_geometries>
<library_visual_scenes><visual_scene id="scene" name="${title}"><node id="root" name="${title}">
${nodes}</node></visual_scene></library_visual_scenes>
<scene><instance_visual_scene url="#scene"/></scene>
</COLLADA>
`;
  };

  // ------------------------------------------------------------------ DXF (R12, 2D base plan, metres)
  GC.toDXF = function (M) {
    const out = [];
    const P = (code, val) => out.push(String(code), String(val));
    const layers = new Map();
    const aci = { BOUNDARY: 7, LAWN: 3, PLANTING: 32, PAVING: 8, SANDSTONE: 41, RESIN_BOUND: 9, GRAVEL: 33, HOGGIN: 33, DECKING: 30,
      WATER: 5, POOL: 5, RAISED_BED: 30, VEG_BED: 30, BARK: 32, MEADOW: 83, BUILDING: 7, STRUCTURE: 7, WALL: 8, RETAINING_WALL: 8,
      FENCE: 32, SCREEN: 32, HEDGE: 94, TRELLIS: 7, EDGING: 8, TREE: 94, SHRUB: 96, FEATURE: 7, LABEL: 7 };
    const lay = (name) => { const k = "GC-" + name.toUpperCase(); if (!layers.has(k)) layers.set(k, aci[name.toUpperCase()] || 7); return k; };
    const ents = [];
    const E = (...kv) => ents.push(kv);
    const poly = (pts, layer, closed = true) => {
      ents.push(["0", "POLYLINE", "8", layer, "66", "1", "10", "0", "20", "0", "30", "0", "70", closed ? "1" : "0"]);
      pts.forEach((p) => ents.push(["0", "VERTEX", "8", layer, "10", p[0].toFixed(4), "20", p[1].toFixed(4), "30", "0"]));
      ents.push(["0", "SEQEND", "8", layer]);
    };
    const circle = (x, y, r, layer) => ents.push(["0", "CIRCLE", "8", layer, "10", x.toFixed(4), "20", y.toFixed(4), "30", "0", "40", r.toFixed(4)]);
    const text = (s, x, y, h, layer) => String(s).split("\n").forEach((line, i, arr) => {
      const yy = y + ((arr.length - 1) / 2 - i) * h * 1.4;
      ents.push(["0", "TEXT", "8", layer, "10", x.toFixed(4), "20", yy.toFixed(4), "30", "0", "40", h.toFixed(3), "1", line.replace(/[^\x20-\x7e]/g, ""), "72", "1", "73", "2", "11", x.toFixed(4), "21", yy.toFixed(4), "31", "0"]);
    });
    poly(M.boundary, lay("boundary"));
    M.zones.forEach((z) => { poly(z.poly, lay(z.type)); if (z.label) { const p = z.labelAt || labelPoint(z.poly); text(z.label, p[0], p[1], 0.35, lay("label")); } });
    M.lines.forEach((l) => {
      if (l.type === "stepping_stones") { for (const [x, y] of along(l.pts, l.spacing, l.t / 2)) circle(x, y, l.t / 2, lay(l.type)); }
      else poly(band(l.pts, Math.max(l.t, 0.05)), lay(l.type));
    });
    M.buildings.forEach((b) => { poly(b.poly, lay("building")); if (b.label) { const p = b.labelAt || labelPoint(b.poly); text(b.label, p[0], p[1], 0.4, lay("label")); } });
    M.structures.forEach((s) => { poly(s.poly, lay("structure")); if (s.label) { const p = s.labelAt || labelPoint(s.poly); text(s.label, p[0], p[1], 0.35, lay("label")); } });
    M.trees.forEach((t) => { circle(t.x, t.y, t.r, lay("tree")); circle(t.x, t.y, 0.15, lay("tree")); });
    M.shrubs.forEach((s) => circle(s.x, s.y, s.r, lay("shrub")));
    M.features.forEach((f) => { circle(f.x, f.y, Math.max(0.2, Math.min(f.size, 2.5) / 2), lay("feature")); if (f.label) { const p = f.labelAt || [f.x + 1, f.y + 0.5]; text(f.label, p[0], p[1], 0.3, lay("label")); } });
    M.labels.forEach((l) => text(l.text, l.at[0], l.at[1], 0.35, lay("label")));
    // header
    P(0, "SECTION"); P(2, "HEADER"); P(9, "$ACADVER"); P(1, "AC1009"); P(9, "$INSBASE"); P(10, 0); P(20, 0); P(30, 0);
    P(9, "$EXTMIN"); P(10, M.ext.x0.toFixed(3)); P(20, M.ext.y0.toFixed(3)); P(30, 0);
    P(9, "$EXTMAX"); P(10, M.ext.x1.toFixed(3)); P(20, M.ext.y1.toFixed(3)); P(30, 0);
    P(9, "$LUNITS"); P(70, 2); P(9, "$LUPREC"); P(70, 3); P(0, "ENDSEC");
    P(0, "SECTION"); P(2, "TABLES");
    P(0, "TABLE"); P(2, "LTYPE"); P(70, 1); P(0, "LTYPE"); P(2, "CONTINUOUS"); P(70, 0); P(3, "Solid line"); P(72, 65); P(73, 0); P(40, 0.0); P(0, "ENDTAB");
    P(0, "TABLE"); P(2, "LAYER"); P(70, layers.size + 1);
    P(0, "LAYER"); P(2, "0"); P(70, 0); P(62, 7); P(6, "CONTINUOUS");
    layers.forEach((col, name) => { P(0, "LAYER"); P(2, name); P(70, 0); P(62, col); P(6, "CONTINUOUS"); });
    P(0, "ENDTAB"); P(0, "ENDSEC");
    P(0, "SECTION"); P(2, "ENTITIES");
    ents.forEach((kv) => { for (let i = 0; i < kv.length; i += 2) P(kv[i], kv[i + 1]); });
    P(0, "ENDSEC"); P(0, "EOF");
    return out.join("\r\n") + "\r\n";
  };

  GC.slug = function (M) { return (String(M.project.name || "garden-concept").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "garden-concept"); };

  root.GC = GC;
})(typeof window !== "undefined" ? window : globalThis);
