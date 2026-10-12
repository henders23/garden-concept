/* Garden Concept Converter - loader. Lets any page show the Converter with one script tag:
     <script type="application/json" id="garden-layout"> ...layout block... </script>   (optional)
     <script src="https://<name>.github.io/garden-concept/garden-converter.js"></script>
   With a layout it opens straight onto that design (used by the Gem's Canvas pages). */
(function () {
  "use strict";
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/[^\/]*$/, "") : "";
  var LIBS = [
    ["THREE", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"],
    ["THREE.OrbitControls", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"],
    ["JSZip", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"]
  ];
  function has(path) { return path.split(".").reduce(function (o, k) { return o && o[k]; }, window); }
  function load(src) { return new Promise(function (res) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }); }
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }

  ready(function () {
    var src = document.getElementById("garden-layout");
    var layoutText = src ? src.textContent : null;
    if (!document.title) document.title = "Garden Concept Converter";
    if (!document.querySelector('meta[name="viewport"]')) {
      var mv = document.createElement("meta"); mv.name = "viewport"; mv.content = "width=device-width, initial-scale=1"; document.head.appendChild(mv);
    }
    var fl = document.createElement("link"); fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap";
    document.head.appendChild(fl);
    var reset = document.createElement("style"); reset.textContent = "body{margin:0}[hidden]{display:none!important}"; document.head.appendChild(reset);
    var host = document.createElement("div"); host.id = "gc-root"; host.innerHTML = SHELL;
    document.body.appendChild(host);
    var ex = document.createElement("script"); ex.type = "application/json"; ex.id = "example-layout"; ex.textContent = EXAMPLE;
    document.body.appendChild(ex);
    LIBS.reduce(function (p, lib) { return p.then(function () { return has(lib[0]) ? null : load(lib[1]); }); }, Promise.resolve())
      .then(function () { window.GC.startApp({ layoutText: layoutText, converterUrl: base || null }); });
  });
})();
