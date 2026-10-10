import type { BodyPass, VolumePass } from "@rtm/ingest";
import { layoutMarkers, layoutPageJoins, quoteListRunOns, pipeline, geometry, runningFurniture, numberedParagraphs, pageBreakContinuations, footnoteRestarts, numberedOpenings, thumbIndexNotes } from "@rtm/ingest";

/**
 * The running head "Chapter 1 | Introduction" at the top of every page of a
 * chapter (the Part's own head, "PART E | …", sits on the facing page).
 * runningFurniture({ numbersTrackPages: true }) keeps a repeated line whose
 * number does not advance with the page, so a short chapter's head (two or
 * three pages) survives: ten in the text, nine as stray paragraphs and one
 * mid-sentence, "grant-in-Chapter 1 | Introduction aid voted by Parliament"
 * (p.1000-1001, reportsthatmatter-jr1t). The "Chapter N | Title" shape, a
 * whole line among a page's first or last three, is never prose here.
 */
const CHAPTER_HEAD = /^\s*Chapter \d{1,2} \| \S.*$/;
const chapterRunningHeads: VolumePass = {
  name: "chapterRunningHeads",
  stage: "volume",
  run: (pages) =>
    pages.map((page) => {
      const content = page.body.flatMap((line, i) => (line.trim() ? [i] : []));
      const edge = new Set([...content.slice(0, 3), ...content.slice(-3)]);
      const body = page.body.filter((line, i) => !(edge.has(i) && CHAPTER_HEAD.test(line)));
      return body.length === page.body.length ? page : { ...page, body };
    }),
};

/**
 * Volume i's Part and chapter openers, its contents and some section heads are
 * set in a small-caps face whose glyphs extract in a mixed case: "ChapTer 2",
 * "The approaCh", "parT a", "THE frEEDom of THE prESS aND", "PArT h: The PreSS
 * And dATA PrOTeCTIOn" (reportsthatmatter-1ptg). The printed case cannot be
 * read back from the text, so such a line is set in sentence case, with a
 * Part's letter as a capital: "The approach", "Part H: the press and data
 * protection". A garbled line is a short one (at most 12 words) with two
 * words that turn from lower to upper case inside the word, or the title line
 * after a "ChapTer"/"parT" opener; across the four volumes the test reads 37
 * lines, all garbled, and no prose ("McAlpine", "BSkyB" and "NoTW" are one
 * word each). The opener itself is left as printed: set as "Chapter 1", the
 * same line on every Part's first chapter repeats often enough for
 * runningFurniture to drop it, and the chapter number with it (the Part and
 * chapter heading structure is reportsthatmatter-r0w/djy).
 */
const CAMEL = /^[^a-z]*[A-Za-z]*[a-z][A-Z]/;
const OPENER = /^(chapter \d+|part [a-l])\b/i;
const isCamel = (word: string) => CAMEL.test(word) && !/^(Mc|Mac)[A-Z]/.test(word);
function sentenceCase(line: string): string {
  const lead = line.match(/^\s*/)![0];
  const text = line.slice(lead.length).toLowerCase();
  const cased = text
    .replace(/^part ([a-l])\b/, (_, letter: string) => `Part ${letter.toUpperCase()}`)
    .replace(/^[a-z]/, (c) => c.toUpperCase());
  return lead + cased;
}
const smallCapsCase: BodyPass = {
  name: "smallCapsCase",
  stage: "body",
  run(lines) {
    let afterOpener = false;
    return lines.map((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return line;
      const opener = OPENER.test(line.trim()) && words.slice(0, 2).some(isCamel);
      const camel = words.length <= 12 ? words.filter(isCamel).length : 0;
      const fix = !opener && (camel >= 2 || (afterOpener && camel >= 1));
      afterOpener = opener;
      return fix ? sentenceCase(line) : line;
    });
  },
};

/**
 * The Part letter (A-L) printed as a thumb index at the page edge. On a line
 * of its own it became a one-letter paragraph between two numbered ones
 * ("4.3 …" / "B" / "4.4 …"): 58 of them. The line still parts what it sat
 * between, and some of those are a subheading ("Annual conference",
 * "Operation Tuleta") the parser reads as its own block only because of it,
 * so it becomes a blank line; but where the next line carries on in lower
 * case it sat inside a sentence and goes ("…the option of informing the
 * victims" / "E" / "investigation to continue:"). A letter sharing a body
 * line, at its column 0, is not handled here (reportsthatmatter-qai).
 */
