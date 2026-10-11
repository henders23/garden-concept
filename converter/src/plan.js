/* Garden Concept Converter - coloured concept plan (canvas), in the style of a SketchUp top view. */
(function (root) {
  "use strict";
  const GC = root.GC, C = GC.colours, U = GC.util;

  function shade(hex, k) {
    const h = hex.replace("#", "");
    const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  /** Lay out the plan: returns {W, H, s, x0, y1, pad} for a given pixels-per-metre. */
  GC.planFrame = function (M, s, padM = 1.6) {
    const x0 = M.ext.x0 - padM, x1 = M.ext.x1 + padM, y0 = M.ext.y0 - padM - 1.8, y1 = M.ext.y1 + padM;
    return { s, x0, y1, W: Math.round((x1 - x0) * s), H: Math.round((y1 - y0) * s), widthM: x1 - x0, heightM: y1 - y0 };
  };

  GC.drawPlan = function (ctx, M, F) {
    const s = F.s;
    const X = (x) => (x - F.x0) * s, Y = (y) => (F.y1 - y) * s;
    const lw = (m) => Math.max(0.6, m * s);
    const path = (poly) => { ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath(); };
    const fillPoly = (poly, fill, stroke = "#141414", w = 0.04) => { path(poly); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw(w); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.stroke(); } };
    const rnd0 = U.mulberry(7);

    // background
    ctx.fillStyle = C.sage; ctx.fillRect(0, 0, F.W, F.H);
    // site ground
    fillPoly(M.boundary, GC.ZONES[M.ground].colour, "#141414", 0.05);
    if (M.ground === "lawn") grass(M.boundary, 0, 0.28);

    function grass(poly, idx, density) {
      ctx.save(); path(poly); ctx.clip();
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const area = Math.abs(U.area(poly)), n = Math.round(area * density), r = U.mulberry(1000 + idx);
      ctx.strokeStyle = "rgba(20,24,14,0.85)"; ctx.lineWidth = lw(0.035); ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys));
        if (!U.inPoly([x, y], poly)) continue;
        const L = 0.35 + r() * 0.25;
        ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + L), Y(y + L * 0.35)); ctx.stroke();
      }
      ctx.restore();
    }
    function speckle(poly, idx, col, density, size) {
      ctx.save(); path(poly); ctx.clip();
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const n = Math.min(6000, Math.round(Math.abs(U.area(poly)) * density)), r = U.mulberry(2000 + idx);
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys));
        ctx.fillRect(X(x), Y(y), Math.max(1, size * s), Math.max(1, size * s));
      }
      ctx.restore();
    }
    function hatch(poly, col, spacing, angleDeg, w) {
      ctx.save(); path(poly); ctx.clip();
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 1;
      const a = (angleDeg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      ctx.strokeStyle = col; ctx.lineWidth = lw(w);
      for (let t = -R; t <= R; t += spacing) {
        ctx.beginPath(); ctx.moveTo(X(cx + vx * t - ux * R), Y(cy + vy * t - uy * R)); ctx.lineTo(X(cx + vx * t + ux * R), Y(cy + vy * t + uy * R)); ctx.stroke();
      }
      ctx.restore();
    }

    // zones
    M.zones.forEach((z, i) => {
      const info = GC.ZONES[z.type];
      fillPoly(z.poly, info.colour, "#141414", 0.04);
      switch (z.type) {
        case "lawn": grass(z.poly, i + 1, 0.3); break;
        case "meadow": grass(z.poly, i + 1, 0.7); break;
        case "gravel": case "hoggin": speckle(z.poly, i, "rgba(40,30,20,0.35)", 60, 0.045); break;
        case "resin_bound": speckle(z.poly, i, "rgba(90,85,75,0.28)", 45, 0.04); break;
        case "bark": speckle(z.poly, i, "rgba(30,20,10,0.4)", 40, 0.07); break;
        case "paving": hatch(z.poly, "rgba(0,0,0,0.08)", 0.6, 0, 0.015); hatch(z.poly, "rgba(0,0,0,0.08)", 0.9, 90, 0.015); break;
        case "sandstone": hatch(z.poly, "rgba(80,60,30,0.16)", 0.6, 0, 0.015); hatch(z.poly, "rgba(80,60,30,0.16)", 0.6, 90, 0.015); break;
        case "decking": hatch(z.poly, "rgba(60,35,15,0.35)", 0.15, 0, 0.012); break;
        case "water": case "pool": {
          ctx.save(); path(z.poly); ctx.clip();
          const r = U.mulberry(3000 + i); const xs = z.poly.map((q) => q[0]), ys = z.poly.map((q) => q[1]);
          ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = lw(0.03);
          for (let k = 0; k < Math.abs(U.area(z.poly)) * 1.2; k++) {
            const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys));
            ctx.beginPath(); ctx.arc(X(x), Y(y), 0.35 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
          }
          ctx.restore();
          fillPoly(z.poly, "rgba(0,0,0,0)", "#f5f5f0", 0.12); fillPoly(z.poly, "rgba(0,0,0,0)", "#141414", 0.035);
          break;
        }
        case "raised_bed": case "veg_bed": {
          const inset = insetPoly(z.poly, 0.1);
          path(inset); ctx.fillStyle = info.top; ctx.fill();
          if (z.type === "veg_bed") speckle(inset, i, "rgba(150,190,90,0.6)", 80, 0.06);
          fillPoly(inset, "rgba(0,0,0,0)", "rgba(0,0,0,0.45)", 0.015);
          fillPoly(z.poly, "rgba(0,0,0,0)", "#141414", 0.035);
          break;
        }
      }
    });

    function insetPoly(poly, d) {
      const c = U.centroid(poly);
      const n = poly.length, out = [];
      for (let i = 0; i < n; i++) {
        const a = poly[(i + n - 1) % n], b = poly[i], cc = poly[(i + 1) % n];
        const n1 = norm([-(b[1] - a[1]), b[0] - a[0]]), n2 = norm([-(cc[1] - b[1]), cc[0] - b[0]]);
        let m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
        const cos = m[0] * n1[0] + m[1] * n1[1];
        const k = d / Math.max(0.3, cos);
        out.push([b[0] + m[0] * k, b[1] + m[1] * k]);
      }
      return out;
      function norm(v) { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; }
    }

    // lines
    M.lines.forEach((l) => {
      const col = GC.LINES[l.type].colour;
      if (l.type === "fence" || l.type === "trellis" || l.type === "edging") {
        ctx.strokeStyle = l.type === "edging" ? "#2c2c2c" : shade(col, 0.8); ctx.lineWidth = lw(l.type === "edging" ? 0.05 : 0.07); ctx.lineCap = "butt";
        ctx.beginPath(); l.pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke();
        if (l.type !== "edging") for (const [x, y] of U.along(l.pts, 1.8, 0)) { ctx.fillStyle = shade(col, 0.6); ctx.fillRect(X(x) - 0.06 * s, Y(y) - 0.06 * s, 0.12 * s, 0.12 * s); }
      } else if (l.type === "hedge") {
        const poly = U.band(l.pts, l.t);
        fillPoly(poly, "#557a3f", "#1f2d15", 0.03);
        const r = U.mulberry(Math.round(l.pts[0][0] * 31 + l.pts[0][1] * 17));
        for (const [x, y] of U.along(l.pts, 0.35, 0.15)) {
          ctx.beginPath(); ctx.arc(X(x + (r() - 0.5) * 0.15), Y(y + (r() - 0.5) * 0.15), l.t * 0.42 * s, 0, 6.283);
          ctx.fillStyle = r() < 0.5 ? "#6a8c4c" : "#4f6e3a"; ctx.fill(); ctx.strokeStyle = "rgba(20,30,12,0.6)"; ctx.lineWidth = lw(0.015); ctx.stroke();
        }
      } else if (l.type === "stepping_stones") {
        const r = U.mulberry(l.seed);
        for (const [x, y, a] of U.along(l.pts, l.spacing, l.t / 2)) {
          const st = []; for (let k = 0; k < 9; k++) { const tt = (k / 9) * 6.283; const rr = (l.t / 2) * (0.85 + r() * 0.2); st.push([x + rr * Math.cos(tt + a), y + rr * 0.75 * Math.sin(tt + a)]); }
          fillPoly(st, "#cfcac0", "#141414", 0.02);
        }
      } else if (l.type === "screen") {
        const poly = U.band(l.pts, Math.max(l.t, 0.12));
        fillPoly(poly, col, "#141414", 0.025);
        ctx.strokeStyle = "rgba(255,230,200,0.35)"; ctx.lineWidth = lw(0.012);
        for (const [x, y, a] of U.along(l.pts, 0.16, 0.08)) {
          const nx = -Math.sin(a) * 0.06, ny = Math.cos(a) * 0.06;
          ctx.beginPath(); ctx.moveTo(X(x - nx), Y(y - ny)); ctx.lineTo(X(x + nx), Y(y + ny)); ctx.stroke();
        }
      } else {
        fillPoly(U.band(l.pts, l.t), l.type === "retaining_wall" ? "#a9a49b" : "#bdb8ae", "#141414", 0.03);
      }
    });

    // buildings - roof plans
    const sun = [-0.55, 0.6];
    M.buildings.forEach((b) => {
      const R = b.sh.R;
      if (b.roof !== "flat" && b.sh.kind === "rect") {
        const over = 0.3, w = R.w + 2 * over, d = R.d + 2 * over, c = Math.cos(R.ang), sn = Math.sin(R.ang);
        const W = (u, v) => [R.cx + u * c - v * sn, R.cy + u * sn + v * c];
        const facets = [];
        if (b.roof === "gable") {
          let ww = w, dd = d, rot = false; if ((b.ridge !== "short" && dd > ww) || (b.ridge === "short" && ww > dd)) { rot = true; }
          const P = rot ? (u, v) => W(v, u) : W; const A = rot ? dd : ww, B = rot ? ww : dd;
          facets.push([[P(-A / 2, -B / 2), P(A / 2, -B / 2), P(A / 2, 0), P(-A / 2, 0)], rot ? [-1, 0] : [0, -1]]);
          facets.push([[P(-A / 2, 0), P(A / 2, 0), P(A / 2, B / 2), P(-A / 2, B / 2)], rot ? [1, 0] : [0, 1]]);
        } else if (w >= d) {
          const r0 = W(-w / 2 + d / 2, 0), r1 = W(w / 2 - d / 2, 0);
          facets.push([[W(-w / 2, -d / 2), W(w / 2, -d / 2), r1, r0], [0, -1]], [[W(w / 2, d / 2), W(-w / 2, d / 2), r0, r1], [0, 1]], [[W(w / 2, -d / 2), W(w / 2, d / 2), r1], [1, 0]], [[W(-w / 2, d / 2), W(-w / 2, -d / 2), r0], [-1, 0]]);
        } else {
          const r0 = W(0, -d / 2 + w / 2), r1 = W(0, d / 2 - w / 2);
          facets.push([[W(w / 2, -d / 2), W(w / 2, d / 2), r1, r0], [1, 0]], [[W(-w / 2, d / 2), W(-w / 2, -d / 2), r0, r1], [-1, 0]], [[W(-w / 2, -d / 2), W(w / 2, -d / 2), r0], [0, -1]], [[W(w / 2, d / 2), W(-w / 2, d / 2), r1], [0, 1]]);
        }
        facets.forEach(([poly, n]) => {
          const nn = [n[0] * c - n[1] * sn, n[0] * sn + n[1] * c];
          const k = 0.85 + 0.17 * (nn[0] * sun[0] + nn[1] * sun[1]);
          fillPoly(poly, shade(C.roof, k), "#141414", 0.03);
        });
      } else {
        fillPoly(b.poly, C.roofFlat, "#141414", 0.04);
      }
    });

    // structures
    M.structures.forEach((st) => {
      const t = st.type;
      if (t === "pergola") {
        const drawBeam = (a, b, w) => { const pl = U.band([a, b], w); fillPoly(pl, "#f7f7f4", "#141414", 0.018); };
        if (st.sh.kind === "arc") {
          const { cx, cy, r1, r2, a0, a1 } = st.sh, rin = Math.min(r1, r2), rout = Math.max(r1, r2), span = Math.abs(a1 - a0);
          const nr = Math.max(6, Math.round(((span / 360) * 2 * Math.PI * (rin + rout) / 2) / 0.55));
          for (const rr of [rin + 0.15, rout - 0.15]) {
            const seg = 40, pts = [];
            for (let k = 0; k <= seg; k++) { const a = ((a0 + ((a1 - a0) * k) / seg) * Math.PI) / 180; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
            fillPoly(U.band(pts, 0.14).map((q) => q), "#f7f7f4", "#141414", 0.018);
          }
          for (let k = 0; k < nr; k++) { const a = ((a0 + ((a1 - a0) * (k + 0.5)) / nr) * Math.PI) / 180; drawBeam([cx + (rin - 0.25) * Math.cos(a), cy + (rin - 0.25) * Math.sin(a)], [cx + (rout + 0.25) * Math.cos(a), cy + (rout + 0.25) * Math.sin(a)], 0.08); }
        } else {
          const R = st.sh.R; let w = R.w, d = R.d, ang = R.ang; if (d > w) { w = R.d; d = R.w; ang += Math.PI / 2; }
          const c = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [R.cx + u * c - v * sn, R.cy + u * sn + v * c];
          for (const v of [-d / 2 + 0.1, d / 2 - 0.1]) drawBeam(P(-w / 2 - 0.2, v), P(w / 2 + 0.2, v), 0.15);
          const nr = Math.max(3, Math.round(w / 0.5)); for (let k = 0; k <= nr; k++) { const u = -w / 2 + (w * k) / nr; drawBeam(P(u, -d / 2 - 0.25), P(u, d / 2 + 0.25), 0.08); }
        }
      } else if (t === "gazebo") {
        const { cx, cy, r } = st.sh; const hex = U.circlePts(cx, cy, r + 0.3, 6);
        for (let k = 0; k < 6; k++) { const a = hex[k], b = hex[(k + 1) % 6]; const n = [((a[0] + b[0]) / 2 - cx), ((a[1] + b[1]) / 2 - cy)]; const L = Math.hypot(...n); fillPoly([[cx, cy], a, b], shade(C.roof, 0.85 + 0.17 * ((n[0] / L) * sun[0] + (n[1] / L) * sun[1])), "#141414", 0.025); }
      } else if (t === "carport" || t === "garden_room") {
        fillPoly(st.poly, C.roofFlat, "#141414", 0.035);
      } else {
        const R = st.sh.R; let w = R.w, d = R.d, ang = R.ang; if (d > w) { w = R.d; d = R.w; ang += Math.PI / 2; }
        const c = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [R.cx + u * c - v * sn, R.cy + u * sn + v * c];
        const base = t === "greenhouse" ? "#e3ecf1" : t === "shed" ? "#8c6a4f" : "#9aa5b1";
        fillPoly([P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, 0), P(-w / 2, 0)], shade(base, 0.95), "#141414", 0.03);
        fillPoly([P(-w / 2, 0), P(w / 2, 0), P(w / 2, d / 2), P(-w / 2, d / 2)], shade(base, 1.08), "#141414", 0.03);
      }
    });

    // features
    M.features.forEach((f) => {
      const { x, y, size: S, rot: a } = f;
      const c = Math.cos(a), sn = Math.sin(a), P = (u, v) => [x + u * c - v * sn, y + u * sn + v * c];
      const rect = (u0, v0, w, d, col) => fillPoly([P(u0 - w / 2, v0 - d / 2), P(u0 + w / 2, v0 - d / 2), P(u0 + w / 2, v0 + d / 2), P(u0 - w / 2, v0 + d / 2)], col, "#141414", 0.02);
      const circ = (r, col, stroke = "#141414") => { ctx.beginPath(); ctx.arc(X(x), Y(y), r * s, 0, 6.283); ctx.fillStyle = col; ctx.fill(); if (stroke) { ctx.lineWidth = lw(0.025); ctx.strokeStyle = stroke; ctx.stroke(); } };
      switch (f.type) {
        case "firebowl": circ(S / 2, "#3a3a3a"); circ(S * 0.35, C.fire, null); break;
        case "dining_table": rect(0, -0.8, S * 0.9, 0.35, "#6b4429"); rect(0, 0.8, S * 0.9, 0.35, "#6b4429"); rect(0, 0, S, 0.9, "#7a4e2f"); break;
        case "bench": rect(0, 0, S, 0.45, "#7a4e2f"); break;
        case "pot": circ(S / 2, "#8b6a52"); circ(S * 0.38, "#6a8c4c", null); break;
        case "water_feature": circ(S / 2, C.stone); circ(S * 0.35, C.water, null); break;
        case "sculpture": rect(0, 0, S, S, "#8c8c88"); break;
        case "boulder": { const r = U.mulberry(Math.round(x * 13 + y * 7)); const p = []; for (let k = 0; k < 9; k++) { const t = (k / 9) * 6.283; const rr = S / 2 * (0.8 + r() * 0.3); p.push([x + rr * Math.cos(t), y + rr * 0.8 * Math.sin(t)]); } fillPoly(p, C.stone, "#141414", 0.025); break; }
        case "car": rect(0, 0, S, 1.8, C.car); rect(-S * 0.05, 0, S * 0.45, 1.5, "#9fb8d0"); break;
        case "person": circ(0.2, C.person); break;
        case "lounger": rect(0, 0, S, 0.65, "#f4f4f2"); break;
        case "hot_tub": rect(0, 0, S, S, "#7a4e2f"); rect(0, 0, S * 0.8, S * 0.8, C.water); break;
        case "bin_store": rect(0, 0, S, 0.9, "#7a4e2f"); break;
      }
    });

    // planting: shrubs then trees
    M.shrubs.forEach((p) => {
      const pal = GC.SHRUBS[p.tone % GC.SHRUBS.length];
      const r = U.mulberry(p.seed), pts = [];
      for (let k = 0; k < 16; k++) { const t = (k / 16) * 6.283; const rr = p.r * (0.9 + r() * 0.18); pts.push([p.x + rr * Math.cos(t), p.y + rr * Math.sin(t)]); }
      fillPoly(pts, pal[1], "#1e2a15", 0.018);
      ctx.beginPath(); ctx.arc(X(p.x - p.r * 0.25), Y(p.y + p.r * 0.25), p.r * 0.38 * s, 0, 6.283); ctx.fillStyle = shade(pal[0].replace("#", "#"), 1.0); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    });
    M.trees.forEach((t) => {
      const pal = GC.GREENS[t.seed % GC.GREENS.length], r = U.mulberry(t.seed);
      const n = t.form === "airy" ? 18 : 13;
      for (let k = 0; k < n; k++) {
        const a = r() * 6.283, rr = t.r * Math.sqrt(r()) * 0.72;
        ctx.beginPath(); ctx.arc(X(t.x + rr * Math.cos(a)), Y(t.y + rr * Math.sin(a)), t.r * (0.28 + r() * 0.14) * s, 0, 6.283);
        ctx.globalAlpha = t.form === "airy" ? 0.62 : 0.78; ctx.fillStyle = pal[Math.floor(r() * 3)]; ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(30,45,25,0.6)"; ctx.lineWidth = lw(0.012); ctx.stroke();
      }
    });

    // labels
    const fontPx = Math.max(9, 0.42 * s);
    const text = (str, x, y, size = fontPx, weight = 700, colour = "#111") => {
      ctx.font = `${weight} ${size}px "Josefin Sans", "Gill Sans", "Trebuchet MS", sans-serif`;
      ctx.fillStyle = colour; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lines = String(str).split("\n");
      lines.forEach((ln, i) => ctx.fillText(ln, X(x), Y(y) + (i - (lines.length - 1) / 2) * size * 1.15));
    };
    const callout = (str, at, ptr) => {
      const size = fontPx * 0.92; ctx.font = `700 ${size}px "Josefin Sans", "Gill Sans", "Trebuchet MS", sans-serif`;
      const lines = String(str).split("\n"); const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.2, h = lines.length * size * 1.15 + size * 0.9;
      const bx = X(at[0]) - w / 2, by = Y(at[1]) - h / 2;
      if (ptr) {
        const px = X(ptr[0]), py = Y(ptr[1]), cx = X(at[0]), cy = Y(at[1]);
        const dx = px - cx, dy = py - cy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, half = size * 0.45;
        ctx.beginPath(); ctx.moveTo(cx + nx * half, cy + ny * half); ctx.lineTo(px, py); ctx.lineTo(cx - nx * half, cy - ny * half); ctx.closePath();
        ctx.fillStyle = "#ebebe6"; ctx.fill(); ctx.strokeStyle = "#8a8a84"; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); const rr = size * 0.3;
      ctx.moveTo(bx + rr, by); ctx.arcTo(bx + w, by, bx + w, by + h, rr); ctx.arcTo(bx + w, by + h, bx, by + h, rr); ctx.arcTo(bx, by + h, bx, by, rr); ctx.arcTo(bx, by, bx + w, by, rr); ctx.closePath();
      ctx.fillStyle = "#ebebe6"; ctx.fill(); ctx.strokeStyle = "#8a8a84"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#4a4a46"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      lines.forEach((ln, i) => ctx.fillText(ln, X(at[0]), Y(at[1]) + (i - (lines.length - 1) / 2) * size * 1.15));
    };
    if (M.groundLabel) { const p = M.groundLabelAt || U.labelPoint(M.boundary); text(M.groundLabel, p[0], p[1]); }
    M.zones.forEach((z) => { if (z.label) { const p = z.labelAt || U.labelPoint(z.poly); text(z.label, p[0], p[1]); } });
    M.buildings.forEach((b) => { if (b.label) { const p = b.labelAt || U.labelPoint(b.poly); callout(b.label, p, null); } });
    M.structures.forEach((st) => { if (st.label) { const p = st.labelAt || U.labelPoint(st.poly); callout(st.label, p, null); } });
    M.lines.forEach((l) => { if (l.label && l.labelAt) callout(l.label, l.labelAt, null); });
    M.features.forEach((f) => { if (f.label) callout(f.label, f.labelAt || [f.x + 1.6, f.y - 1.6], [f.x, f.y]); });
    M.labels.forEach((l) => (l.boxed ? callout(l.text, l.at, l.pointer) : text(l.text, l.at[0], l.at[1])));

    // north arrow + scale bar (bottom left, outside the site)
    const bx = F.x0 + 1.0, byM = F.y1 - F.heightM + 1.2;
    const barM = F.widthM > 30 ? 10 : 5;
    ctx.fillStyle = "#222"; ctx.strokeStyle = "#222"; ctx.lineWidth = 1;
    for (let k = 0; k < barM; k++) { ctx.fillStyle = k % 2 ? "#f4f4ef" : "#222"; ctx.fillRect(X(bx + k), Y(byM) - 0.14 * s, s, 0.28 * s); ctx.strokeRect(X(bx + k), Y(byM) - 0.14 * s, s, 0.28 * s); }
    const small = Math.max(9, 0.32 * s);
    ctx.font = `600 ${small}px "Josefin Sans", "Gill Sans", sans-serif`; ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("0", X(bx), Y(byM) + 0.25 * s); ctx.fillText(`${barM} m`, X(bx + barM), Y(byM) + 0.25 * s);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(`Plan is ${F.widthM.toFixed(1)} m wide`, X(bx + barM + 1.2), Y(byM));
    // north arrow
    const nx = F.x0 + F.widthM - 1.6, ny = byM + 0.4, a = (-(M.north || 0) * Math.PI) / 180, L = 0.9;
    const pt = (u, v) => [X(nx + u * Math.cos(a) - v * Math.sin(a)), Y(ny + u * Math.sin(a) + v * Math.cos(a))];
    ctx.beginPath(); let p = pt(0, L); ctx.moveTo(p[0], p[1]); p = pt(-0.4, -L * 0.6); ctx.lineTo(p[0], p[1]); p = pt(0, -L * 0.25); ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = "#222"; ctx.fill();
    ctx.beginPath(); p = pt(0, L); ctx.moveTo(p[0], p[1]); p = pt(0.4, -L * 0.6); ctx.lineTo(p[0], p[1]); p = pt(0, -L * 0.25); ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = "#f4f4ef"; ctx.fill(); ctx.stroke();
    p = pt(0, L + 0.45); ctx.font = `700 ${small * 1.1}px "Josefin Sans", sans-serif`; ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.fillText("N", p[0], p[1]);
  };
})(typeof window !== "undefined" ? window : globalThis);
