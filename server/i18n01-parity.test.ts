import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en.js';
import { zhTW } from '../src/i18n/zh-TW.js';
import { resolveLocale } from '../src/i18n/locale.js';
import { localize } from '../shared/types.js';

test('English and Traditional Chinese dictionaries have identical keys and nonempty copy', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zhTW).sort());
  for (const dictionary of [en, zhTW]) for (const text of Object.values(dictionary)) assert.ok(text.trim());
});
test('locale restores valid preferences, falls back to browser language and preserves live text', () => {
  assert.equal(resolveLocale('en', 'zh-TW'), 'en');
  assert.equal(resolveLocale('zh-TW', 'en-US'), 'zh-TW');
  assert.equal(resolveLocale('invalid', 'zh-Hant'), 'zh-TW');
  assert.equal(resolveLocale(null, 'fr-FR'), 'en');
  assert.equal(localize({ en: 'Fallback' }, 'zh-TW'), 'Fallback');
  assert.equal(localize('Live runner output', 'zh-TW'), 'Live runner output');
});
