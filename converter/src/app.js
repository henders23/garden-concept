/* Garden Concept Converter - page behaviour: paste, check, preview (plan + 3D), download.
   GC.startApp(opts) runs it. opts.layoutText: a layout handed in by the page (Gemini Canvas);
   opts.converterUrl: address of the full Converter, for the "open in full Converter" link. */
(function (root) {
  "use strict";
  const GC = root.GC;

  // ---------- design <-> link encoding (deflate + base64url; plain base64url where compression is missing)
  function b64url(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64url(t) { t = t.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; const s = atob(t), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  async function pipe(bytes, stream) { const out = new Response(new Blob([bytes]).stream().pipeThrough(stream)); return new Uint8Array(await out.arrayBuffer()); }
  GC.encodeLayout = async function (text) {
    let t = text; try { t = JSON.stringify(JSON.parse(text)); } catch (e) { /* keep as typed */ }
    const raw = new TextEncoder().encode(t);
    if (typeof CompressionStream === "function") { try { return "z" + b64url(await pipe(raw, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ } }
    return "b" + b64url(raw);
  };
  GC.decodeLayout = async function (code) {
    const kind = code[0], bytes = unb64url(code.slice(1));
    if (kind === "z") return new TextDecoder().decode(await pipe(bytes, new DecompressionStream("deflate-raw")));
    return new TextDecoder().decode(bytes);
  };

  GC.startApp = function (opts) {
  opts = opts || {};
  const $ = (id) => document.getElementById(id);
  const ta = $("layout"), statusEl = $("status"), planCanvas = $("plan"), threeHost = $("three");
  let current = null; // {M, objs}
  let downloadsCap = null;
  const inViewer = !!(window.claude && window.claude.use);
  const embedded = !!opts.layoutText;
  const converterUrl = opts.converterUrl || null;

  // ---------- status
  function setStatus(kind, title, items) {
    statusEl.className = "status " + kind;
    statusEl.innerHTML = "";
    const h = document.createElement("p"); h.className = "status-title"; h.textContent = title; statusEl.appendChild(h);
    if (items && items.length) {
      const ul = document.createElement("ul");
      items.forEach((t) => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      statusEl.appendChild(ul);
    }
  }

  // ---------- run
  function run() {
    const text = ta.value;
    try { localStorage.setItem("gc-layout", text); } catch (e) { /* storage unavailable */ }
    if (!text.trim()) { setStatus("idle", "Paste the layout block from the Gem, or load the example."); setDownloads(false); return; }
    const p = GC.parse(text);
    if (p.error) { setStatus("bad", "This layout can't be read yet.", [p.error]); setDownloads(false); return; }
    const n = GC.normalise(p.layout);
    if (!n.model) { setStatus("bad", "This layout can't be drawn yet. Paste this note into the Gem and ask it to fix the layout:", n.errors); setDownloads(false); return; }
    const M = n.model;
    const objs = GC.build3D(M);
    current = { M, objs };
    const bx = M.boundary.map((q) => q[0]), by = M.boundary.map((q) => q[1]);
    const w = (Math.max(...bx) - Math.min(...bx)).toFixed(1), d = (Math.max(...by) - Math.min(...by)).toFixed(1);
    if (n.errors.length) setStatus("warn", `Drawn, but ${n.errors.length} item${n.errors.length > 1 ? "s were" : " was"} left out. Paste these notes into the Gem and ask it to fix them:`, n.errors.concat(n.warnings));
    else setStatus(n.warnings.length ? "warn" : "ok", `${M.project.name || "Layout"} is ready: the plot is about ${w} × ${d} m.`, n.warnings);
    $("project-name").textContent = M.project.name || "Untitled layout";
    $("project-meta").textContent = [M.project.client, M.project.ref].filter(Boolean).join(" · ");
    drawPreview();
    if (viewer) viewer.load(objs, M);
    setDownloads(true);
    updateFullLink(text);
  }

  // link to the full Converter carrying this design (used from Gemini Canvas)
  let linkSeq = 0;
  async function updateFullLink(text) {
    const a = $("open-full"); if (!a || !converterUrl) return;
    const seq = ++linkSeq, code = await GC.encodeLayout(text);
    if (seq === linkSeq) a.href = converterUrl.replace(/#.*$/, "") + "#d=" + code;
  }

  function drawPreview() {
    if (!current) return;
    const M = current.M;
    const host = planCanvas.parentElement;
    const availW = host.clientWidth || 600;
    const F0 = GC.planFrame(M, 1);
    const maxH = Math.max(320, window.innerHeight * 0.72);
    const s = Math.max(4, Math.min(availW / F0.widthM, maxH / F0.heightM));
    const F = GC.planFrame(M, s);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    planCanvas.width = Math.round(F.W * dpr); planCanvas.height = Math.round(F.H * dpr);
    planCanvas.style.width = F.W + "px"; planCanvas.style.height = F.H + "px";
    const ctx = planCanvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    GC.drawPlan(ctx, M, F);
  }

  // ---------- files
  function planPNG() {
    const M = current.M, F = GC.planFrame(M, 50);
    const c = document.createElement("canvas"); c.width = F.W; c.height = F.H;
    GC.drawPlan(c.getContext("2d"), M, F);
    return new Promise((res) => c.toBlob((b) => res({ blob: b, widthM: F.widthM }), "image/png"));
  }
  function names() {
    const slug = GC.slug(current.M);
    return { dae: `${slug}_3d-model.dae`, dxf: `${slug}_base-plan.dxf`, png: (w) => `${slug}_plan_${w.toFixed(1)}m-wide.png`, zip: `${slug}_sketchup-files.zip` };
  }
  async function offer(filename, data, mime) {
    if (downloadsCap) {
      try { await downloadsCap.save({ filename, data }); toast(`Saved ${filename}`); }
      catch (e) { if (e && e.code !== "declined") toast(`Couldn't save: ${e.message || e.code}`); }
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Downloaded ${filename}`);
  }
  async function zipAll() {
    const n = names(), png = await planPNG();
    const z = new JSZip();
    z.file(n.dae, GC.toDAE(current.objs, current.M));
    z.file(n.dxf, GC.toDXF(current.M));
    z.file(n.png(png.widthM), png.blob);
    z.file("READ ME - which file.txt",
      "SketchUp on a computer (Pro or Make): File > Import > choose the .dae file (3D model).\r\n" +
      "  Or import the .dxf as a 2D base plan; choose Meters as the units.\r\n\r\n" +
      `Free SketchUp in a browser: import the .png plan image. Click once to place it, then type ${png.widthM.toFixed(1)}m and press Enter so it is to scale.\r\n`);
    return z.generateAsync({ type: "blob" });
  }

  function setDownloads(on) { document.querySelectorAll("[data-dl]").forEach((b) => (b.disabled = !on)); }
  document.querySelectorAll("[data-dl]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!current) return;
    const kind = btn.dataset.dl, n = names();
    btn.disabled = true;
    try {
      if (kind === "dae") await offer(n.dae, GC.toDAE(current.objs, current.M), "model/vnd.collada+xml");
      if (kind === "dxf") await offer(n.dxf, GC.toDXF(current.M), "image/vnd.dxf");
      if (kind === "png") { const p = await planPNG(); await offer(n.png(p.widthM), p.blob, "image/png"); }
      if (kind === "zip") await offer(n.zip, await zipAll(), "application/zip");
      if (kind === "view" && viewer) await offer(`${GC.slug(current.M)}_3d-view.png`, await viewer.snapshot(), "image/png");
    } finally { btn.disabled = false; }
  }));

  let toastTimer;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600); }

  // ---------- tabs
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
    const tab = b.dataset.tab;
    $("panel-plan").hidden = tab !== "plan"; $("panel-3d").hidden = tab !== "3d";
    if (tab === "3d" && viewer) viewer.resize();
    if (tab === "plan") drawPreview();
  }));

  // ---------- 3D viewer
  const viewer = (function () {
    if (!window.THREE) return null;
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    threeHost.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.background = new T.Color("#b9c7d9");
    const camera = new T.PerspectiveCamera(40, 1.5, 0.1, 2000); camera.up.set(0, 0, 1);
    scene.add(new T.HemisphereLight(0xf4f6ff, 0x6a7055, 0.75));
    const sun = new T.DirectionalLight(0xffffff, 0.65); sun.position.set(-30, -40, 60); scene.add(sun);
    const ground = new T.Mesh(new T.PlaneGeometry(600, 600), new T.MeshLambertMaterial({ color: GC.colours.sage }));
    ground.position.z = -0.02; scene.add(ground);
    const controls = T.OrbitControls ? new T.OrbitControls(camera, renderer.domElement) : null;
    if (controls) { controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; }
    let content = null, centre = new T.Vector3(), radius = 20;
    function load(objs, M) {
      if (content) { scene.remove(content); content.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      content = new T.Group();
      const edgeMat = new T.LineBasicMaterial({ color: 0x151515, transparent: true, opacity: 0.55 });
      objs.forEach((o) => {
        Object.entries(o.parts).forEach(([colour, verts]) => {
          const arr = new Float32Array(verts.length * 3);
          verts.forEach((v, i) => { arr[i * 3] = v[0]; arr[i * 3 + 1] = v[1]; arr[i * 3 + 2] = v[2]; });
          const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(arr, 3)); g.computeVertexNormals();
          const mesh = new T.Mesh(g, new T.MeshLambertMaterial({ color: colour, side: T.FrontSide }));
          content.add(mesh);
          if (o.group !== "Planting" && o.group !== "Ground" && verts.length < 60000) content.add(new T.LineSegments(new T.EdgesGeometry(g, 25), edgeMat));
        });
      });
      scene.add(content);
      centre.set((M.ext.x0 + M.ext.x1) / 2, (M.ext.y0 + M.ext.y1) / 2, 0);
      radius = Math.hypot(M.ext.x1 - M.ext.x0, M.ext.y1 - M.ext.y0) / 2;
      preset("front");
      resize();
    }
    function preset(which) {
      const r = radius * 2.1;
      const dir = which === "rear" ? new T.Vector3(-0.5, 0.85, 0.8) : which === "top" ? new T.Vector3(0, -0.02, 1) : new T.Vector3(0.45, -0.75, 1.05);
      dir.normalize();
      camera.position.copy(centre).addScaledVector(dir, r);
      camera.lookAt(centre); if (controls) { controls.target.copy(centre); controls.update(); }
      render();
    }
    function resize() {
      const w = threeHost.clientWidth || 600, h = Math.max(300, Math.round(w * 0.66));
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
    }
    function render() { renderer.render(scene, camera); }
    (function loop() { requestAnimationFrame(loop); if (controls && controls.update()) render(); else if (!controls) render(); })();
    if (controls) controls.addEventListener("change", render);
    window.addEventListener("resize", () => { resize(); drawPreview(); });
    function snapshot() { render(); return new Promise((res) => renderer.domElement.toBlob(res, "image/png")); }
    document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => preset(b.dataset.view)));
    return { load, resize, snapshot };
  })();
  if (!viewer) { threeHost.innerHTML = '<p class="muted">The 3D view needs an internet connection to load. The plan and downloads still work.</p>'; }

  // ---------- inputs
  let timer;
  ta.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 450); });
  $("draw").addEventListener("click", run);
  $("example").addEventListener("click", () => { ta.value = document.getElementById("example-layout").textContent.trim(); run(); });
  $("clear").addEventListener("click", () => { ta.value = ""; current = null; run(); ta.focus(); });
  $("paste").addEventListener("click", async () => {
    if (await tryClipboard(true)) return;
    try { const t = await navigator.clipboard.readText(); if (t) { ta.value = t; run(); return; } } catch (e) { /* not allowed here */ }
    ta.focus(); toast("Press Ctrl+V (or ⌘V) to paste");
  });

  // ---------- pick up a layout the designer has just copied (only once he has allowed clipboard access)
  const looksLikeLayout = (t) => !!t && t.length < 500000 && /"site"\s*:/.test(t) && /"boundary"/.test(t);
  let lastClip = null;
  async function tryClipboard(fromClick) {
    if (embedded || inViewer || !navigator.clipboard || !navigator.clipboard.readText) return false;
    try {
      if (!fromClick) {
        if (!navigator.permissions) return false;
        const st = await navigator.permissions.query({ name: "clipboard-read" });
        if (st.state !== "granted") return false;
      }
      const t = await navigator.clipboard.readText();
      if (!looksLikeLayout(t)) return false;
      if (!fromClick && t === lastClip) return true;
      lastClip = t;
      if (t.trim() !== ta.value.trim()) { ta.value = t; run(); if (!fromClick) toast("Loaded the layout you copied from the Gem"); }
      return true;
    } catch (e) { return false; }
  }
  window.addEventListener("focus", () => tryClipboard(false));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tryClipboard(false); });

  async function fromHash() {
    const m = /^#d=([A-Za-z0-9_-]+)/.exec(location.hash || "");
    if (!m) return false;
    try { ta.value = await GC.decodeLayout(m[1]); run(); toast("Opened the design from the Gem"); return true; }
    catch (e) { setStatus("bad", "This link didn't come through complete. Go back to the Gem and open the drawing again, or copy and paste the layout block."); return true; }
  }
  window.addEventListener("hashchange", fromHash);

  // ---------- start
  if (embedded) {
    document.documentElement.classList.add("embedded");
    $("embed-bar").hidden = !converterUrl;
    $("tagline").textContent = "Check the drawing, turn it round in 3D, and download the files for SketchUp.";
    ta.value = opts.layoutText.trim();
    run();
  } else {
    let saved = null; try { saved = localStorage.getItem("gc-layout"); } catch (e) { /* ignore */ }
    ta.value = saved && saved.trim() ? saved : document.getElementById("example-layout").textContent.trim();
    run();
    fromHash().then((used) => { if (!used) tryClipboard(false); });
  }
  const copyBtn = $("copy-layout");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(ta.value); toast("Layout copied"); }
    catch (e) { ta.hidden = false; ta.select(); toast("Press Ctrl+C (or ⌘C) to copy"); }
  });
  if (inViewer) {
    // inside a Claude artifact: files go through the viewer's save prompt (zip and png only)
    document.querySelectorAll('[data-dl="dae"],[data-dl="dxf"]').forEach((b) => (b.hidden = true));
    window.claude.use("downloads").then((d) => { downloadsCap = d; if (!d) document.querySelectorAll("[data-dl]").forEach((b) => (b.hidden = true)); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawPreview);
  };
})(typeof window !== "undefined" ? window : globalThis);