const THUMB_LETTER = /^\s*[A-L]\s*$/;
const thumbLetters: BodyPass = {
  name: "thumbLetters",
  stage: "body",
  run: (lines) =>
    lines.flatMap((line, i) => {
      if (!THUMB_LETTER.test(line)) return [line];
      const next = lines.slice(i + 1).find((l) => l.trim());
      return next && /^[a-z]/.test(next.trim()) ? [] : [""];
    }),
};

/**
 * How this report is built. Owned by the report: every decision that shaped
 * its text is named here, and the passes it composes are library code, so a
 * fix to a shared pass reaches every report that calls it.
 */
export default pipeline({
  id: "uk-leveson-inquiry",
  title: "An Inquiry into the Culture, Practices and Ethics of the Press",
  authors: "The Right Honourable Lord Justice Leveson",
  published_at: "29 November 2012",
  source_url: "https://webarchive.nationalarchives.gov.uk/20140122145147/http://www.official-documents.gov.uk/document/hc1213/hc07/0780/0780.asp",
  repo: ".",
  // Order is semantic: footnote numbering and page indices run continuously
  // across volumes, so reordering changes the output.
  volumes: [
    { path: "archive/0780_i.pdf", sha256: "b7f26f7cc27f61a496bad121886257706f19f262010119e28b1d7b2d62c87a98" },
    { path: "archive/0780_ii.pdf", sha256: "f26761b668f0c6bae389e268cfeeff7ce270ef11602daa0ba30356bfa10e6ab9" },
    { path: "archive/0780_iii.pdf", sha256: "1015691f73f1dfd67384e5e604f0089869c5db1a9bfcdc022ebf8111631a662e" },
    { path: "archive/0780_iv.pdf", sha256: "4ddc59c470901d72286a21fda920ff0078c26f3580c3dee5e6590989b50f0ec5" },
  ],
  // Four separately typeset volumes. Each carries its own running
  // furniture, and one global margin is not meaningful across them.
  // Numbered "7.1", "10.14" paragraphs (reportsthatmatter-hzf).
  // numbersTrackPages: a digit-blanked repeat is furniture only if its number
  // advances with the page, so "Chapter 3" banners and citation tails are kept
  // (reportsthatmatter-tqv).
  // pageBreakContinuations: rejoin sentences split at page breaks; quoteTails,
  // because here a quotation's first line left alone at a page foot reads as
  // prose and belongs to the quotation on the next page (reportsthatmatter-nen).
  passes: [
    // A paragraph run over a page break that opens on a capital, a digit or a
    // quotation mark (or follows a full stop on a justified page) joins when the
    // layout says it runs on: no first-line indent, same face (reportsthatmatter-38s.10).
    layoutPageJoins(),
    // Footnote markers are raised digits flush against the word ("companies.7", "Corp,12"): link them
    // from the layout, to a note on the same page, in sequence; the contents pages the page-foot reader
    // took for notes go back in the body (reportsthatmatter-b94).
    layoutMarkers(),
    // Notes restart in every chapter; a chapter whose opening page offers only
    // its note 1 (or 1 and 2) to read printed its notes in the body and left
    // the markers bare until the next page with three: 97 notes, mostly each
    // chapter's first (reportsthatmatter-u00i).
    footnoteRestarts(),
    // The Part letter printed as a thumb index sits beside some notes' numbers
    // ("I   70"), which then read as the tail of the note above (reportsthatmatter-qai).
    thumbIndexNotes(),
    // A quotation running over a page arrives as two (reportsthatmatter-38s.9).
    quoteListRunOns(),
    geometry("per-volume"),
    runningFurniture({ numbersTrackPages: true }),
    chapterRunningHeads,
    smallCapsCase,
    thumbLetters,
    numberedParagraphs(),
    // A block opening on its own paragraph number ("4.30 The dinner…") is a
    // paragraph of its own, not the rest of one ending "Part H." or "News
    // Corp." (reportsthatmatter-1iz4).
    numberedOpenings(),
    pageBreakContinuations({ quoteTails: true }),
  ],
});
