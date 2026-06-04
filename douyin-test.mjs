// 抖音图文自动发布 — Playwright 脚本
// 用法:
//   node douyin-test.mjs login              # 首次: 扫码登录, profile 存住
//   node douyin-test.mjs publish [图片]      # 只塞图 + 截图 (不发布)
//   node douyin-test.mjs send [图片]         # 塞图 + 填文案 + 停在发布前, 等 .publish-go 信号才真发
//
// 核心: Playwright setInputFiles 传任意本地图, 绕开 Chrome 扩展 file_upload 沙箱.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] || 'publish';
const USER_DATA = path.join(__dirname, '.douyin-profile');
const IMG = process.argv[3] || path.resolve(__dirname, '../../xiaohei-test.png');
const GO_FLAG = path.join(__dirname, '.publish-go');

const UPLOAD_URL = 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3';

// ===== 要发布的内容 (替换成你自己的) =====
const POST = {
  title: '示例标题（替换成你要发的内容）',
  body: `示例正文。把这里替换成你要发布的图文文案。

支持多段落、emoji、话题标签。

#话题1 #话题2 #话题3`,
};

async function main() {
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  if (MODE === 'login') {
    await page.goto('https://creator.douyin.com/', { waitUntil: 'domcontentloaded' });
    console.log('\n>>> 手机抖音扫码登录. 窗口停 150 秒后存 profile.\n');
    await page.waitForTimeout(150000);
    await ctx.close();
    console.log('[login] profile 已存:', USER_DATA);
    process.exit(0);
  }

  if (MODE === 'check') {
    await page.goto('https://creator.douyin.com/creator-micro/content/manage', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(__dirname, 'manage.png'), fullPage: true });
    console.log('[check] manage.png 已存 — 看作品列表最新一条');
    await ctx.close();
    process.exit(0);
  }

  // 通用: 打开图文页 + 塞图
  console.log('[' + MODE + '] 图片:', IMG);
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const url = page.url();
  if (url.includes('/login') || url.includes('passport')) {
    console.log('\n!! 未登录. 先跑: node douyin-test.mjs login\n');
    await ctx.close();
    process.exit(1);
  }

  const fileInput = page.locator('input[type=file]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 15000 });
  await fileInput.setInputFiles(IMG);
  console.log('[' + MODE + '] setInputFiles 已执行, 等抖音处理图片...');
  await page.waitForTimeout(8000);

  if (MODE === 'publish') {
    await page.screenshot({ path: path.join(__dirname, 'douyin-after-upload.png') });
    console.log('\n>>> douyin-after-upload.png 已存\n');
    await page.waitForTimeout(120000);
    await ctx.close();
    process.exit(0);
  }

  // ===== send: 填文案 + 停在发布前 + 等 GO 信号 =====
  // 关引导弹窗
  for (const t of ['我知道了', '知道了', '跳过']) {
    try { await page.getByText(t, { exact: false }).first().click({ timeout: 1500 }); } catch {}
  }

  // 标题
  try {
    const title = page.locator('input[placeholder*="标题"], input[placeholder*="作品标题"]').first();
    await title.click({ timeout: 8000 });
    await title.fill(POST.title);
    console.log('[send] 标题已填');
  } catch (e) { console.log('[send] 标题填写失败:', e.message); }

  // 正文 (富文本 contenteditable)
  try {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click({ timeout: 8000 });
    await page.keyboard.type(POST.body, { delay: 18 });
    console.log('[send] 正文已填');
  } catch (e) { console.log('[send] 正文填写失败:', e.message); }

  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'before-publish.png'), fullPage: true });
  console.log('\n>>> before-publish.png 已存 — 检查填写是否正确');

  // 清掉旧 flag, 等 GO 信号
  try { fs.existsSync(GO_FLAG) && fs.unlinkSync(GO_FLAG); } catch {}
  console.log('>>> 等 GO 信号 (touch .publish-go), 最多 300 秒. 不给信号则不发布.\n');

  let go = false;
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(GO_FLAG)) { go = true; break; }
    await page.waitForTimeout(2000);
  }

  if (!go) {
    console.log('[send] 超时未收到 GO, 放弃发布 (内容已填, 未发).');
    await ctx.close();
    process.exit(0);
  }

  try { fs.unlinkSync(GO_FLAG); } catch {}
  console.log('[send] 收到 GO, 点发布按钮...');

  // 点发布 (排除左上"高清发布", 取底部主"发布")
  let clicked = false;
  for (const sel of [
    () => page.getByRole('button', { name: '发布', exact: true }),
    () => page.locator('button:has-text("发布")').last(),
  ]) {
    try {
      await sel().click({ timeout: 6000 });
      clicked = true;
      break;
    } catch (e) { /* try next */ }
  }
  console.log('[send] 发布按钮点击:', clicked ? '成功' : '失败');

  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(__dirname, 'after-publish.png'), fullPage: true });
  console.log('\n>>> after-publish.png 已存 — 看发布结果\n');
  await page.waitForTimeout(6000);
  await ctx.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('[ERROR]', e.message);
  process.exit(1);
});
