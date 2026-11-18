import { expect, test } from 'claude-code/testing'

import { stringsFor } from './lot/text'

test('the map speaks simplified Chinese when the language is zh', () => {
  const zh = stringsFor('zh')
  expect(zh.title).toBe('工作地图')
  expect(zh.stations.agents).toBe('代理')
  expect(zh.ms(107)).toBe('107 毫秒')
})

test('an unknown language still falls back to English', () => {
  expect(stringsFor('xx').title).toBe('Work map')
})
