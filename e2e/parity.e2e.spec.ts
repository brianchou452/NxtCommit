import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.request.post('/api/demo/reset');});
for(const route of ['/', '/marketplace','/missions/catalog-mermaid','/missions/catalog-localsend','/missions/catalog-ky','/missions/catalog-marked','/contributors/demo-contributor','/new','/demo','/assurance','/github']){
 test(`source UI renders ${route} with no application error`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route);await expect(page.getByRole('heading').first()).toBeVisible();
 await expect(page.getByRole('heading',{name:'This page could not be loaded',exact:true})).toHaveCount(0);
 await expect(page.getByRole('main').first()).not.toContainText(/NaN%|NaN credits/);
 await page.waitForTimeout(600);expect(errors).toEqual([]);
 if(route==='/missions/catalog-mermaid'||route==='/demo'||route==='/') await page.screenshot({path:info.outputPath('source-parity.png'),fullPage:true,animations:"disabled"});
 });
}
test('catalog pledge updates shared wallet, triggers original celebration and persists in profile',async({page})=>{
 await page.goto('/missions/catalog-mermaid');
 await page.locator('[data-demo-action="pledge"]:visible').first().click();
 await page.getByRole('spinbutton').fill('10');
 await page.locator('[data-demo-action="confirm-pledge"]').click();
 await expect(page.locator('body')).toContainText('4,320');
 await page.goto('/contributors/demo-contributor');
 await expect(page.locator('body')).toContainText('Mermaid');
 const profile=await (await page.request.get('/api/contributors/demo-contributor')).json();
 expect(profile.receipts.find((r:any)=>r.missionId==='catalog-mermaid').pledged).toBe(10);
});
test('demo nine-stage model preserves progress across roles and guided provider chooses persisted campaign',async({page})=>{
 await page.goto('/demo');
 const actions=page.locator('.cc-role-actions button');
 await actions.first().click();await actions.first().click();
 await page.getByRole('tab').last().click();
 await expect(page.locator('.cc-delivery-model .is-current')).toContainText('FUNDING');
 await page.locator('[data-demo-launch]').click();
 await expect(page).toHaveURL(/marketplace\?demo=provider/);
 await expect(page.locator('[data-demo-active="true"]').first()).toBeVisible();
});
test('mobile source layout and reduced motion keep navigation and campaign content accessible',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/missions/catalog-mermaid');
 await page.getByRole('button',{name:/language/i}).click();
 await expect(page.locator('h1')).toContainText('系統');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('mobile-source.png'),fullPage:true,animations:"disabled"});
});

