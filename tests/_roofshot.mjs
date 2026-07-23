import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8755;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'manor');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game;
  g.disableAggro = true; g.weather.current='clear'; g.weather.intensity=0; g.weather.update=()=>{}; g.world.time=100;
  const mesh=(bx,bz,r)=>{for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){g.world.ensureChunk(Math.floor(bx/16)+dx,Math.floor(bz/16)+dz);}};
  mesh(-60,0,6);
  const rm=(bx,bz,r)=>{for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){const cx=Math.floor(bx/16)+dx,cz=Math.floor(bz/16)+dz;if(g.world.hasChunk(cx,cz))g.renderer.remeshChunk(g.world,cx,cz);}};
  rm(-60,0,5);
});
await page.waitForTimeout(300);
async function shot(name,px,py,pz,yaw,pitch){
  await page.evaluate(([px,py,pz,yaw,pitch])=>{const g=window.__game;g.player.x=px;g.player.y=py-1.62;g.player.z=pz;g.player.vx=g.player.vy=g.player.vz=0;g.player.yaw=yaw;g.player.pitch=pitch;g.player.dead=false;},[px,py,pz,yaw,pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path:`tests/screenshots/roof-${name}.png` });
  console.log('shot',name);
}
try {
  await shot('front', -60, 82, 22, 0, -0.35);   // south of manor, look N+down at roof
  await shot('high', -60, 95, 14, 0, -0.75);     // above, steep down at roof
} finally { await browser.close(); server.kill(); }
