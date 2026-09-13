import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Shared helpers for the design guards.
 *
 * The visual redesign has no snapshot and no visual-regression net — the suite
 * asserts behaviour, and a purely visual regression is invisible to it. These
 * guards are source checks in the idiom of `src/features/localisation.test.ts`:
 * what fails is not one screen, it is a habit repeated across forty-two files.
 */

export function sourceFiles(dir: string, extensions = ['.ts', '.tsx', '.css']): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path, extensions)
    if (!extensions.some((extension) => entry.name.endsWith(extension))) return []
    if (entry.name.includes('.test.')) return []
    if (entry.name === 'routeTree.gen.ts') return []
    return [path]
  })
}

export function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** Lines that match, with their 1-based numbers, for a legible failure. */
export function offendingLines(source: string, pattern: RegExp): string[] {
  return source
    .split('\n')
    .map((line, index) => [index + 1, line] as const)
    .filter(([, line]) => pattern.test(line))
    .map(([number, line]) => `${number}: ${line.trim().slice(0, 120)}`)
}
