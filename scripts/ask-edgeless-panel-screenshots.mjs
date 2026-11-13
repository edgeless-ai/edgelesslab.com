// Layout-only screenshots. NO inference; never presented as five-prompt acceptance.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const [site,shop,out]=process.argv.slice(2);
if(!site||!shop||!out)throw Error('usage: SITE_PREVIEW SHOP_PREVIEW ARTIFACT_DIR');
for(const base of [site,shop])if(new URL(base).protocol!=='https:'||!new URL(base).hostname.endsWith('.workers.dev'))throw Error('Preview URLs only');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const [name,url] of [['blog',site+'/blog/'],['shop',shop+'/']]) {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    let inferenceRequests=0;
    page.on('request',r=>{if(new URL(r.url()).pathname==='/api/ask-edgeless/v1/chat/completions')inferenceRequests++;});
    await page.goto(url,{waitUntil:'domcontentloaded'});
    const decline=page.getByRole('button',{name:'Decline',exact:true});
    if(await decline.isVisible())await decline.click();
    await page.locator('#ask-edgeless #toggle').click();
    await page.locator('#ask-edgeless #panel').waitFor({state:'visible'});
    await page.screenshot({path:out+'/ask-edgeless-'+name+'-panel.png'});
    assert.equal(inferenceRequests,0,'layout capture must not invoke the model');
    console.log(JSON.stringify({surface:name,url:page.url(),panelVisible:await page.locator('#ask-edgeless #panel').isVisible(),inferenceRequests,verification:'layout-only'}));
    await context.close();
  }
}finally{await browser.close();}
