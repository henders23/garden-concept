# Garden Concept toolkit

Turn site photos, sketches and spoken notes into a concept-stage garden design: a summary, loose concept images, a coloured plan, a 3D view, and files that open in SketchUp.

```
garden-concept/
├── index.html                  the Garden Concept Converter page (served by GitHub Pages)
├── garden-converter.js         the drawing engine; the Gem's Canvas pages load it from GitHub Pages
├── gem/                        everything needed to create the Gemini Gem
│   ├── 1-gem-instructions.txt  name, description and instructions to paste in
│   ├── 2-layout-format.txt     knowledge file: the layout block format
│   ├── 3-house-style.txt       knowledge file: the designer's concept conventions
│   └── 4-example-layout.txt    knowledge file: a worked example
├── docs/
│   ├── setup-checklist.md      one-time setup (GitHub Pages, Gem, sharing, testing)
│   └── quick-guide-for-designer.md
├── converter/
│   ├── src/                    source of the Converter (core, plan drawing, page)
│   └── build.py                rebuilds garden-converter.js and index.html from src/
└── tests/                      sample layouts used to test the Converter
```

## How it fits together
1. **Gem** (Gemini app): photos, sketches and notes go in. Out come a concept summary, concept images, a **layout block** (JSON in metres), and a Canvas page that loads `garden-converter.js` with that layout, so the drawing appears in the chat.
2. **Converter** (the engine, inside the Canvas or on its own page): draws a coloured concept plan and a 3D view, and downloads:
   - `…_3d-model.dae`: a 3D model for SketchUp on a computer (File › Import);
   - `…_plan_<width>m-wide.png`: a to-scale plan image for any SketchUp, including the free web version;
   - `…_base-plan.dxf`: a 2D base plan on layers, in metres.

Everything runs in the browser. There's no server and no account, and nothing is uploaded. Gems can't send data to outside services, so designs aren't stored in the repo; they live in the Gem chat.
Ways into the full Converter: the **Open in the full Converter** button in a Canvas (the design travels inside the link, as `#d=…`), pasting, or copying a layout block and switching to the Converter tab (it picks up the clipboard once he has allowed access).

## Changing the Converter
Edit the files in `converter/src/`, run `python converter/build.py`, and upload the new `garden-converter.js` (and `index.html`). Any change to the layout format must also go into `gem/2-layout-format.txt`, so the Gem and the Converter stay in step.
