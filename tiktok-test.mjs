// TikTok 自动发布 — 复用抖音引擎, 改 URL + 可选代理
//   node tiktok-test.mjs login   # 登录(扫码/账号/Google), 登完跟 Claude 说"好了"才关, 不限时
//   node tiktok-test.mjs check   # 打开 upload 页截图, 看图文/视频入口
//
// 🔴 国内 IP 必死: VPN 全局/TUN 模式 → 直接走; socks/端口模式 → 设 TT_PROXY=http://127.0.0.1:端口

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] || 'check';
const USER_DATA = path.join(__dirname, '.tiktok-profile');
const PROXY = process.env.TT_PROXY || '';
const DONE_FLAG = path.join(__dirname, '.tiktok-login-done');

async function main() {
  const opts = {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  };
  if (PROXY) { opts.proxy = { server: PROXY }; console.log('[proxy]', PROXY); }

  const ctx = await chromium.launchPersistentContext(USER_DATA, opts);
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  if (MODE === 'login') {
    try {
      await page.goto('https://www.tiktok.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
      console.log('[login] TikTok 登录页已打开 → VPN 翻墙生效 ✓');
    } catch (e) {
      console.log('[login] !! 打不开 TikTok:', e.message, '→ 若端口模式用 TT_PROXY 重跑');
      await ctx.close();
      process.exit(1);
    }
    console.log('\n>>> 登录 TikTok (扫码/账号/Google). 登录成功后跟 Claude 说"好了" (不限时, 最多 20 分钟).\n');
    try { fs.existsSync(DONE_FLAG) && fs.unlinkSync(DONE_FLAG); } catch {}
    for (let i = 0; i < 600; i++) {
      if (fs.existsSync(DONE_FLAG)) break;
      await page.waitForTimeout(2000);
    }
    try { fs.unlinkSync(DONE_FLAG); } catch {}
    await ctx.close();
    console.log('[login] 收到信号, profile 已存:', USER_DATA);
    process.exit(0);
  }

  // check: 打开 upload 页看入口
  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    console.log('[check] !! 打不开:', e.message);
    await ctx.close();
    process.exit(1);
  }
  await page.waitForTimeout(6000);
  console.log('[check] url=', page.url());
  await page.screenshot({ path: path.join(__dirname, 'tiktok-upload.png'), fullPage: true });
  console.log('[check] tiktok-upload.png 已存 — 看图文/视频上传入口');
  await page.waitForTimeout(3000);
  await ctx.close();
  process.exit(0);
}

main().catch((e) => { console.error('[ERROR]', e.message); process.exit(1); });
