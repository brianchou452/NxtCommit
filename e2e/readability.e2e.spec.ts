import {test,expect} from '@playwright/test';
import {assertReadable} from './readability.js';
for(const width of [1440,390])for(const route of ['/','/demo','/marketplace','/new?demo=maintainer','/missions/catalog-mermaid','/contributors/demo-contributor','/assurance','/github']){
 test(`readable demo ${width} ${route}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto(route);
  if(width===390){await page.getByRole('button',{name:/language/i}).click();}
  await assertReadable(page);
  if(route==='/demo'){const labels=page.locator('.cc-delivery-model li > span');await expect(labels).toHaveCount(9);for(const label of await labels.all())await expect(label).toBeVisible();}
  await page.screenshot({path:info.outputPath('readability.png'),fullPage:true,animations:'disabled'});
 });
}
