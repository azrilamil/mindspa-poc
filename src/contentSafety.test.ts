import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CHECK_IN_QUESTIONS, SESSION_PROMPTS } from './data/prompts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BANNED =
  /Hannan|Medispa|UPNM|\bATM\b|FFMQ|Convex|CONVEX_|Selamat|\banda\b|spaminda|spa-minda/i
const EM = /\u2014/
const EN = /\u2013/

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (
      ['.ts', '.tsx', '.md', '.css', '.html', '.json', '.yml', '.svg', '.conf'].includes(extname(p))
      || name === 'Dockerfile'
    ) {
      acc.push(p)
    }
  }
  return acc
}

function isTestFile(file: string): boolean {
  return file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.includes('/src/test/')
}

describe('public content safety', () => {
  it('uses only original English prompts', () => {
    const all = [...CHECK_IN_QUESTIONS.map((q) => q.prompt), ...SESSION_PROMPTS].join('\n')
    expect(all).not.toMatch(BANNED)
  })

  it('has no partner names, clinical instrument names, secrets, Malay greetings, or dashes in product copy', () => {
    const files = walk(ROOT).filter((f) => !isTestFile(f))
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (BANNED.test(text) || EM.test(text) || EN.test(text)) {
        hits.push(file.replace(ROOT + '/', ''))
      }
    }
    expect(hits).toEqual([])
  })
})
