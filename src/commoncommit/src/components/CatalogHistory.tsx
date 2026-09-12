import type {CatalogContent} from '../../../../shared/catalog.js';
import {useI18n} from '../i18n/index.js';
export function CatalogHistory({content}:{content:CatalogContent}){
 const {t,locale}=useI18n();
 const lt=(value: string | {en:string;"zh-TW"?:string})=>typeof value==="string"?value:value[locale] ?? value.en;
 return <section className="dc-decision-card p-6" data-testid="catalog-content">
  <p className="text-sm text-mut">{t('catalog.note')}</p>
  {content.history.map((run,i)=><details key={i} className="mt-4"><summary className="cursor-pointer font-semibold">{t('catalog.history')}</summary><ol>{run.events.map((e,j)=><li key={j} className="mt-3"><strong>{lt(e.title)}</strong>{e.detail&&<p className="text-sm text-mut">{lt(e.detail)}</p>}</li>)}</ol></details>)}
  {content.artifact&&<details className="mt-4"><summary className="cursor-pointer font-semibold">{t('catalog.artifact')}</summary><p>{lt(content.artifact.summary)}</p>{content.artifact.files.map(f=><details key={f.path}><summary>{f.path}</summary><pre className="overflow-auto text-xs">{f.diff}</pre></details>)}</details>}
 </section>;
}
