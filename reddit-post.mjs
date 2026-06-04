// Reddit 发帖 — 复用 .reddit-profile 登录态, 连续会话填帖 + flag 确认发布.
//   node reddit-post.mjs
// 填好停发布前 → 截图 reddit-before-post.png → 等 .reddit-post-go 信号才点发帖.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA = path.join(__dirname, '.reddit-profile');
const PROXY = process.env.RT_PROXY || '';
const GO = path.join(__dirname, '.reddit-post-go');

// ===== 内容 (替换成你要发的; ⚠️ SUBREDDIT 必须是开放版块) =====
const SUBREDDIT = 'test';   // ⚠️ 占位! 改成你的目标版块再用 — 全小写, 必须是开放版块 (private 会弹"请求发帖"发不出), 别直接拿 'test' 发
const TITLE = 'Your post title here';
const BODY = `Replace this with your own post body.

Reddit values genuine, value-first content. Avoid naked promotional links — communities auto-flag self-promotion.

Keep it useful and on-topic for the target subreddit.`;

async function main() {
  const opts = {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  };
  if (PROXY) { opts.proxy = { server: PROXY }; }

  const ctx = await chromium.launchPersistentContext(USER_DATA, opts);
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.goto('https://www.reddit.com/submit?type=TEXT', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);
  console.log('[post] submit 页, url=', page.url());

  // 1. 选社区: 点"选择社区" → 搜 → 点搜索结果第一项
  try {
    await page.getByText('选择社区', { exact: false }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.keyboard.type(SUBREDDIT, { delay: 70 });
    await page.waitForTimeout(3500);
    // 点搜索结果里的目标社区 (模糊匹配)
    await page.getByText('r/' + SUBREDDIT, { exact: false }).first().click({ timeout: 8000 });
    console.log('[post] 社区已选: r/' + SUBREDDIT);
  } catch (e) { console.log('[post] !! 选社区失败:', e.message); }
  await page.waitForTimeout(3000);

  // 2. 标题 (坐标点击聚焦, 绕 web component shadow DOM)
  try {
    await page.mouse.click(648, 273);
    await page.waitForTimeout(700);
    await page.keyboard.type(TITLE, { delay: 12 });
    console.log('[post] 标题已填 (坐标)');
  } catch (e) { console.log('[post] !! 标题失败:', e.message); }
  await page.waitForTimeout(1000);

  // 3. 正文 (坐标点击聚焦 + 输入)
  try {
    await page.mouse.click(648, 470);
    await page.waitForTimeout(700);
    await page.keyboard.type(BODY, { delay: 6 });
    console.log('[post] 正文已填 (坐标)');
  } catch (e) { console.log('[post] !! 正文失败:', e.message); }

  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'reddit-before-post.png'), fullPage: true });
  console.log('[post] 内容已填 (已预确认 before-post), 直接发布...');

  // 直接发帖 (已过目内容并确认)
  let clicked = false;
  for (const sel of [
    () => page.getByRole('button', { name: '请求发帖', exact: true }),
    () => page.getByRole('button', { name: '发帖', exact: true }),
    () => page.locator('button:has-text("请求发帖")').last(),
    () => page.locator('button:has-text("发帖")').last(),
  ]) {
    try { await sel().click({ timeout: 6000 }); clicked = true; break; } catch (e) {}
  }
  await page.waitForTimeout(3000);
  // 发帖后可能弹"遵守版块规则"等确认窗, 再点一次确认/发布
  for (const t of ['发布', '确认', '提交', 'Post', 'Submit']) {
    try { await page.getByRole('button', { name: t, exact: true }).last().click({ timeout: 2500 }); break; } catch (e) {}
  }
  console.log('[post] 发帖按钮点击:', clicked ? '成功' : '失败');

  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(__dirname, 'reddit-after-post.png'), fullPage: true });
  console.log('[post] reddit-after-post.png 已存 — 看发布结果');
  await page.waitForTimeout(8000);
  await ctx.close();
}

main().catch((e) => { console.error('[ERROR]', e.message); process.exit(1); });
