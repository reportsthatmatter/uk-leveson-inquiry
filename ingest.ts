import type { VolumePass } from "@rtm/ingest";
import { layoutMarkers, layoutPageJoins, quoteListRunOns, pipeline, geometry, runningFurniture, numberedParagraphs, pageBreakContinuations, footnoteRestarts, numberedOpenings } from "@rtm/ingest";

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
    // A quotation running over a page arrives as two (reportsthatmatter-38s.9).
    quoteListRunOns(),
    geometry("per-volume"),
    runningFurniture({ numbersTrackPages: true }),
    chapterRunningHeads,
    numberedParagraphs(),
    // A block opening on its own paragraph number ("4.30 The dinner…") is a
    // paragraph of its own, not the rest of one ending "Part H." or "News
    // Corp." (reportsthatmatter-1iz4).
    numberedOpenings(),
    pageBreakContinuations({ quoteTails: true }),
  ],
});
