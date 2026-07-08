import type { SubmissionMetadata, SupportedPlatform } from '../types'

export interface DetectionContext {
  url: string
  html: string
}

export interface PlatformAdapter {
  platform: SupportedPlatform
  detectAccepted(context: DetectionContext): boolean
  extractCode: (document: Document, url?: string) => string | null | Promise<string | null>
  fetchProblemStatement?: (url: string) => Promise<string>
  extractMetadata(document: Document, url: string): SubmissionMetadata | null | Promise<SubmissionMetadata | null>
  extractMultiple?: (
    document: Document,
    url: string,
    fetchProblemStatementFn: (url: string) => Promise<string>
  ) => Promise<{ metadata: SubmissionMetadata; sourceCode: string; readmeContent?: string }[] | null>
}
