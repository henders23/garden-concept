# Setup checklist (for you, about 30 minutes)

You set this up once. Afterwards the designer only needs two links: the **Gem** and the **Converter**.

## What you're setting up

| Part | Where it lives | What it does |
|---|---|---|
| Garden Concept Assistant (a Gem) | his Gemini app, shared from your Google account | Takes his photos, sketches and notes; gives a concept summary, concept images, and **the drawing itself** (plan, 3D view, SketchUp downloads) in a Canvas inside the chat |
| Garden Concept Converter (a web page) | free on GitHub Pages, from this repo | Hosts the drawing engine the Gem's Canvas uses, and works as a backup: it picks up a copied layout by itself |
| His one-page guide | `docs/quick-guide-for-designer.md` | How to use the two together |

---

## A. Put the Converter online (GitHub Pages)

1. Sign in to github.com (or create a free account).
2. Click **New repository**. Name it `garden-concept`, set it to **Public** (free Pages needs a public repo), tick **Add a README**, and create it.
3. In the new repo: **Add file › Upload files**. Drag in everything from this folder (`index.html`, `garden-converter.js`, `README.md`, and the `converter`, `gem`, `docs` and `tests` folders). Click **Commit changes**.
4. Go to **Settings › Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. After a minute or two the page is live at `https://<your-username>.github.io/garden-concept/`.
6. Open it, click **Load example**, look at the Plan and 3D view, and try each download button.

To update it later, upload the new `garden-converter.js` the same way. The link stays the same, and the Gem's drawings pick up the change automatically.

## B. Create the Gem

1. Go to gemini.google.com, signed in with the Google account you want to own the Gem.
2. Open **Gems** (in the side menu, *Explore Gems* or *Gem manager*) and choose **New Gem**.
3. Fill it in from `gem/1-gem-instructions.txt`:
   - **Name**: Garden Concept Assistant
   - **Description**: the description line from the file
   - **Instructions**: everything below the dashed line, **after replacing `YOUR-GITHUB-NAME` with your GitHub user name** (twice). This tells the Gem where the drawing engine lives.
4. Under **Knowledge**, upload `gem/2-layout-format.txt`, `gem/3-house-style.txt` and `gem/4-example-layout.txt`.
   - Optional but worthwhile: add one or two of his past concept proposals as PDFs, with client names and addresses removed. The Gem will pick up his tone and conventions from them.
5. **Save**.

## C. Test it end to end (10 minutes)

1. In the Gem, paste this test brief:
   > Rear garden 11 m wide and 16 m deep, house along the bottom, two storey with a gable roof, kitchen doors in the middle. North roughly top right. A sandstone terrace across the back about 3.5 m deep with a dining table, then lawn, stepping stones in gravel up the right side to a small garden room in the top right corner (3 x 2.5 m), a small pond near the terrace on the left, planting round the boundary about 1.2 m deep, two multi-stem trees and a larger tree top left, a slatted screen hiding the bins. Japanese-ish feel. Just estimate anything you need.
2. The Gem should open a **Canvas** beside the chat showing the plan, with a 3D view and download buttons. This is the step that removes the copying and pasting, so check three things:
   - **Does the drawing appear?** If the Canvas stays blank, Gemini is blocking the engine from loading. Use the backup (step 2b) and tell me what you see.
   - **Do the download buttons work in the Canvas?** If not, the **Open in the full Converter** button opens the same design on your GitHub page, where they do.
   - **Does the Gem create the Canvas without being asked?** If it doesn't, tap **Canvas** in the tools menu below the message box and say *"show me the drawing"*. Note which of these he'll need to do.
2b. Backup route: press copy on the layout block, open the Converter link the Gem gives, and check the plan appears (click **Paste** the first time, and allow clipboard access when Chrome asks; after that it picks up copied layouts by itself).
3. Ask the Gem: *"Make a concept image of the view from the terrace towards the garden room."*
   - If it makes an image, good.
   - If it says it can't make images inside the Gem, it will give a ready-made image prompt instead. He then pastes that prompt into an ordinary Gemini chat. Mention this in his guide if it happens.
4. In the Converter's 3D view, click **Save this view**, drop the picture into the Gem and ask it to *"render this as a loose concept view"*.

## D. Share it with him

1. **The Gem**: open it, click **Share**, add his email address as a **Viewer**. He can use it but can't accidentally change it, and any improvements you make reach him automatically. He needs to be signed in to a Google account.
   - If the Share option is missing, one of the knowledge files is a type Gemini can't share. Re-upload it as a PDF or Google Doc.
2. **The Converter**: send him the GitHub Pages link and ask him to bookmark it.
3. **The guide**: send him `docs/quick-guide-for-designer.md`, or paste it into an email.

## Things worth knowing

- The Converter runs entirely in his browser. Nothing he pastes is uploaded anywhere.
- The Gem's layouts are only as good as the measurements he gives it. It is told to list any assumptions so he can check them on site.
- If the drawing shows notes like *"Zone 4 isn't a zone type I know"*, he copies those notes into the Gem and it fixes the layout.
- Gems can't send anything to GitHub or other services, so the Gem can't save designs to the repo. Nothing needs saving there: each design lives in his Gem chat, and the Canvas or the Converter link rebuilds the drawing whenever he opens it.
- The `garden-cad` extension built earlier (detailed, dimensioned CAD drawings with plant schedules) suits the later planting-plan stage, not concepts. Keep it separately for when he wants it.
