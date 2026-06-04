// Reddit 连续会话 — 模拟真人: 开浏览器 → 首页 → 你登录 → 同会话直接进发帖页.
// 不拆成两次独立访问 (那像机器人). 一个 page, 全程不关.
//   node reddit-flow.mjs
// 你登录成功后跟 Claude 说"好了" → Claude touch .reddit-go → 同会话进 submit.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA = path.join(__dirname, '.reddit-profile');
const PROXY = process.env.RT_PROXY || '';
const GO = path.join(__dirname, '.reddit-go');

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

  // 1. 真人开浏览器先到首页 (不直接冲 submit, 那像爬虫)
  try {
    await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('[flow] reddit 首页打开 ✓');
  } catch (e) {
    console.log('[flow] !! 打不开 reddit:', e.message);
    await ctx.close();
    process.exit(1);
  }
  console.log('\n>>> 在这个窗口登录 Reddit (右上 Log In, 用户名密码/Google). 登录成功后跟 Claude 说"好了".\n');

  // 2. 等登录信号 (不限时, 你慢慢登)
  try { fs.existsSync(GO) && fs.unlinkSync(GO); } catch {}
  for (let i = 0; i < 600; i++) { if (fs.existsSync(GO)) break; await page.waitForTimeout(2000); }
  try { fs.unlinkSync(GO); } catch {}
  console.log('[flow] 收到信号, 同一会话进发帖页 (像真人登录后直接发)...');

  // 3. 同会话: 先停一下(像真人), 再进 new reddit 发帖页
  await page.waitForTimeout(2000);
  await page.goto('https://www.reddit.com/submit', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(7000);
  console.log('[flow] url=', page.url());
  await page.screenshot({ path: path.join(__dirname, 'reddit-flow.png'), fullPage: true });
  console.log('[flow] reddit-flow.png 已存 — 看登录态 + 发帖表单');

  // 不关, 留时间检查 / 后续填帖
  await page.waitForTimeout(180000);
  await ctx.close();
}

main().catch((e) => { console.error('[ERROR]', e.message); process.exit(1); });
