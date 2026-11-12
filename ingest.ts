import type { BodyPass, SourcePass, VolumePass } from "@rtm/ingest";
import { allCapsHeadings, facingPageMargins, letteredItems, layoutMarkers, layoutPageJoins, quoteListRunOns, pipeline, geometry, runningFurniture, numberedParagraphs, pageBreakContinuations, footnoteRestarts, numberedOpenings, thumbIndexNotes, typographicHeadings, numberedHeadings } from "@rtm/ingest";

/**
 * The running head "Chapter 1 | Introduction" at the top of every page of a
 * chapter (the Part's own head, "PART E | …", sits on the facing page).
 * runningFurniture({ numbersTrackPages: true }) keeps a repeated line whose
 * number does not advance with the page, so a short chapter's head (two or
 * three pages) survives: ten in the text, nine as stray paragraphs and one
 * mid-sentence, "grant-in-Chapter 1 | Introduction aid voted by Parliament"
 * (p.1000-1001, reportsthatmatter-jr1t). The "Chapter N | Title" shape, a
 * whole line among a page's first or last three, is never prose here. Nor is
 * an appendix's, "Appendix 6 | Bibliography", which ran into the list below it.
 */
const CHAPTER_HEAD = /^\s*(Chapter|Appendix) \d{1,2} \| \S.*$/;
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
 * word each). An opener on its own line takes its title with it (below), and
 * runningFurniture keeps it, so each Part and chapter has one heading,
 * "Chapter 2: The approach" (reportsthatmatter-r0w/djy).
 */
const CAMEL = /^[^a-z]*[A-Za-z]*[a-z][A-Z]/;
const OPENER = /^(chapter \d+|part [a-l])\b/i;
/**
 * A line that is only an opener: "ChapTer 1", "Chapter 4", "PART H",
 * "appendix 5". Not Appendix 1, whose opener stands alone over its lists of
 * names ("Counsel to the Inquiry" / "Robert Jay QC").
 */
const OPENER_LINE = /^(chapter \d{1,2}|part [a-l]|appendix [2-6]):?$/i;
const isCamel = (word: string) => CAMEL.test(word) && !/^(Mc|Mac)[A-Z]/.test(word);
function sentenceCase(line: string): string {
  const lead = line.match(/^\s*/)![0];
  const text = line.slice(lead.length).toLowerCase();
  const cased = text
    .replace(/^part ([a-l])\b/, (_, letter: string) => `Part ${letter.toUpperCase()}`)
    .replace(/^[a-z]/, (c) => c.toUpperCase());
  return lead + names(cased);
}
/**
 * The names a title set in small caps or capitals loses to sentence case, and
 * the text layer's own misreadings of them ("Pcc", "Pressbof"), as the report
 * prints them in its body: "the PCC and PressBoF", "the BSkyB bid", "Part I
 * Chapter 8", "Operation Caryatid" (an operation's name is a name).
 */
const NAMES = ["Press Complaints Commission", "Information Commissioner", "Royal Commission", "Associated Newspapers", "Northern and Shell", "Telegraph Media Group", "Guardian Media Group", "Financial Times", "Princess of Wales", "PCC", "PressBoF", "ICO", "BSkyB", "MPS", "IPCC", "ACPO", "BBC", "ITN", "UK", "NoTW", "Ofcom", "Leveson", "Operation", "Caryatid", "Motorman", "Weeting", "Elveden", "Tuleta", "Glade", "Reproof"];
function names(text: string): string {
  let out = text;
  for (const name of NAMES) out = out.replace(new RegExp(`\\b${name}\\b`, "gi"), name);
  return out
    .replace(/\bpart ([a-l])\b/gi, (_, letter: string) => `Part ${letter.toUpperCase()}`)
    .replace(/\bchapter (\d)/gi, "Chapter $1");
}
/**
 * A chapter or Part opener, "ChapTer 2" over its title "THE frEEDom of THE prESS
 * aND" / "DEmoCraCy" (vol i PDF p.69), is one heading: "Chapter 2: The freedom
 * of the press and democracy", the shape the contents gives it. The title is
 * the next one to three short lines that do not open on a number (a chapter's
 * are aligned under its opener; a Part's, up to four, stand alone on its title
 * page with blank lines between),
 * passing over a thumb-index letter, which is kept after it. A blank line
 * follows, so the text below never runs into it ("Appendix 6: Bibliography
 * Reports Australian Government…"). A garbled title, or
 * one in capitals ("THE PRESS AND THE POLICE: CONCLUSIONS…"), is set in
 * sentence case; one printed plainly is kept as printed.
 */
