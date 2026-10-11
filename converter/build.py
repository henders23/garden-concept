"""Assemble the single-file Converter page from src/.

python build.py   ->  ../index.html (for GitHub Pages: a complete web page)
                      index.artifact.html (same content, without the page skeleton)
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


body = read("template.html")
body = body.replace("/*EXAMPLE*/", read("example.json").strip())
body = body.replace("/*CORE*/", read("core.js"))
body = body.replace("/*PLAN*/", read("plan.js"))
body = body.replace("/*APP*/", read("app.js"))

page = (
    "<!doctype html>\n<html lang=\"en-GB\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
    "<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n"
    "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
)
with open(os.path.join(HERE, "..", "index.html"), "w", encoding="utf-8") as f:
    f.write(page)
with open(os.path.join(HERE, "index.artifact.html"), "w", encoding="utf-8") as f:
    f.write(body)
print("built index.html", len(page), "bytes")
