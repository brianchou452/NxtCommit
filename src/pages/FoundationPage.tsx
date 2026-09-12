import { useLocale } from '../i18n/LocaleProvider.js';

/** Route placeholder only. It is not a product page or approved shell implementation. */
export function FoundationPage({ missing = false }: { missing?: boolean }) {
  const { text } = useLocale();
  return <main id="main-content" tabIndex={-1}>
    <h1>{missing ? text.not_found : text.foundation_title}</h1>
    <p>{text.foundation_notice}</p>
  </main>;
}
