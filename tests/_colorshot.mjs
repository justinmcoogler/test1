import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8753;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'colors');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  g.disableAggro = true; g.weather.current='clear'; g.weather.intensity=0; g.weather.update=()=>{}; g.world.time=100;
  const colors = ['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
  for (let cx=-1;cx<=3;cx++) for (let cz=-1;cz<=3;cz++) g.world.ensureChunk(cx,cz);
  const S=(x,y,z,n)=>{ if(B[n]!==undefined) g.world.setBlock(x,y,z,B[n],true); };
  const rows = ['wool','concrete','terracotta','glazed_terracotta','stained_glass','concrete_powder'];
  colors.forEach((col,i)=>{ const x=8+i*2; rows.forEach((r,ri)=> S(x, 65, 8+ri*2, `${col}_${r}`)); S(x,65,20,`${col}_carpet`); });
  for (let cx=-1;cx<=3;cx++) for (let cz=-1;cz<=3;cz++) if(g.world.hasChunk(cx,cz)) g.renderer.remeshChunk(g.world,cx,cz);
});
await page.waitForTimeout(300);
async function shot(name,px,py,pz,yaw,pitch){
  await page.evaluate(([px,py,pz,yaw,pitch])=>{const g=window.__game;g.player.x=px;g.player.y=py-1.62;g.player.z=pz;g.player.vx=g.player.vy=g.player.vz=0;g.player.yaw=yaw;g.player.pitch=pitch;g.player.dead=false;},[px,py,pz,yaw,pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path:`tests/screenshots/colors-${name}.png` });
  console.log('shot',name);
}
try {
  await shot('grid', 22, 78, 2, Math.PI, -0.6);
  await shot('close', 22, 67.5, 4, Math.PI, -0.16);
} finally { await browser.close(); server.kill(); }