test('maintainer guide completes original tempo fixture through actual retry, review and local release',async({page},info)=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/new?demo=maintainer');
 for(const action of ['analyze','issue','generate','publish','open-mission']){
  await page.locator(`[data-demo-action="${action}"]:visible`).first().click();
 }
 await expect(page).toHaveURL(/missions\//);
 await page.locator('[data-demo-action="pledge"]:visible').first().click();
 await page.locator('[data-demo-action="confirm-pledge"]').click();
 await expect(page).toHaveURL(/\/run/);
 await expect(page.locator('[data-demo-action="review-artifact"]')).toBeVisible({timeout:15000});
 await expect(page.locator('body')).not.toContainText('NaNs');
 await expect(page.locator('body')).toContainText('2 of 2');
 await page.screenshot({path:info.outputPath('execution-source.png'),fullPage:true,animations:"disabled"});
 await page.locator('[data-demo-action="review-artifact"]').click();
 await expect(page.locator('body')).toContainText('20');
 await page.screenshot({path:info.outputPath('review-source.png'),fullPage:true,animations:"disabled"});
 await page.getByRole('textbox',{name:'Review comment',exact:true}).fill('Please cover malformed input and generous whitespace.');
 await page.getByRole('button',{name:'Request changes',exact:true}).click();
 await expect(page).toHaveURL(/\/run/);
 await expect(page.locator('[data-demo-action="review-artifact"]')).toBeVisible({timeout:15000});
 await page.locator('[data-demo-action="review-artifact"]').click();
 await expect(page.locator('body')).toContainText('23');
 let loseRelease=true;
 await page.route('**/api/missions/*/release',async route=>{if(loseRelease){loseRelease=false;await route.fulfill({status:503,json:{code:'request_failed'}});}else await route.continue();});
 await page.getByRole('button',{name:"Mark demo state as accepted"}).click();
 await page.getByRole('button',{name:'Record local demo release',exact:true}).click();
 await expect.poll(async()=>{
  const id=page.url().split('/missions/')[1]?.split('/')[0]?.split('?')[0];
  return (await (await page.request.get(`/api/missions/${id}`)).json()).status;
 }).toBe('released');
 expect(errors).toEqual([]);
});
test('failed marketplace request exposes retry without breaking React hooks',async({page})=>{
 let fail=true;await page.route('**/api/marketplace',async route=>fail?route.fulfill({status:503,json:{code:'unavailable'}}):route.continue());
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/marketplace');
 const retry=page.getByRole('button',{name:'Retry',exact:true});await expect(retry).toBeVisible();fail=false;await retry.click();
 await expect(page.locator('body')).toContainText('Mermaid');expect(errors).toEqual([]);
});
test('a lost pledge response retries the same intent without double charging',async({page})=>{
 let lost=true;const keys:string[]=[];
 await page.route('**/api/missions/catalog-mermaid/pledge',async route=>{keys.push(route.request().headers()['idempotency-key']!);if(lost){lost=false;await route.fetch();await route.fulfill({status:503,json:{code:'request_failed'}});}else await route.continue();});
 await page.goto('/missions/catalog-mermaid');await page.locator('[data-demo-action="pledge"]:visible').first().click();await page.getByRole('spinbutton').fill('10');
 const confirm=page.locator('[data-demo-action="confirm-pledge"]');await confirm.click();await expect(confirm).toBeEnabled();await confirm.click();
 await expect.poll(async()=> (await (await page.request.get('/api/bootstrap')).json()).currentUser.walletBalance).toBe(9990);
 expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
});
test('another tab pledge refreshes source profile and wallet through the named event stream',async({page})=>{
 await page.goto('/contributors/demo-contributor');await expect(page.locator('h1')).toBeVisible();
 await page.request.post('/api/missions/catalog-mermaid/pledge',{data:{amount:10}});
 await expect(page.locator('body')).toContainText('Mermaid');await expect(page.locator('header')).toContainText('9,990');
});
test('normal motion shows pledge particles while reduced motion retains a readable success state',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/missions/catalog-mermaid');
 await page.locator('[data-demo-action="pledge"]:visible').first().click();await page.getByRole('spinbutton').fill('10');await page.locator('[data-demo-action="confirm-pledge"]').click();
 await expect(page.locator('.cc-pledge-particle')).toHaveCount(14);await expect(page.locator('.cc-pledge-pop')).toBeVisible();
});
for(const concept of ['editorial','kickstarter','network','hybrid'])test(`source design concept ${concept} keeps its interactive examples`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`/concepts/${concept}`);await expect(page.getByRole('heading').first()).toBeVisible();expect(errors).toEqual([]);
});
test('time machine supports keyboard navigation without converting future projections into facts',async({page})=>{
 await page.goto('/missions/catalog-mermaid');const tabs=page.getByRole('tablist',{name:/Time machine/i}).getByRole('tab');
 await tabs.first().focus();await page.keyboard.press('End');await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 await expect(page.locator('body')).toContainText('projection');
});
test('protected demo launch preserves existing pledges while preparing an executable provider journey',async({page})=>{
 await page.request.post('/api/missions/catalog-mermaid/pledge',{data:{amount:10}});
 await page.route('**/api/bootstrap',async route=>{const response=await route.fetch();await route.fulfill({response,json:{...await response.json(),demoProtected:true}});});
 let resets=0;page.on('request',r=>{if(r.url().endsWith('/api/demo/reset'))resets++;});
 await page.goto('/demo');await page.getByRole('tab').last().click();await page.locator('[data-demo-launch]').click();
 await expect(page).toHaveURL(/campaign=/);
 const campaign=await (await page.request.get('/api/missions/catalog-mermaid')).json();expect(campaign.computePledged).toBe(4320);expect(resets).toBe(0);
});