function openerTitle(lines: string[], i: number): { line: string; next: number; kept: string[] } | null {
  const opener = lines[i];
  const [word, label] = opener.trim().replace(/:$/, "").split(/\s+/);
  const part = /^part$/i.test(word);
  const appendix = /^appendix$/i.test(word);
  const indent = opener.length - opener.trimStart().length;
  const title: string[] = [];
  const kept: string[] = [];
  let j = i + 1;
  for (; j < lines.length && title.length < (part || appendix ? 4 : 3); j++) {
    const line = lines[j];
    const text = line.trim();
    if (!text) {
      if (part) continue;
      break;
    }
    if (/^\s*[A-La-l]\s*$/.test(line)) {
      kept.push(line.toUpperCase());
      continue;
    }
    if (/^\d/.test(text) || /^[“"‘]/.test(text) || text.split(/\s+/).length > 12) break;
    if (!part && line.length - line.trimStart().length < indent - 2) break;
    // (an appendix's plain title wraps onto a lower-case line; a capital opens
    // what follows it, Appendix 6's "Bibliography" / "Reports")
    if (appendix && title.length && /^\p{Lu}/u.test(text) && !/^[^a-z]+$/.test(title[0])) break;
    // (a thumb-index letter set on the title's line: "the Press: the Press and      F")
    const edge = text.match(/\s{3,}([A-La-l])$/);
    if (edge) kept.push(edge[1].toUpperCase());
    title.push(edge ? text.slice(0, edge.index).trim() : text);
  }
  if (!title.length) return null;
  const joined = title.join(" ");
  const words = joined.split(/\s+/);
  const shouted = joined === joined.toUpperCase() && /[A-Z]{4}/.test(joined);
  const plain = words.some(isCamel) || shouted ? sentenceCase(joined).trim() : names(joined);
  const cased = plain.charAt(0).toUpperCase() + plain.slice(1);
  const name = part ? "Part" : appendix ? "Appendix" : "Chapter";
  return { line: `${opener.slice(0, indent)}${name} ${part ? label.toUpperCase() : label}: ${cased}`, next: j, kept };
}
/**
 * A numbered section head, "2.  role of the assessors": set in small caps, its
 * first letter extracts in lower case. A short line opening on a bare number
 * and a lower-case word is one (across the four volumes all 61 such lines are
 * set in the section heads' face): its first letter becomes a capital.
 */
const SECTION_HEAD = /^(\s*\d{1,2}\.\s+)\p{Ll}/u;
/** Any short line opening on a bare number: its names are restored too ("3.  Associated newspapers Ltd"). */
const NUMBERED_HEAD = /^\s*\d{1,2}\.\s+\S/;
/**
 * A chapter's first section head, "1.  Introduction", sits right under the
 * chapter's title, and the text reading ran it into the title ("Chapter 1:
 * The announcement 1. Introduction"): a blank line parts them.
 */
const FIRST_SECTION = /^\s*1\.\s+\S/;
const shortHead = (line: string) => line.trim().split(/\s+/).length <= 14 && !/[.,;:]$/.test(line.trim());
const smallCapsCase: BodyPass = {
  name: "smallCapsCase",
  stage: "body",
  run(lines) {
    let afterOpener = false;
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push(line);
        continue;
      }
      const opener = OPENER.test(line.trim()) && words.slice(0, 2).some(isCamel);
      const bare = words.length === 2 && OPENER_LINE.test(line.trim());
      const camel = words.length <= 12 ? words.filter(isCamel).length : 0;
      const fix = !opener && (camel >= 2 || (afterOpener && camel >= 1));
      afterOpener = opener;
      const titled = bare ? openerTitle(lines, i) : null;
      if (titled) {
        out.push(titled.line, "", ...titled.kept);
        i = titled.next - 1;
        afterOpener = false;
      } else if (fix) out.push(sentenceCase(line));
      else if (NUMBERED_HEAD.test(line) && shortHead(line)) {
        if (FIRST_SECTION.test(line) && out.length && out[out.length - 1].trim()) out.push("");
        out.push(names(line.replace(SECTION_HEAD, (m) => m.toUpperCase())));
      } else out.push(line);
    }
    return out;
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
 * Part E's first three chapter openers (vol i PDF pp.258, 260, 266) are in the
 * PDF's layout, set like every other opener, but the text layer pdftotext
 * reads has no trace of them: the pages open on the thumb letter and "1.1" or
 * "1. Introduction". The chapters had no heading. Each page gets its opener
 * back, as the layout prints it, above its first line of text
 * (reportsthatmatter-r0w).
 */
const LOST_OPENERS: Record<number, string[]> = {
  258: ["Chapter 1", "The legal framework"],
  260: ["Chapter 2", "Police investigations start"],
  266: ["Chapter 3", "Operation Motorman"],
};
const lostOpeners: SourcePass = {
  name: "lostOpeners",
  stage: "source",
  run(lines, at) {
    const opener = at.volume === 1 ? LOST_OPENERS[at.pdfIndex] : undefined;
    if (!opener) return lines;
    const first = lines.findIndex((line) => line.trim() && !/^\s*[A-L]\s*$/.test(line));
    if (first < 0 || lines.some((line) => /^\s*chapter \d/i.test(line))) return lines;
    return [...lines.slice(0, first), ...opener.map((line) => `          ${line}`), ...lines.slice(first)];
  },
};

/**
 * The thumb-index letter sharing a body line: at its column 0 before the text
 * ("I   2.36 Before Mr Coulson started work…") or at the far right after it
 * ("…had been informed        E"). pdftotext sets it three or more spaces from
 * the text. At the start it put a letter before 45 numbered paragraphs, so
 * their numbers were not read ("I 2.36 …"), and before 35 other blocks,
 * subheads among them ("C Governance structures"); at the end it fell inside
 * sentences ("had been E informed"). The letter goes; at the start a space
 * keeps the line's columns (reportsthatmatter-qai, r0w). Across the four
 * volumes 1,196 such letters are the page's own thumb letter and 12 more are on
 * Part D pages whose thumb the layout does not show; the only other letters are
 * the alphabet heads of Appendix 2's two-column list of submissions (vol iv
 * PDF pp.367-369), which keep them.
 */
const EDGE_START = /^[A-L](?=\s{3,}\S)/;
const EDGE_END = /(\S)\s{3,}[A-L]\s*$/;
const edgeLetters: BodyPass = {
  name: "edgeLetters",
  stage: "body",
  run: (lines, _context, at) =>
    at && at.volume === 4 && at.pdfIndex >= 366 && at.pdfIndex <= 370
      ? lines
      : lines.map((line) => line.replace(EDGE_START, " ").replace(EDGE_END, "$1")),
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
    lostOpeners,
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
    // Odd and even PDF pages sit four or five columns apart (the binding
    // gutter): against one margin per volume, every line of the other side
    // opened a paragraph or read as a quotation; 2,091 oversplit paragraphs
    // ("…I selected" / "Robert Jay QC to be Counsel…", vol i p.21,
    // reportsthatmatter-fkx). Each page takes its side's margin.
    facingPageMargins(),
    // "(a) to investigate complaints…" sets its wrapped lines one tab-stop in,
    // at the quotation inset: each item read as prose cut off into a quotation.
    letteredItems(),
    // keep: a chapter opener ("ChapTer 1") and a numbered section head
    // ("1.  Introduction") recur at the head of many pages, one per chapter, and
    // went as running heads: most chapters lost their number and their first
    // section its heading (reportsthatmatter-r0w).
    runningFurniture({ numbersTrackPages: true, keep: /^(chapter \d{1,2}|\d{1,2}\.\s+\S.{0,80})$/i }),
    chapterRunningHeads,
    edgeLetters,
    smallCapsCase,
    thumbLetters,
    numberedParagraphs(),
    // A block opening on its own paragraph number ("4.30 The dinner…") is a
    // paragraph of its own, not the rest of one ending "Part H." or "News
    // Corp." (reportsthatmatter-1iz4).
    numberedOpenings(),
    pageBreakContinuations({ quoteTails: true }),
    // The heading structure is read off the faces (reportsthatmatter-r0w): a
    // numbered line read by its text lost its number ("2.  News Corporation"
    // became "News Corporation") and a quoted list item became structure.
    numberedHeadings(false),
    // and a line in capitals read by its text was a quoted headline ("LOVE
    // CELEB GOSSIP? SO DO WE…") or a volume's cover as often as a heading.
    allCapsHeadings(false),
    typographicHeadings({
      firstLevel: 2,
      faces: [
        ["Calibri|54|#5580c9|b"],
        ["Calibri|35|#5580c9|b"],
        ["Calibri|30|#5580c9|b"],
        ["Calibri|26|#5580c9"],
        ["Calibri|22|#5580c9", "Calibri|18|#5580c9|b|i", "Calibri|18|#5580c9|i"],
      ],
      labelWraps: true,
      commaWraps: true,
      relevel: true,
      punctuationAside: true,
      keepDivisions: true,
      skipRunIns: true,
    }),
  ],
});
