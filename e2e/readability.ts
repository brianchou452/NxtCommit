import {expect,type Page} from '@playwright/test';
export async function assertReadable(page:Page){
 await expect(page.getByRole('heading').first()).toBeVisible();
 const audit=await page.evaluate(()=>{
  const small:Array<{text:string;size:number;tag:string}>=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,el=node.parentElement;
   if(!el||!(el instanceof HTMLElement)||!node.textContent?.trim()||node.textContent.trim().length<3||el.closest('svg,[aria-hidden="true"],script,style'))continue;
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   if(rect.width===0||rect.height===0||style.visibility==='hidden'||style.display==='none')continue;
   const size=parseFloat(style.fontSize);if(size<13.9)small.push({text:node.textContent.trim().slice(0,80),size,tag:el.tagName});
  }
  return {small:small.slice(0,20),width:document.documentElement.scrollWidth,viewport:innerWidth,overflow:Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent?.slice(0,60)}))};
 });
 expect(audit.small,'Visible interface copy must remain at least 14px').toEqual([]);
 expect(audit.width,'Content must reflow without horizontal page scrolling: '+JSON.stringify(audit.overflow)).toBeLessThanOrEqual(audit.viewport+1);
}
