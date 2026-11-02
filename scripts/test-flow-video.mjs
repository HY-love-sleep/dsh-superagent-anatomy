import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';

const root=process.cwd();
const browserPath=process.env.CHROME;
assert(browserPath,'Set CHROME to a local Chromium executable.');
const evidence=path.join(root,'docs/superagent-flow/evidence');
await mkdir(evidence,{recursive:true});
let baseline=true;
const base=process.env.BASELINE_REV || execFileSync('git',['merge-base','HEAD','origin/main'],{encoding:'utf8'}).trim();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    const bytes=baseline?execFileSync('git',['show',`${base}:${path.relative(root,target)}`],{stdio:['ignore','pipe','ignore']}):await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(bytes);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('404 Not Found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/docs/superagent-flow/watch.html`;
let browser;
try{
  console.error('test: launch browser');
  browser=await puppeteer.launch({executablePath:browserPath,headless:true,protocolTimeout:20000,args:['--no-sandbox']});
  const page=await browser.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
  console.error('test: load baseline');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1440,height:1100,deviceScaleFactor:1});
  assert.equal((await page.goto(url)).status(),404);
  await page.screenshot({path:path.join(evidence,'before-baseline-404.png')});
  baseline=false;
  console.error('test: load player');
  assert.equal((await page.goto(url)).status(),200);
  await page.waitForFunction(()=>!document.getElementById('play').disabled);
  const frame=page.frames().find(f=>f.url().endsWith('/index.html'));
  assert(frame);
  await frame.evaluate(()=>document.fonts.ready.then(()=>true));
  console.error('test: font ready; sample scenes');
  assert(await frame.evaluate(()=>document.fonts.check('32px Chinese')),'Bundled Chinese font loaded');
  const labels=['intro','roles','intake','execution','followup','delivery'];
  const hashes={};
  for(const t of [5,15,25,35,45,55,59.75,35,5]){
    await frame.evaluate(t=>{window.__timelines.superagent.seek(t);},t);
    const scene=labels[Math.min(5,Math.floor(t/10))];
    const result=await frame.evaluate(scene=>{
      const root=document.getElementById(scene);const bounds=root.getBoundingClientRect();
      const out=[];
      for(const el of root.querySelectorAll('h1,h2,h3,p,strong,small,.label')){
        const r=el.getBoundingClientRect();
        if(r.left<bounds.left||r.right>bounds.right||r.top<bounds.top||r.bottom>bounds.bottom)out.push(el.textContent);
      }
      return {opacity:Number(getComputedStyle(root).opacity),overflow:out};
    },scene);
    assert.equal(result.opacity,1,`${scene} visible`);assert.deepEqual(result.overflow,[],`${scene} in frame`);
    const png=await (await frame.$('#stage')).screenshot();
    const hash=createHash('sha256').update(png).digest('hex');
    if(hashes[t])assert.equal(hash,hashes[t],`Deterministic seek back to ${t}s`);hashes[t]=hash;
  }
  assert.equal(new Set(Object.values(hashes)).size,7,'Different scenes have different pixels');
  await page.click('[data-at="20"]');
  assert(Math.abs(await frame.evaluate(()=>window.__timelines.superagent.time())-21.8)<.01);
  await page.click('#play');
  await page.waitForFunction(()=>document.getElementById('seek').value>22.1);
  await page.click('#play');
  assert(await frame.evaluate(()=>window.__timelines.superagent.paused()));
  await page.$eval('#seek',el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await frame.evaluate(()=>window.__timelines.superagent.time()),45);
  await frame.evaluate(()=>{window.__timelines.superagent.seek(60,false);});
  assert.equal(await page.$eval('#time',el=>el.textContent),'01:00 / 01:00');
  await page.click('#play');
  await page.waitForFunction(()=>Number(document.getElementById('seek').value)>0.1 && Number(document.getElementById('seek').value)<3);
  await page.click('#play');
  await page.click('[data-at="10"]');
  await page.screenshot({path:path.join(evidence,'after-player-desktop.png')});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.screenshot({path:path.join(evidence,'after-player-mobile.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal scroll at phone width');
  const links=await page.$$eval('details a',els=>els.map(e=>e.href));
  assert.equal(links.length,6,'Six public source citations');
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log(JSON.stringify({ok:true,baselineRevision:base,baselineStatus:404,changedStatus:200,scenario:'watch.html; light theme; 1440x1100; chapter 02 after load',fontLoaded:true,scenePixelHashes:hashes,interactionTests:['chapter seek','play advances time','pause','slider','reverse seek','completion at 01:00','replay','mobile width'],browserErrors:errors},null,2));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
