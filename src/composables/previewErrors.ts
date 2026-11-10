export type LoadCause = 'network' | 'skeletonMissing' | 'atlasMissing' | 'textureMissing' | 'textureFailed' | 'unreadable' | 'invalid' | 'unknown'
export type LoadOrigin = 'folder' | 'online'
export interface LoadFailure {
  source: 'folder' | 'jsDelivr' | 'GitHub' | 'online'
  cause: LoadCause
  file: string
  code: string
}
export interface LoadIssue {
  origin: LoadOrigin
  cause: LoadCause
  file: string
  results: LoadFailure[]
}

export function fileName(path: string) {
  return path.split(/[?#]/)[0].replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? ''
}

export function loadSource(url: string, origin: LoadOrigin): LoadFailure['source'] {
  if (origin === 'folder') return 'folder'
  if (url.startsWith('https://cdn.jsdelivr.net/')) return 'jsDelivr'
  if (url.startsWith('https://raw.githubusercontent.com/')) return 'GitHub'
  return 'online'
}

export function describeLoadError(reason: unknown, origin: LoadOrigin, url = ''): LoadFailure[] {
  const typed = reason as { type?: string; message?: unknown } | null
  const text = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : JSON.stringify(reason) ?? ''
  let entries: [string, string][] = []
  if (reason && typeof reason === 'object' && !(reason instanceof Error) && !typed?.type) {
    entries = Object.entries(reason).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  } else if (typeof reason === 'string') {
    const start = reason.indexOf('{')
    if (start >= 0) {
      try {
        entries = Object.entries(JSON.parse(reason.slice(start))).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      } catch {}
    }
  }
  if (!entries.length) entries = [['', text]]
  return entries.map(([path, message]) => {
    const page = message.match(/page image:\s*(.+)$/i)?.[1]?.trim()
    const readFile = message.match(/Failed to read file ['"]([^'"]+)['"]/i)?.[1]
    const referenced = message.match(/(?:https?:\/\/[^\s"']+|[^\s"':]+\.(?:skel|json|atlas|png|jpe?g|webp))(?:\?[^\s"']*)?/i)?.[0]
    const file = fileName(page || readFile || path || referenced?.replace(/:$/, '') || '')
    const status = message.match(/(?:status\s*:?\s*|HTTP\s+)(\d{3})\b/i)?.[1]
    const type = typed?.type ?? ''
    let cause: LoadCause = 'unknown'
    const missing = status === '404' || /no such file|file not found|cannot find the file/i.test(message)
    if (type === 'MissingSkeletonOrJson' || type === 'SkeletonNotFound') cause = 'skeletonMissing'
    else if (type === 'MissingAtlas') cause = 'atlasMissing'
    else if (origin === 'folder' && /Failed to read file/i.test(message)) cause = 'unreadable'
    else if (/couldn't parse texture atlas|could not load skeleton (?:binary|JSON)|invalid skeleton data|unsupported skeleton file format|skeleton version.*not supported/i.test(message)) cause = 'invalid'
    else if (missing && /\.(skel|json)$/i.test(file)) cause = 'skeletonMissing'
    else if (missing && /\.atlas$/i.test(file)) cause = 'atlasMissing'
    else if (missing && /\.(png|jpe?g|webp)$/i.test(file)) cause = 'textureMissing'
    else if (origin === 'online' && /failed to fetch|network(?:error| error)|ERR_(?:NETWORK|INTERNET|CONNECTION|NAME_NOT_RESOLVED)|status\s*:?\s*0\b|timed? ?out/i.test(message)) cause = 'network'
    else if (/couldn't load image|page image:/i.test(message)) cause = 'textureFailed'
    return { source: loadSource(url, origin), cause, file, code: status ?? type }
  })
}

export function loadIssue(origin: LoadOrigin, results: LoadFailure[]): LoadIssue {
  const last = results[results.length - 1]
  return { origin, cause: last?.cause ?? 'unknown', file: last?.file ?? '', results: [...results] }
}
