# Garden Concept toolkit

Turn site photos, sketches and spoken notes into a concept-stage garden design: a summary, loose concept images, a coloured plan, a 3D view, and files that open in SketchUp.

```
garden-concept/
├── index.html                  the Garden Concept Converter (served by GitHub Pages)
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
│   └── build.py                rebuilds index.html from src/
└── tests/                      sample layouts used to test the Converter
```

## How it fits together
1. **Gem** (Gemini app): photos, sketches and notes go in. Out come a concept summary, concept images, and a **layout block** (JSON in metres).
2. **Converter** (this page): paste the layout block. It draws a coloured concept plan and a 3D view, and downloads:
   - `…_3d-model.dae`: a 3D model for SketchUp on a computer (File › Import);
   - `…_plan_<width>m-wide.png`: a to-scale plan image for any SketchUp, including the free web version;
   - `…_base-plan.dxf`: a 2D base plan on layers, in metres.

Everything runs in the browser. There's no server and no account, and nothing is uploaded.

## Changing the Converter
Edit the files in `converter/src/`, run `python converter/build.py`, and upload the new `index.html`. Any change to the layout format must also go into `gem/2-layout-format.txt`, so the Gem and the Converter stay in step.
