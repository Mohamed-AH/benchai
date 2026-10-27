# Research (internal, not published on the website)

- `sources.yml`: every source, with an id (S1, S2, ...).
- `facts.yml`: one entry per claim, with the source timestamp and an exact quote.
- `names.yml`: English and Arabic spellings of people and places, with ones to check.
- `transcripts/`: source transcripts. `S1-fnjan-en.txt` is the cleaned copy (one line per
  caption, `[h:mm:ss] text`); `S1-fnjan-en-original.txt` is the file as copied from YouTube.
- `check_facts.py`: run `python3 research/check_facts.py` to confirm every quote in
  `facts.yml` appears in the transcript at its timestamp.

## How the chapters link to the facts

Each paragraph in `en/chapters/` and `ar/chapters/` ends with a hidden note such as
`{% comment %}F058 F059{% endcomment %}`. It lists the facts the paragraph is based on.
Jekyll removes these notes when it builds the site, so visitors never see them.

## Parts of S1 deliberately not used

- 0:00:02-0:01:30 trailer (repeats material from later in the episode) and app promo.
- 0:01:40-0:04:06 conversation about podcasting.
- 0:32:16-0:35:00 Abbasid and Umayyad stories told only to illustrate farasah (intuition).
- 0:42:17-0:43:05 sponsor adverts.
- 2:32:07-2:41:46 production break and a digression on the Umayyads and Abbasids.
- 3:10:05-3:10:44 closing chat and credits.

## Adding a new source

1. Add it to `sources.yml` with the next id (S2, S3, ...).
2. Put its transcript in `transcripts/` and add it to `TRANSCRIPTS` in `check_facts.py`.
3. Add facts with `source: "S2@..."`. If a new source confirms an existing fact, set its
   status to `verified` and say which source in `note`. If it contradicts one, set
   `disputed` and explain.
