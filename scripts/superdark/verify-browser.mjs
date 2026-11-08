import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const base=(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:8894').replace(/\/$/,'');
const dir=resolve(process.env.VERIFY_EVIDENCE_DIR || 'test-results/superdark');
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chromium-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader','--disable-background-networking','--disable-dev-shm-usage']});
const results={base,consoleErrors:[],requestFailures:[],images:[],figure:{},viewports:[]};
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
  const page=await context.newPage();
  page.on('pageerror',e=>results.consoleErrors.push(e.message));
  page.on('requestfailed',r=>results.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
  const response=await page.goto(base+'/blog/superdark-factory/',{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  const rejectAnalytics=page.getByRole('button',{name:'Reject analytics',exact:true});
  if(await rejectAnalytics.isVisible()) await rejectAnalytics.click();
  await page.locator('h1').filter({hasText:'The Superdark Factory: Keep the Stop Switch'}).waitFor();
  for(const image of await page.locator('article img').all()){
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img=>img.decode());
    const state=await image.evaluate(img=>({src:img.getAttribute('src'),alt:img.alt,width:img.naturalWidth,height:img.naturalHeight}));
    assert(state.width>0 && state.height>0,JSON.stringify(state));results.images.push(state);
  }
  assert.equal(results.images.length,5);
  const frameElement=page.locator('iframe[title*="isometric"]');
  await frameElement.scrollIntoViewIfNeeded();
  const frame=page.frameLocator('iframe[title*="isometric"]');
  await frame.getByRole('button',{name:'04 / Charter'}).click();
  assert.equal(await frame.getByRole('button',{name:'04 / Charter'}).getAttribute('aria-pressed'),'true');
  const fixedBefore=await frame.locator('#kernel').innerHTML();
  const needleBefore=await frame.locator('#soft-needle').getAttribute('d');
  await frame.locator('#soft-rule').fill('85');
  const needleAfter=await frame.locator('#soft-needle').getAttribute('d');
  assert.notEqual(needleBefore,needleAfter);
  assert.equal(await frame.locator('#setting').textContent(),'85 / 100');
  assert.equal(await frame.locator('#kernel').innerHTML(),fixedBefore);
  await frame.getByRole('button',{name:'Hide controls'}).click();
  assert.equal(await frame.locator('nav').isVisible(),false);
  await frame.getByRole('button',{name:'Show controls'}).click();
  assert.equal(await frame.locator('nav').isVisible(),true);
  await frame.getByRole('button',{name:'Light theme'}).click();
  assert.equal(await frame.locator('body').getAttribute('data-theme'),'light');
  await frame.getByRole('button',{name:'Dark theme'}).click();
  await frame.getByRole('button',{name:'05 / Kernel'}).click();
  await frame.getByRole('button',{name:'01 / Primitive'}).click();
  results.figure={sandbox:await frameElement.getAttribute('sandbox'),rangeChangesNeedle:true,baseUnchanged:true,controlsHideAndRestore:true,lightAndDark:true,selection:true};
  for(const width of [1440,390,375]){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>window.scrollTo(0,0));
    // Long mobile articles can exceed Chromium's full-page texture limit.
    // Capture the viewport and the independently exercised embedded figure.
    await page.screenshot({path:resolve(dir,`post-${width}.png`)});
    await frameElement.scrollIntoViewIfNeeded();
    await frameElement.screenshot({path:resolve(dir,`figure-${width}.png`)});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,`page overflows at ${width}`);
    const frameOverflow=await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(frameOverflow,false,`iframe overflows at ${width}`);
    results.viewports.push({width,overflow,frameOverflow});
  }
  for(const name of ['dark-stack','autonomy-ladder','bounded-loop','anatomy-static']){
    const art=await context.newPage();
    await art.setViewportSize({width:1000,height:1100});
    await art.goto(base+`/images/blog/superdark-factory/${name}.svg`);
    await art.screenshot({path:resolve(dir,name+'.png')});
    await art.close();
  }
  const art=await context.newPage();
  await art.goto(base+'/figures/superdark-factory/dark-stack.html');
  await art.screenshot({path:resolve(dir,'interactive-dark.png'),fullPage:true});
  await art.getByRole('button',{name:'Light theme'}).click();
  await art.screenshot({path:resolve(dir,'interactive-light.png'),fullPage:true});
  assert.equal(results.consoleErrors.length,0,JSON.stringify(results.consoleErrors));
  // Next.js cancels speculative route prefetches as this long article scrolls.
  // Image decoding and every iframe control are checked independently above.
  const failures=results.requestFailures.filter(r=>r.error!=='net::ERR_ABORTED');
  assert.equal(failures.length,0,JSON.stringify(failures));
  results.pass=true;
  console.log(JSON.stringify(results,null,2));
} finally {
  writeFileSync(resolve(dir,'browser-report.json'),JSON.stringify(results,null,2));
  await browser.close();
}
