# King Abdulaziz: A History · الملك عبدالعزيز: سيرة وتاريخ

A bilingual (English / Arabic) history of King Abdulaziz bin Abdulrahman Al Saud and the founding of the Third Saudi State, live at **https://imamabdulaziz.com**.

The text is a retelling of the Fnjan podcast episode [“Al-Hukm Lillah Thumma Li-Abdulaziz” (الحكم لله ثم لعبدالعزيز)](https://www.youtube.com/watch?v=HwVwgIBFj_4) with Dr. Talal Al-Tarifi (Thmanyah, 2024). Every paragraph on the site is tied to an exact, timestamped quote from a source, and the repository is set up so that more sources can be added over time.

It is a plain [Jekyll](https://jekyllrb.com/) site: no database and no admin panel. All content is Markdown and YAML files that you can edit straight on GitHub, and Cloudflare Pages republishes the site a minute or two after each change to `main`.

## Contents

- [What is on the site](#what-is-on-the-site)
- [Where things live](#where-things-live)
- [Editing the text](#editing-the-text)
- [Adding a new source](#adding-a-new-source)
- [Adding a chapter](#adding-a-chapter)
- [Chapter maps](#chapter-maps)
- [Checks](#checks)
- [Running it on your computer](#running-it-on-your-computer)
- [Hosting, domain and contact form](#hosting-domain-and-contact-form)

## What is on the site

| Page | English | Arabic |
|---|---|---|
| Landing page (choose a language) | `index.html` | |
| Home: the title, the unification map and the chapter list | `en/index.md` | `ar/index.md` |
| 14 chapters, from *Writing history* to *The Kingdom* | `en/chapters/` | `ar/chapters/` |
| Timeline, with an overview map of the regions as they joined | `en/timeline.md` | `ar/timeline.md` |
| Sources & About | `en/about.md` | `ar/about.md` |
| Contact Us (plus “sent” and “not sent” pages) | `en/contact*.md` | `ar/contact*.md` |

Arabic pages are right-to-left. Each page links to its counterpart in the other language, and the site has a light and a dark theme. On phones and tablets the header links and chapter list sit behind a Menu button.

## Where things live

```
_config.yml          Site settings: the King's name, titles, podcast credit, which maps are on
en/  ar/             All the pages, in Markdown (chapters in en/chapters/ and ar/chapters/)
_data/               Map content: places.yml, maps.yml, regions.yml
_layouts/ _includes/ Page templates (HTML)
assets/              CSS, JavaScript, fonts, map images and the 3D map library
research/            Sources, fact base, transcripts and checks (NOT published on the site)
functions/ workers/  The contact form's back end (Cloudflare)
_headers             Security headers and caching for Cloudflare Pages
.github/workflows/   Automatic checks on every pull request
```

## Editing the text

Every chapter is a plain Markdown file in `en/chapters/` and `ar/chapters/`. The English and Arabic versions say the same thing, paragraph by paragraph, so change both.

To edit on GitHub: open the file, click the pencil icon, change the text, then click **Commit changes**. The site updates by itself within a minute or two. (If you would rather review changes first, choose “Create a new branch” when committing and open a pull request: the [checks](#checks) run on it before anything goes live.)

The block at the top of each file (between the `---` lines) holds the settings:

| Field | Meaning |
|---|---|
| `layout` | `chapter` for chapters. Leave as is. |
| `lang` | `en` or `ar`. Leave as is. |
| `ref` | Links the English and Arabic versions of the same chapter, and picks its map. Keep it identical in both. |
| `order` | Position in the chapter list and the menu |
| `title` | Chapter title shown on the site |
| `period` | Optional dates shown under the title, e.g. `1319–1320 AH` |
| `description` | Optional text for search results and link previews. Without it, the opening of the chapter is used. |

Markdown basics: `## Heading`, `**bold**`, `*italic*`, `> quotation`, and a blank line starts a new paragraph.

### Hidden fact codes: keep them

Each paragraph ends with a hidden note such as `{% comment %}F058 F059{% endcomment %}`. It lists the facts (in `research/facts.yml`) the paragraph rests on. The website strips these notes out, so visitors never see them. If you rewrite a paragraph, keep the note, or update it if the paragraph now rests on different facts. The checks will flag a paragraph with no fact codes.

### The main title and credits

- The King's name and the honorific (رحمه الله / may Allah have mercy on him) are set once in `_config.yml` under `king:`. They appear on the landing page, the home pages and the header.
- `title_en` / `title_ar` set the footer text, and `short_title_en` / `short_title_ar` the browser tab and search results.
- The podcast credit in the footer and on the Sources page comes from `podcast:` in `_config.yml`.

## Adding a new source

Sources live in `research/`, which is kept in the repository but never published. The site is only as good as this fact base, so every claim goes through it.

| File | What it holds |
|---|---|
| `research/sources.yml` | Every source, with an id (`S1`, `S2`, ...) |
| `research/facts.yml` | One entry per claim (currently F001–F189): its chapter, date, the claim, the source and timestamp, an exact quote, and a status |
| `research/names.yml` | English and Arabic spellings of people and places, with the ones still to check |
| `research/transcripts/` | Source transcripts, named by source id, with timestamps |

Steps:

1. **Register it.** In `research/sources.yml`, copy the `S1` block, give it the next id (`S2`, `S3`, ...) and fill in the title, author or guest, URL, date and language.
2. **Add the transcript.** Put it in `research/transcripts/` as `S2-short-name.txt`, one line per caption in the form `[h:mm:ss] text` (for a book, use page numbers in place of times). Then add it to `TRANSCRIPTS` near the top of `research/check_facts.py`, e.g.
   `TRANSCRIPTS = {"S1": ..., "S2": HERE / "transcripts" / "S2-short-name.txt"}`.
3. **Add facts.** Append entries to `research/facts.yml` with the next free F number (never reuse an id), `source: "S2@h:mm:ss"` and a `quote` copied word for word from the transcript. The field guide is at the top of that file.
4. **Cross-check what is already there.**
   - If the new source confirms an existing fact, set that fact's `status` to `verified` and name the source in `note`.
   - If it contradicts one, set `disputed` and explain in `note`, then reword the chapter so it presents both accounts.
   - New names and spellings go in `research/names.yml`.
5. **Use it in the chapters.** Write or adjust the paragraphs in both languages and add the new F codes to each paragraph's hidden note.
6. **Credit it on the site.** Add the source to the “The source” section of `en/about.md` and `ar/about.md` (the podcast credit there is filled in from `_config.yml`).
7. **Run the checks** (below). `check_facts.py` confirms every quote really appears in its transcript at the stated time.

Statuses: `from-source` (stated by the source, not yet checked elsewhere), `check` (unclear translation, name, date or number), `disputed`, `opinion` (the speaker's view, presented on the site as his view) and `verified` (confirmed by a second source).

`research/README.md` also lists the parts of the podcast that were deliberately left out (trailer, adverts, digressions).

Note: if this repository is public, anyone can read the `research/` folder on GitHub even though it is not on the website. Cloudflare Pages works with private repositories on the free plan, so you can make the repository private if that matters.

## Adding a chapter

1. Copy an existing chapter file in both `en/chapters/` and `ar/chapters/` (name them `15-something.md`).
2. Give both copies the same new `ref` and set `order`. It appears in the chapter list and menu automatically.
3. Every paragraph needs its fact codes, as above.
4. For a map, add the `ref` to `maps_enabled` in `_config.yml` and give it an entry in `_data/maps.yml` (see below).

## Chapter maps

Every chapter and the timeline has a 3D terrain map, driven by three files in `_data/`:

| File | What it holds |
|---|---|
| `places.yml` | Each place's English and Arabic name, its position, and where the position comes from. `approximate: true` draws it as an area, not a point. `city: true` gives a major city a larger marker. `reference: true` shows the city faintly in grey on every map, so close-ups show where they sit in the country (today's cities, for orientation only). |
| `maps.yml` | For each chapter (by `ref`): the places, events (battles, sieges and so on, with captions in both languages) and routes to show. Every item lists the fact codes it rests on. |
| `regions.yml` | The historical regions and the year each joined, for the overview map on the home and timeline pages. |

A map is shown only when its chapter's `ref` is listed under `maps_enabled` in `_config.yml`.

Close-up maps also get a small inset of the whole peninsula with the area shown outlined, and markers keep the same size on screen at any zoom. On a computer the mouse wheel scrolls the page until the visitor clicks a map; after that it zooms the map until the pointer leaves it. On phones one finger scrolls the page and two fingers turn and zoom the map.

Visitors whose browser cannot draw 3D see a still image of each map from `assets/maps/fallback/`, with separate images for phones (`-m`) and for dark mode (`-dark`). After changing a map, remake its images with `research/maps/make_fallbacks.js` (run it once as is and once with `PHONE=1`; instructions are at the top of the file).

The maps load a trimmed copy of three.js (`assets/three/three-r160-map.min.js`) holding only the parts they use; `research/maps/three-entry.js` lists those parts and explains how to rebuild it. The terrain image is made by `research/maps/bake_terrain.py`.

## Checks

Every pull request and every change to `main` runs `.github/workflows/checks.yml` on GitHub. A red cross on a pull request means one of these found a problem; the log names the page and the line.

| Check | Run it yourself | What it checks |
|---|---|---|
| Build | `bundle exec jekyll build` | The site builds |
| Facts | `python3 research/check_facts.py` | Every quote in `facts.yml` appears in its transcript at that timestamp |
| Chapters | `python3 research/check_chapters.py` | Every paragraph cites facts that exist, in both languages; lists unused facts and any `check` / `disputed` facts in use |
| Maps | `python3 research/check_maps.py` | Every map item has fact codes, those facts are cited in the chapter text in both languages, and every place exists |
| Site | `python3 research/check_site.py _site` | Broken links, page titles and descriptions, no leaked fact codes, no inline styles |
| HTML | `npx html-validate "_site/**/*.html"` | Valid HTML |

The Python checks need `pip install pyyaml`.

## Running it on your computer

Optional; editing on GitHub is enough. You need Ruby (3.x) and Bundler.

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000. The site rebuilds when you save a file.

## Hosting, domain and contact form

### Cloudflare Pages (free)

The site is built by Cloudflare Pages from the `main` branch. Settings used (Workers & Pages → the project → Settings → Build):

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | Jekyll |
| Build command | `jekyll build` |
| Build output directory | `_site` |

Folders listed under `exclude:` in `_config.yml` (`research/`, `functions/`, `workers/`, this README) are never published.

### Domain, security and search

- The site lives at https://imamabdulaziz.com (set as `url` in `_config.yml`). `benchai.pages.dev` and `www.imamabdulaziz.com` redirect there through Cloudflare Bulk Redirects.
- `_headers` sets the security headers and how long browsers keep fonts and map files. The security policy only allows the site's own files (plus Cloudflare Web Analytics), so do not add inline `style="..."` or `onclick="..."` attributes, or fonts and scripts from other sites: browsers will block them.
- Page addresses have no `.html` (for example `/en/chapters/06-qassim`). Link to pages that way.
- `_includes/head.html` writes each page's title, description, link-preview tags and the English/Arabic pairing.
- `sitemap.xml`, `robots.txt` and `404.html` are built from the files of the same name. The fonts (Gloock, Markazi Text, Reem Kufi) are in `assets/fonts/`, with their licences.

### Contact form

The Contact Us page posts to `/api/contact`. That address is a small Pages Function (`functions/api/contact.js`) that hands the message to a separate Worker in `workers/contact/`. The Worker checks the Cloudflare Turnstile answer and the fields, then emails the message through Cloudflare Email Routing and sends the visitor to the “sent” or “not sent” page.

What has to be set up in Cloudflare (once):

1. Email Routing on the domain, with the receiving address verified as a destination address.
2. A Turnstile widget for `imamabdulaziz.com`. Its site key goes in `turnstile_sitekey` in `_config.yml`; the form and its footer link appear only when that is filled in.
3. The Worker in `workers/contact/`, deployed from this repository, with two secrets: `CONTACT_TO` (the receiving address) and `TURNSTILE_SECRET` (the widget's secret key).
4. A service binding named `CONTACT` from the Pages project to that Worker.

The receiving address is kept only in the Worker's secrets, never in this repository.

### Visitor statistics

Cloudflare Web Analytics (cookie-free) is switched on in the Pages project's settings; Cloudflare adds its script to every page. The security policy in `_headers` already allows it.
