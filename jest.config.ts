/** @jest-config-loader ts-node */
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  verbose: true,
}

/**
 * remark (the markdown in posts and pages) and the packages under it, and Lexical (the rich
 * text editor), ship as ES modules, so Jest has to compile them like our own code. Every
 * other package in node_modules is left as it is.
 */
const ESM_PACKAGES = [
  'lexical',
  '@lexical/[^/]+',
  // What Lexical's extensions run on
  '@preact/signals-core',
  'remark',
  'remark-[^/]+',
  'unified',
  'bail',
  'devlop',
  'trough',
  'is-plain-obj',
  'vfile',
  'vfile-[^/]+',
  'unist-[^/]+',
  'mdast-[^/]+',
  'micromark',
  'micromark-[^/]+',
  'decode-named-character-reference',
  'character-entities',
  'character-entities-[^/]+',
  'character-reference-invalid',
  'ccount',
  'zwitch',
  'longest-streak',
  'markdown-table',
  'escape-string-regexp',
  'stringify-entities',
  'parse-entities',
  'is-alphabetical',
  'is-alphanumerical',
  'is-decimal',
  'is-hexadecimal',
]

const jestConfig = async (): Promise<Config> => {
  const config = await createJestConfig(customJestConfig)()
  return {
    ...config,
    transformIgnorePatterns: [
      `/node_modules/(?!(${ESM_PACKAGES.join('|')})/)`,
      ...(config.transformIgnorePatterns ?? []).filter((p) => !p.includes('node_modules')),
    ],
  }
}

export default jestConfig
