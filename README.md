# King Abdulaziz: A History · الملك عبدالعزيز: سيرة وتاريخ

A bilingual (English / Arabic) history website, published free with Cloudflare Pages.

## How to edit the text 

Every chapter is a plain Markdown file:

- English: `en/chapters/`
- Arabic: `ar/chapters/`

To edit on GitHub: open the file, click the pencil icon, change the text, then click **Commit changes**. The site updates by itself within a minute or two.

The block at the top of each file (between the `---` lines) holds settings:

| Field | Meaning |
|---|---|
| `title` | Chapter title shown on the site |
| `order` | Position in the chapter list |
| `ref` | Links the English and Arabic versions of the same chapter. Keep it identical in both. |
| `period` | Optional dates shown under the title, e.g. `1319–1320 AH` |

Markdown basics: `## Heading`, `**bold**`, `*italic*`, `> quotation`, a blank line starts a new paragraph.

### Adding a chapter

Copy an existing chapter file in both `en/chapters/` and `ar/chapters/`, give both copies the same new `ref`, and set `order`.

## Sources (internal, not shown on the site)

The `research/` folder is kept in the repository but is not published on the website.

- `research/sources.yml`: every source, with an id (S1, S2, ...).
- `research/facts.yml`: one entry per claim, each with the source, timestamp, an exact quote, and a status (`from-source`, `check`, `disputed`, `opinion`, `verified`).
- `research/names.yml`: English and Arabic spellings of names and places, with the ones to check.
- `research/transcripts/`: source transcripts.

Each paragraph in a chapter ends with a hidden note such as `{% comment %}F058 F059{% endcomment %}` listing the facts it is based on. The website strips these out, so visitors never see them. If you rewrite a paragraph, keep the note (or update it).

See `research/README.md` for how to add a new source and how to run the checks.

Note: if this repository is public, anyone can still read the `research/` folder on GitHub. Cloudflare Pages works with private repositories on the free plan, so you can make the repository private if that matters.

## Hosting (Cloudflare Pages, free)

The site is built by Cloudflare Pages from the `main` branch. Every commit to `main`, including edits made on GitHub in the browser, republishes the site within a minute or two.

Settings used in Cloudflare (Workers & Pages → the project → Settings → Build):

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | Jekyll |
| Build command | `jekyll build` |
| Build output directory | `_site` |

## Preview locally (optional)

```bash
bundle install
bundle exec jekyll serve
```
