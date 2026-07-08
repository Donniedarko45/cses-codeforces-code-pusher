export const sanitizeFilename = (input: string): string =>
  input
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')

export const truncate = (value: string, length = 100): string =>
  value.length <= length ? value : `${value.slice(0, length)}...`
