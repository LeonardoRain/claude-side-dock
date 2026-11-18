import { expect, test } from 'claude-code/testing'

import { CNY_PER_USD, makePricing } from './savvy/pricing'

// The kit's `expect` has no toBeCloseTo.
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9

const million = { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('the defaults are Anthropic list prices, in USD', () => {
  const p = makePricing({})
  expect(p.currency).toBe('USD')
  expect(p.symbol).toBe('$')
  expect(near(p.costOf('claude-opus-5-5', million), 4)).toBe(true)
  expect(near(p.costOf('claude-sonnet-5-5', million), 2)).toBe(true)
  expect(near(p.costOf('claude-haiku-5-5', { ...million, input_tokens: 0, output_tokens: 1_000_000 }), 0.5)).toBe(true)
})

test('CNY turns the default prices by the fixed rate and changes the symbol', () => {
  const p = makePricing({ currency: 'CNY' })
  expect(p.symbol).toBe('¥')
  expect(near(p.costOf('claude-opus-5-5', million), 4 * CNY_PER_USD)).toBe(true)
})

test('the longest matching model name wins', () => {
  const p = makePricing({})
  expect(p.priceOf('claude-opus-5-5', 0).input).toBe(4)
  expect(p.priceOf('claude-opus-5', 0).input).toBe(5)
  expect(p.priceOf('claude-opus-4-8', 0).input).toBe(5)
})

test('Haiku 5.5 changes price above 100,000 prompt tokens, counting cache reads', () => {
  const p = makePricing({})
  expect(p.priceOf('claude-haiku-5-5', 99_999).input).toBe(0.1)
  expect(p.priceOf('claude-haiku-5-5', 100_000).input).toBe(0.5)
  const hit = { input_tokens: 10, output_tokens: 0, cache_read_input_tokens: 150_000, cache_creation_input_tokens: 0 }
  expect(near(p.costOf('claude-haiku-5-5', hit), (10 * 0.5 + 150_000 * 0.05) / 1e6)).toBe(true)
})

test('a model no price names is priced as the dearest, so cost is never understated', () => {
  expect(makePricing({}).priceOf('some-other-model', 0).output).toBe(50)
})

test('your own prices replace the defaults for the model they name', () => {
  const p = makePricing({ currency: 'CNY', modelPrices: ['opus-5-5=28/140/1.4/35'] })
  expect(near(p.costOf('claude-opus-5-5', million), 28)).toBe(true)
  // Others keep the converted default.
  expect(near(p.costOf('claude-sonnet-5-5', million), 2 * CNY_PER_USD)).toBe(true)
})

test('two numbers are enough: cache reads cost a tenth of input and writes 1.25 times', () => {
  const p = makePricing({ modelPrices: ['mymodel=10/50'] })
  const price = p.priceOf('mymodel-1', 0)
  expect(near(price.cacheRead, 1)).toBe(true)
  expect(near(price.cacheWrite, 12.5)).toBe(true)
})

test('a tiered entry and a comma-separated string are read', () => {
  const p = makePricing({ modelPrices: 'big=1/2, big>1000=3/4' })
  expect(p.priceOf('big', 999).input).toBe(1)
  expect(p.priceOf('big', 1000).input).toBe(3)
})

test('an entry that cannot be read is reported, not silently priced', () => {
  const p = makePricing({ modelPrices: ['opus=abc', 'nothing', 'x=1/2/3', 'ok=1/2'] })
  expect(p.rejected).toEqual(['opus=abc', 'nothing', 'x=1/2/3'])
  expect(p.priceOf('ok', 0).input).toBe(1)
})

test('a family box replaces every default of the family and reads a longer-prompt tier', () => {
  const p = makePricing({ priceHaiku: '0.7/3.5/0.07/0.875, 100000>3.5/17.5/0.35/4.375', priceOpus: '28/140/1.4/35' })
  expect(p.priceOf('claude-haiku-5-5', 99_999).input).toBe(0.7)
  expect(p.priceOf('claude-haiku-5-5', 100_000).input).toBe(3.5)
  expect(p.priceOf('claude-haiku-4', 0).input).toBe(0.7)
  expect(p.priceOf('claude-opus-5-5', 0).output).toBe(140)
  expect(p.priceOf('claude-sonnet-5-5', 0).input).toBe(2)
  expect(makePricing({ priceOpus: '1/x' }).rejected).toEqual(['opus=1/x'])
})
