"""Assemble the Converter from src/.

python build.py  ->  ../garden-converter.js   the whole Converter in one script (GitHub Pages + Gemini Canvas)
                     ../index.html            the Converter page (loads garden-converter.js)
                     converter-artifact.html  single-file copy with everything inline (for previews; not needed on GitHub)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
ROOT = os.path.join(HERE, "..")


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


shell, example = read("shell.html"), read("example.json").strip()
core, plan, app = read("core.js"), read("plan.js"), read("app.js")

bundle = (
    "/* Garden Concept Converter - built file, do not edit (edit converter/src and run converter/build.py) */\n"
    + core + "\n" + plan + "\n" + app + "\n"
    + read("boot.js").replace("host.innerHTML = SHELL;", "host.innerHTML = " + json.dumps(shell) + ";")
    .replace("ex.textContent = EXAMPLE;", "ex.textContent = " + json.dumps(example) + ";")
)
with open(os.path.join(ROOT, "garden-converter.js"), "w", encoding="utf-8") as f:
    f.write(bundle)

index = """<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Garden Concept Converter</title>
</head>
<body>
<script src="garden-converter.js"></script>
</body>
</html>
"""
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(index)

artifact = (
    "<title>Garden Concept Converter</title>\n"
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap">\n'
    + shell
    + '<script type="application/json" id="example-layout">\n' + example + "\n</script>\n"
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
    + '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>\n'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n'
    + "<script>\n" + core + "\n" + plan + "\n" + app + "\nGC.startApp({});\n</script>\n"
)
with open(os.path.join(HERE, "converter-artifact.html"), "w", encoding="utf-8") as f:
    f.write(artifact)
print("built garden-converter.js", len(bundle), "bytes; index.html; converter-artifact.html")
