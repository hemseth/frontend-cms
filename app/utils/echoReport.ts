/**
 * The backend stores an echo report as one free-text `result`; findings and conclusion are kept
 * apart with language-independent markers so the report can be reopened and edited.
 */
const FINDINGS = '[FINDINGS]'
const CONCLUSION = '[CONCLUSION]'

export function parseEchoReport(text = '') {
  const f = text.indexOf(FINDINGS)
  const c = text.indexOf(CONCLUSION)
  if (f === -1 && c === -1) return { findings: text, conclusion: '' }
  return {
    findings: text.slice(f === -1 ? 0 : f + FINDINGS.length, c === -1 ? undefined : c).trim(),
    conclusion: c === -1 ? '' : text.slice(c + CONCLUSION.length).trim()
  }
}

export function buildEchoReport(findings: string, conclusion: string) {
  return `${FINDINGS}\n${findings.trim()}\n\n${CONCLUSION}\n${conclusion.trim()}`
}
