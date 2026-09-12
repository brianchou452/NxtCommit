export type Locale = 'en' | 'zh-TW';
export type LocalizedText = { en: string; 'zh-TW'?: string };
export type ISODateTime = string;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface ApiError { error: string; code?: string }

export function localize(value: LocalizedText | string, locale: Locale): string {
  return typeof value === 'string' ? value : value[locale] ?? value.en;
}

export function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
  return value;
}
