const INTERNAL_PATH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\/data\/simdata\/simulation_result\/[^/"'<>\s)]+\/[^/"'<>\s)]+\/((?:[^/"'<>\s)]+\/)*[^/"'<>\s)]+\.[A-Za-z0-9_+-]+)/g, '[internal results]/$1'],
  [/\/data\/simdata\/simulation_result\/[^/"'<>\s)]+\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal results]'],
  [/\/data\/simdata\/simulation_result\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal results]'],
  [/\/data\/simdata\/simulation2(?=\/|["'<>\s)]|$)/g, '[internal dataset]'],
  [/\/data\/simdata\/docker_code\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data03\/WTG\/mamba(?=\/|["'<>\s)]|$)/g, '[internal env]'],
  [/\/data_d\/Velocity\/WTG\/scalene_result(?=\/|["'<>\s)]|$)/g, '[internal results]'],
  [/\/data_d\/Velocity\/WTG\/scalene(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data_d\/Velocity\/data\/simulation\/simulation_result\/[^/"'<>\s)]+\/[^/"'<>\s)]+\/((?:[^/"'<>\s)]+\/)*[^/"'<>\s)]+\.[A-Za-z0-9_+-]+)/g, '[internal results]/$1'],
  [/\/data_d\/Velocity\/data\/simulation\/simulation_result\/[^/"'<>\s)]+\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal results]'],
  [/\/data_d\/Velocity\/data\/simulation\/simulation_result\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal results]'],
  [/\/data_d\/Velocity\/data\/simulation\/docker_code\/wtg_code_cpu\/simulated_data(?=\/|["'<>\s)]|$)/g, '[internal dataset]'],
  [/\/data_d\/Velocity\/data\/simulation\/docker_code\/wtg_code_cpu(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data_d\/Velocity\/data\/simulation\/docker_code\/zy_code(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data_d\/Velocity\/data\/simulation\/docker_code\/zxl_code(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data_d\/Velocity\/data\/simulation\/docker_code\/[^/"'<>\s)]+(?=\/|["'<>\s)]|$)/g, '[internal source]'],
  [/\/data_d\/Velocity\/data\/simulation\/simulation2(?=\/|["'<>\s)]|$)/g, '[internal dataset]'],
  [/\/(?:tmp|scratch|workspace|gpfs|lustre|nfs|share|mnt|media)\/[^"'<>\\\s)]+/g, '[internal path]'],
  [/\/home\/[^"'<>\s)]*\/([^/"'<>\s)]+\.[A-Za-z0-9_+-]+)/g, '[user home]/$1'],
  [/\/home\/[^"'<>\s)]+/g, '[user home]'],
  [/[A-Za-z]:[\\/]Users[\\/][^"'<>\s)]*[\\/]([^\\/"'<>\s)]+\.[A-Za-z0-9_+-]+)/g, '[user home]/$1'],
  [/[A-Za-z]:[\\/]Users[\\/][^"'<>\s)]+/g, '[user home]']
]

const INTERNAL_NOTE_RE = /\p{Script=Han}/u
const INTERNAL_NOTE_FRAGMENT_RE = /\p{Script=Han}[^"'<>\\\n\r]*/gu
const SCALENE_LINE_FIELD_RE = /("line"\s*:\s*")((?:\\.|[^"\\])*)(")/g

const SAFE_LOCAL_STORAGE_SNIPPET = `<script>
const safeLocalStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {},
  key() { return null; },
  get length() { return 0; }
};

function patchExternalLinks() {
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (/^https?:\\/\\//i.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href') || '';
  if (!/^https?:\\/\\//i.test(href)) return;

  event.preventDefault();
  patchExternalLinks();
  try {
    window.parent?.postMessage({ type: 'scalene-open-external', href }, '*');
  } catch {}
});

let scaleneReportReadyPosted = false;

function notifyScaleneReportReady() {
  if (scaleneReportReadyPosted) return;
  scaleneReportReadyPosted = true;
  patchExternalLinks();
  try {
    window.parent?.postMessage({ type: 'scalene-report-ready' }, '*');
  } catch {}
}

function watchScaleneReportReady() {
  const profileRoot = document.getElementById('profile');
  if (!profileRoot) {
    window.addEventListener('load', () => {
      window.setTimeout(notifyScaleneReportReady, 300);
    }, { once: true });
    return;
  }

  const hasRenderedProfile = () => {
    return profileRoot.childElementCount > 0 || (profileRoot.textContent || '').trim().length > 0;
  };

  if (hasRenderedProfile()) {
    window.setTimeout(notifyScaleneReportReady, 0);
    return;
  }

  const observer = new MutationObserver(() => {
    if (!hasRenderedProfile()) return;
    observer.disconnect();
    window.setTimeout(notifyScaleneReportReady, 0);
  });

  observer.observe(profileRoot, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      observer.disconnect();
      notifyScaleneReportReady();
    }, 1500);
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', watchScaleneReportReady, { once: true });
</script>`

const SAFE_LOCAL_STORAGE_SNIPPET_RE = /<script>\s*const safeLocalStorage = \{[\s\S]*?scalene-open-external[\s\S]*?<\/script>/g
const SCALENE_PERSISTENT_INIT_SNIPPET = `<script>
document.addEventListener('DOMContentLoaded', () => {
  if (typeof processPersistentElements === 'function') {
    processPersistentElements();
  }
  if (typeof observeDOM === 'function') {
    observeDOM();
  }
}, { once: true });
</script>`

function sanitizePathString(value: string): string {
  return INTERNAL_PATH_REPLACEMENTS.reduce((result, [pattern, replacement]) => {
    return result.replace(pattern, replacement)
  }, value)
}

function sanitizeInternalNoteFragments(value: string): string {
  return value.replace(INTERNAL_NOTE_FRAGMENT_RE, '')
}

function sanitizeSourceLine(value: string): string {
  const sanitized = sanitizePathString(value)
  if (/^\s*#/.test(sanitized)) return ''
  return INTERNAL_NOTE_RE.test(sanitized) ? '' : sanitized
}

function sanitizeScaleneText(value: string): string {
  return sanitizeInternalNoteFragments(sanitizePathString(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeScalenePathSeparators(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\\/g, '/') : ''
}

function normalizeScaleneDirectoryPath(value: unknown): string {
  return normalizeScalenePathSeparators(value).replace(/\/+$/g, '')
}

function sanitizeScaleneFileKey(filePath: string, entrypointDir: unknown): string {
  const normalizedPath = normalizeScalenePathSeparators(filePath)
  const normalizedEntrypointDir = normalizeScaleneDirectoryPath(entrypointDir)

  if (
    normalizedPath
    && normalizedEntrypointDir
    && normalizedPath.startsWith(`${normalizedEntrypointDir}/`)
  ) {
    return sanitizePathString(normalizedPath.slice(normalizedEntrypointDir.length + 1))
  }

  return sanitizePathString(normalizedPath)
}

function hashScaleneFileKey(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

function buildUniqueScaleneFileKey(
  filePath: string,
  entrypointDir: unknown,
  usedKeys: Set<string>
): string {
  const sanitizedKey = sanitizeScaleneFileKey(filePath, entrypointDir)
  if (!usedKeys.has(sanitizedKey)) {
    usedKeys.add(sanitizedKey)
    return sanitizedKey
  }

  const disambiguatedKey = `${sanitizedKey} [source ${hashScaleneFileKey(filePath)}]`
  usedKeys.add(disambiguatedKey)
  return disambiguatedKey
}

function sanitizeScaleneFilesValue(value: unknown, entrypointDir: unknown): unknown {
  if (!isRecord(value)) return sanitizeJsonValue(value)

  const usedKeys = new Set<string>()
  return Object.fromEntries(
    Object.entries(value).map(([filePath, fileData]) => [
      buildUniqueScaleneFileKey(filePath, entrypointDir, usedKeys),
      sanitizeJsonValue(fileData, filePath)
    ])
  )
}

function sanitizeJsonValue(
  value: unknown,
  key = '',
  context: { entrypointDir?: unknown } = {}
): unknown {
  if (typeof value === 'string') {
    if (key === 'line') {
      return sanitizeSourceLine(value)
    }
    return sanitizeScaleneText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, key, context))
  }

  if (isRecord(value)) {
    const entrypointDir = typeof value.entrypoint_dir === 'string'
      ? value.entrypoint_dir
      : context.entrypointDir

    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => {
        if (nestedKey === 'files') {
          return [
            nestedKey,
            sanitizeScaleneFilesValue(nestedValue, entrypointDir)
          ]
        }

        return [
          sanitizePathString(nestedKey),
          sanitizeJsonValue(nestedValue, nestedKey, { entrypointDir })
        ]
      })
    )
  }

  return value
}

export function extractScaleneVersion(rawHtml: string): string {
  const match = rawHtml.match(/<a href="https:\/\/github\.com\/plasma-umass\/scalene">Scalene<\/a>\s*version\s*([^|<\n]+)/)
  const version = match?.[1]?.trim()
  return version ? `Scalene version ${version}` : ''
}

export function isScaleneHtmlReport(rawHtml: string): boolean {
  if (!/github\.com\/plasma-umass\/scalene/.test(rawHtml)) return false
  if (!/\bconst\s+profile\s*=/.test(rawHtml)) return false

  return /\bfunction\s+load3\s*\(/.test(rawHtml)
    || /\bwindow\.addEventListener\("load"/.test(rawHtml)
    || /id="profile"/.test(rawHtml)
}

export async function isScaleneJsonAccessible(url: string): Promise<boolean> {
  try {
    const headResponse = await fetch(url, { method: 'HEAD' })
    if (headResponse.ok) {
      const contentType = headResponse.headers.get('content-type')?.toLowerCase() ?? ''
      if (contentType.includes('text/html')) return false
      if (contentType.includes('json')) return true
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    if (!response.ok) {
      return false
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (contentType.includes('text/html')) {
      return false
    }
    if (contentType.includes('json')) {
      return true
    }

    const body = await response.text()
    const trimmed = body.trimStart()
    return trimmed.startsWith('{') || trimmed.startsWith('[')
  } catch {
    return false
  }
}

export async function fetchSanitizedScaleneJson(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('FETCH_ERROR')
  }

  const data = await response.json()
  const sanitized = sanitizeJsonValue(data)
  return JSON.stringify(sanitized, null, 2)
}

export function triggerJsonDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function removeInternalNoteLineFields(rawHtml: string): string {
  return rawHtml.replace(SCALENE_LINE_FIELD_RE, (match, prefix: string, encodedValue: string, suffix: string) => {
    try {
      const decoded = JSON.parse(`"${encodedValue}"`) as unknown
      return typeof decoded === 'string' && INTERNAL_NOTE_RE.test(decoded)
        ? `${prefix}${suffix}`
        : match
    } catch {
      return match
    }
  })
}

export function sanitizeScaleneHtml(rawHtml: string): string {
  let sanitized = sanitizeScaleneText(removeInternalNoteLineFields(rawHtml))
  const scaleneVersion = extractScaleneVersion(rawHtml)
  const missingPersistentInit = !/\bprocessPersistentElements\(\);/.test(rawHtml)
    || !/\bobserveDOM\(\);/.test(rawHtml)

  sanitized = sanitized.replace(SAFE_LOCAL_STORAGE_SNIPPET_RE, '')
  sanitized = sanitized.replace('</head>', `${SAFE_LOCAL_STORAGE_SNIPPET}</head>`)
  if (missingPersistentInit) {
    sanitized = sanitized.replace('</head>', `${SCALENE_PERSISTENT_INIT_SNIPPET}</head>`)
  }

  sanitized = sanitized.replace(
    /<div class="d-flex justify-content-center">\s*<details id="ai-optimization-options" class="ai-options">[\s\S]*?<\/details>\s*<\/div>/,
    ''
  )
  sanitized = sanitized.replace(
    /<details id="ai-optimization-options" class="ai-options">[\s\S]*?<\/details>/,
    ''
  )
  sanitized = sanitized.replace(
    /<div class="d-flex justify-content-center">\s*<\/div>\s*(<div id="profile">)/,
    '$1'
  )

  sanitized = sanitized.replace(
    /<nav class="navbar fixed-bottom navbar-default justify-content-center bg-light bg-opacity-75"[\s\S]*?<\/nav>/,
    scaleneVersion
      ? `<footer class="scalene-public-version">${scaleneVersion}</footer>`
      : ''
  )

  sanitized = sanitized.replace(
    /<script>\s*function clickToLoadFile\(\) \{[\s\S]*?<\/script>/,
    ''
  )

  sanitized = sanitized.replace(/replaceDivWithSelect\(\);/g, '')
  sanitized = sanitized.replace(/setInterval\(sendHeartbeat,\s*1e4\);/g, '')
  sanitized = sanitized.replace(/window\.localStorage/g, 'safeLocalStorage')
  sanitized = sanitized.replace(/\blocalStorage\./g, 'safeLocalStorage.')
  sanitized = sanitized.replace(
    /function sendHeartbeat\(\) \{[\s\S]*?xhr\.send\(\);\s*\}/,
    'function sendHeartbeat() {}'
  )

  sanitized = sanitized.replace(
    /<style>\s*#vg-tooltip-element\s*\{[\s\S]*?body\s*\{\s*padding:\s*0 0 90px 0;\s*\}\s*<\/style>/,
    `<style>
#vg-tooltip-element {
  z-index: 2000;
}
body {
  padding: 0;
}
.scalene-public-version {
  margin: 24px 0 16px;
  color: #486581;
  font-size: 0.85rem;
  text-align: center;
}
</style>`
  )

  return sanitized
}
