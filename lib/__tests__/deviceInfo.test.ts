// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceInfo, classifyDeviceType, detectOs, detectBrowser } from '../deviceInfo'

describe('device detection (jsdom)', () => {
  beforeEach(() => {
    // Reset UA between cases; jsdom defaults to a generic UA.
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      configurable: true,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    })
  })

  it('classifies a desktop Linux UA', () => {
    expect(classifyDeviceType('Mozilla/5.0 (X11; Linux x86_64)', false)).toBe(
      'desktop',
    )
  })

  it('classifies an iPhone UA as mobile', () => {
    expect(
      classifyDeviceType(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        true,
      ),
    ).toBe('mobile')
  })

  it('detects Windows / macOS / Android / iOS from the UA', () => {
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0)').os).toBe('Windows')
    expect(detectOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)').os).toBe(
      'macOS',
    )
    const android = detectOs('Mozilla/5.0 (Linux; Android 14)')
    expect(android.os).toBe('Android')
    expect(android.version).toBe('14')
    expect(detectOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)').os).toBe('iOS')
  })

  it('detects the major browsers', () => {
    expect(detectBrowser('Mozilla/5.0 Chrome/120 Safari/537')).toBe('Chrome')
    expect(detectBrowser('Mozilla/5.0 Edg/120')).toBe('Edge')
    expect(detectBrowser('Mozilla/5.0 Firefox/120')).toBe('Firefox')
    expect(detectBrowser('Mozilla/5.0 (Mac) Safari/537 Version/17')).toBe('Safari')
  })

  it('getDeviceInfo returns a well-formed object', () => {
    const info = getDeviceInfo()
    expect(info.deviceType).toMatch(/^(desktop|mobile|tablet|unknown)$/)
    expect(typeof info.os).toBe('string')
    expect(typeof info.browser).toBe('string')
    expect(typeof info.isTouch).toBe('boolean')
    expect(typeof info.userAgent).toBe('string')
  })
})
