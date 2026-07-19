/**
 * Lightweight device / OS metadata collection for telemetry submissions.
 *
 * Prefers the modern `navigator.userAgentData` (User-Agent Client Hints) when
 * available and falls back to parsing `navigator.userAgent`. Touch detection is
 * derived from pointer capabilities so it works even when the UA is masked.
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface DeviceInfo {
  deviceType: DeviceType
  os: string
  osVersion: string | null
  browser: string
  isTouch: boolean
  userAgent: string
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false
  if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) return true
  return (
    typeof window.ontouchstart !== 'undefined' ||
    (typeof document !== 'undefined' && 'ontouchstart' in document.documentElement)
  )
}

export function classifyDeviceType(ua: string, touch: boolean): DeviceType {
  const uaData = (navigator as any).userAgentData
  const mobileHint: boolean | undefined = uaData?.mobile
  if (mobileHint === true) return 'mobile'
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile'
  // Heuristic: touch-capable non-mobile UA is likely a tablet/convertible.
  if (touch && !/macintosh|windows|linux x86|x11/i.test(ua)) return 'tablet'
  if (/macintosh|windows|linux|x11|chrome os|cros/i.test(ua)) return 'desktop'
  return 'unknown'
}

export function detectOs(ua: string): { os: string; version: string | null } {
  const rules: Array<{ re: RegExp; name: string }> = [
    { re: /windows nt 10/i, name: 'Windows' },
    { re: /windows nt 6\.3/i, name: 'Windows' },
    { re: /windows nt 6\.2/i, name: 'Windows' },
    { re: /windows nt 6\.1/i, name: 'Windows' },
    { re: /windows/i, name: 'Windows' },
    { re: /mac os x 10[._](\d+)/i, name: 'macOS' },
    { re: /mac os x/i, name: 'macOS' },
    { re: /iphone os (\d+)/i, name: 'iOS' },
    { re: /ipad; cpu os (\d+)/i, name: 'iOS' },
    { re: /android (\d+)/i, name: 'Android' },
    { re: /android/i, name: 'Android' },
    { re: /cros/i, name: 'Chrome OS' },
    { re: /linux x86_64/i, name: 'Linux' },
    { re: /linux/i, name: 'Linux' },
  ]
  for (const rule of rules) {
    const m = ua.match(rule.re)
    if (m) {
      const version = m[1] ? m[1].replace(/_/g, '.') : null
      return { os: rule.name, version }
    }
  }
  return { os: 'unknown', version: null }
}

export function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera'
  if (/chrome|crios/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua) && /version/i.test(ua)) return 'Safari'
  if (/chromium/i.test(ua)) return 'Chromium'
  return 'unknown'
}

export function getDeviceInfo(): DeviceInfo {
  const ua =
    (typeof navigator !== 'undefined' && navigator.userAgent) || 'unknown'
  const touch = detectTouch()
  const { os, version } = detectOs(ua)
  return {
    deviceType: classifyDeviceType(ua, touch),
    os,
    osVersion: version,
    browser: detectBrowser(ua),
    isTouch: touch,
    userAgent: ua,
  }
}
