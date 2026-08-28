This inquiry, commonly referred to by the name of its chair, Lord Justice Leveson, was commissioned by the British government in 2011, in response to accusations of widespread criminal activity by the British press, corruption in the police and the failure of politicians to act against this behaviour. Journalists had been hacking into the phones of public figures, allegedly on the instruction of senior newspaper staff. A preliminary police investigation into criminal activity at News International in 2007 was also suspected of misconduct.

The inquiry found that the existing Press Complaints Commission was ineffective and recommended the creation of a more robust, independent regulatory body which newspapers could voluntarily enrol in, where those that did not could thenceforth be ordered to pay punitive damages in civil cases.

## Summary

The report comprises four volumes:
* Volume I
  * Part A: The Inquiry, concerning the creation of the inquiry and its objectives.
  * Part B: The Press and the Public Interest, concerning the nature of a free press and its responsibilities.
  * Part C: The Press, detailing the major and minor producers in the British press and the plurality of that press.
  * Part D: Standards, detailing the history of press regulation in England and Wales.
  * Part E: Crossing Legal Boundaries: The Criminal and Civil Law, detailing the history of the criminal activity and police investigations that the inquiry is concerned with.
* Volume II
  * Part F: The Culture, Practices and Ethics of the Press: The Press and the Public, examining the culture, practices and ethics of the British press, including case studies.
  * Part G: The Press and the Police: The Relationship, examining the history of the relationship between the police and the press and allegations of corruption
* Volume III
  * Part H: The Press and Data Protection, concerning the Information Commissioner's Office and the Press Complaints Commission and their relationship with the press
  * Part I: The Press and Politicians, detailing the history, since 1979, of the relationship between politicians and the press and the history of policy-making regarding the press.
* Volume IV
  * Part J: Aspects of Regulation: The Law and the Press Complaints Commission, drawing conclusions about transgressions of both criminal and civil law and assessing the performance of the Press Complaints Commission.
  * Part K: Regulatory Models for the Future, assessing the scope for possible press regulation and assessing various models of regulation, with special attention to the self-regulatory model proposed by the Press Complaints Commission and Press Standards Board of Finance, before drawing the inquiry's conclusions concerning press regulation.
  * Part L: Summary of Recommendations

## Materials

Taken from The National Archives at: [http://webarchive.nationalarchives.gov.uk/20140122145147/http://www.official-documents.gov.uk/document/hc1213/hc07/0780/0780.asp](http://webarchive.nationalarchives.gov.uk/20140122145147/http://www.official-documents.gov.uk/document/hc1213/hc07/0780/0780.asp) 

See the datapackage.json for details.

## License

Public domain

## Rebuilding the text

`full.md` is generated, never hand-edited. `ingest.ts` is the whole recipe —
which PDFs, in what order, with what metadata, and which pipeline passes.

```bash
pnpm install
pnpm exec tsx ../reportsthatmatter/scripts/ingest/cli.ts run uk-leveson-inquiry
```

Corrections to the text go in `corrections.yaml`, never into `full.md`. Each
must match exactly once or the build fails naming it. `baseline.json` is the
regression digest: if a pipeline change moves this report's output, it fails
until the baseline moves with it after the diff has been read.

The pipeline itself is [`@rtm/ingest`](https://github.com/reportsthatmatter/ingest),
pinned in `package.json` — improvements are adopted here deliberately, with a
diff, rather than arriving unannounced.
