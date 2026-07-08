import type { SubmissionMetadata, SupportedPlatform } from '../types'

export interface DetectionContext {
  url: string
  html: string
}

export interface PlatformAdapter {
  platform: SupportedPlatform
  detectAccepted(context: DetectionContext): boolean
  extractCode(document: Document): string | null
  extractMetadata(document: Document, url: string): SubmissionMetadata | null
}
