/**
 * Repo hygiene tests.
 *
 * These read the work tree rather than render anything, and they exist because two
 * classes of mistake are invisible to TypeScript: a forbidden name creeping back
 * into a file, and a cue or a dash that the house style forbids. Both are cheap to
 * check and expensive to discover after a push.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..')

/** Every file under `src`, skipping the test files themselves. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, out)
      continue
    }
    if (/\.(ts|tsx|css)$/.test(entry)) out.push(full)
  }
  return out
}

const SOURCE_FILES = walk(join(ROOT, 'src')).filter(
  (file) => !/\.test\.(ts|tsx)$/.test(file),
)

function read(file: string): string {
  return readFileSync(file, 'utf8')
}

/**
 * The strings that must never appear in the public repo.
 *
 * Each entry is a name or an identifier that belongs to the private original, to a
 * partner institution, or to a clinical instrument this build deliberately does not
 * carry. The list is deliberately noisy: a false positive is a code review, and a
 * false negative is a leak.
 */
const FORBIDDEN = [
  'Hannan',
  'Medispa',
  'UPNM',
  'Universiti',
  'UNISEL',
  'Selangor',
  'FFMQ',
  'Five Facet',
]

describe('forbidden names', () => {
  it('appear nowhere in the source tree', () => {
    const hits: string[] = []
    for (const file of SOURCE_FILES) {
      const text = read(file)
      for (const term of FORBIDDEN) {
        if (text.includes(term)) hits.push(`${relative(ROOT, file)}: ${term}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('are not used as a partner or institution label anywhere', () => {
    // "ATM" is allowed only as a substring of an ordinary word, so the check is on
    // the standalone token. The source has no such word, which makes this a clean
    // assertion rather than a heuristic.
    const hits = SOURCE_FILES.filter((file) => /\bATM\b/.test(read(file)))
    expect(hits.map((file) => relative(ROOT, file))).toEqual([])
  })
})

describe('house style', () => {
  it('contains no en or em dashes anywhere in the source', () => {
    const hits: string[] = []
    for (const file of SOURCE_FILES) {
      const text = read(file)
      if (text.includes('\u2013') || text.includes('\u2014')) {
        hits.push(relative(ROOT, file))
      }
    }
    expect(hits).toEqual([])
  })

  it('writes the UI copy in English', () => {
    // A small set of Malay function words. If any of them appear, a string from the
    // reference build has been carried over.
    const malay =
      /\b(anda|sila|hari|minggu|sudah|belum|mula|tutup|simpan|kembali|tetapan|jurnal|latihan|nafas|perasaan)\b/i
    const hits: string[] = []
    for (const file of SOURCE_FILES) {
      if (file.endsWith('.css')) continue
      // Comments are exempt: the code explains decisions in English, and a comment
      // about the reference build may legitimately name a Malay word.
      const code = read(file)
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n')
      if (malay.test(code)) hits.push(relative(ROOT, file))
    }
    expect(hits).toEqual([])
  })

  it('never hardcodes a Convex deployment url', () => {
    const hits = SOURCE_FILES.filter((file) =>
      /https:\/\/[a-z0-9-]+\.convex\.cloud/.test(read(file)),
    )
    expect(hits.map((file) => relative(ROOT, file))).toEqual([])
  })

  it('never hardcodes the original audio bucket', () => {
    const hits = SOURCE_FILES.filter((file) =>
      /s3\.azril\.io\/spa-minda\b/.test(read(file)),
    )
    expect(hits.map((file) => relative(ROOT, file))).toEqual([])
  })
})

describe('copy safety', () => {
  it('describes the app as a demo and not a medical tool', () => {
    const ui = read(join(ROOT, 'src/components/ui.tsx'))
    expect(ui).toMatch(/synthetic data/i)
    expect(ui).toMatch(/not a medical tool/i)
  })

  it('never claims a diagnosis or a treatment', () => {
    // The pattern is deliberately about affirmations: the build does say that it is
    // NOT a treatment, and a negation is the opposite of a claim.
    const risky = /\b(diagnose|diagnosis|cure|treats|treatment for|clinically proven)\b/i
    const hits: string[] = []
    for (const file of SOURCE_FILES) {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue
      const claims = read(file)
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .filter((line) => !/\bnot\b|\bnever\b|does not|is not/i.test(line))
        .join('\n')
      if (risky.test(claims)) hits.push(relative(ROOT, file))
    }
    expect(hits).toEqual([])
  })

  it('collects no personal identifier fields in the domain model', () => {
    const types = read(join(ROOT, 'src/domain/types.ts'))
    for (const field of ['email', 'phone', 'dateOfBirth', 'nric']) {
      expect(types).not.toMatch(new RegExp(`\\b${field}\\s*:`, 'i'))
    }
  })
})
