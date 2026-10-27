# King Abdulaziz: A History · الملك عبدالعزيز: سيرة وتاريخ

A bilingual (English / Arabic) history website, published free with GitHub Pages.

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
| `period` | Optional dates shown under the title, e.g. `1902 – 1906` |

Markdown basics: `## Heading`, `**bold**`, `*italic*`, `> quotation`, a blank line starts a new paragraph.

### Adding a chapter

Copy an existing chapter file in both `en/chapters/` and `ar/chapters/`, give both copies the same new `ref`, and set `order`.

## Sources (internal, not shown on the site)

The `research/` folder is kept in the repository but is not published on the website.

- `research/sources.yml`: every source, with an id (S1, S2, ...).
- `research/facts.yml`: one entry per claim, each with the source and timestamp it came from and a status (`from-source`, `verified`, `disputed`, `check`).
- `research/transcripts/`: source transcripts.

To add a new source, add it to `sources.yml`, put its transcript in `research/transcripts/`, then add or update fact entries.

Note: if this repository is public, anyone can still read the `research/` folder on GitHub. Make the repository private (needs a paid GitHub plan for Pages) if that matters.

## Turning on the website (one time)

Repository **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **main**, folder **/ (root)**, Save.
The site will be at `https://mohamed-ah.github.io/benchai/`.

## Preview locally (optional)

```bash
gem install bundler jekyll
jekyll serve --baseurl /benchai
```
