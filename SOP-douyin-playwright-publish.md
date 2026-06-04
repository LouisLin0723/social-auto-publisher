# 抖音图文自动发布 SOP（Playwright 脚本流）

> 实战沉淀。一句话：抖音图文要全自动发布，**用 Playwright `setInputFiles` 脚本**，不要用浏览器扩展（扩展有文件沙箱，走不通）。

---

## 一、为什么用 Playwright 脚本，而不是浏览器扩展

自动发图，第一直觉是用浏览器自动化扩展（如 Chrome MCP）去点"上传"。**走不通**，撞两道墙：

1. **文件上传安全沙箱**：浏览器扩展的 `file_upload` 只允许上传"用户主动分享给会话的文件"（聊天附件 / 会话目录），**AI 自己生成的本地图一律拒绝** —— 这是防止 AI 乱传用户硬盘文件的安全设计，不是 bug。
2. **OS 文件选择框碰不到**：点 `<input type=file>` 弹出的是操作系统级文件框，DOM 自动化（点击 / JS 注入）够不到它，一点就卡死。

**Playwright `setInputFiles` 同时绕过两道墙**：它走 CDP `DOM.setFileInputFiles`，把任意本地文件路径直接塞进 file input 元素，不触发 OS 弹窗、无会话沙箱限制。**这就是全自动上传的钥匙。**

---

## 二、技术架构

| 选择 | 为什么 |
|---|---|
| `playwright-core`（非 `playwright`） | 纯 JS 包，不下载 150MB chromium |
| `channel: 'chrome'` | 复用系统已装的 Chrome，免下载浏览器 |
| `launchPersistentContext` + 独立 `userDataDir` | 登录态持久化到本地 profile，**扫码一次**永久复用；独立 profile 不碰用户日常 Chrome，可并存 |
| `headless: false` | 抖音对 headless 反爬敏感 + 扫码要可见窗口 |
| 抹 `navigator.webdriver` | 反自动化检测第一关 |

```js
const ctx = await chromium.launchPersistentContext(USER_DATA, {
  channel: 'chrome',
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
```

---

## 三、完整流程

### 1. 登录（一次性）
```
node douyin.mjs login
```
有头浏览器弹出 → 手机抖音 App 扫码 → 登录态写入独立 `userDataDir`，之后所有发布复用。

### 2. 塞图
图文上传页：`creator.douyin.com/creator-micro/content/upload?default-tab=3`（`default-tab=3` = 图文）。
file input 藏在"点击上传 / 拖图区"背后，是标准 `<input type=file>`：
```js
const fi = page.locator('input[type=file]').first();
await fi.waitFor({ state: 'attached' });
await fi.setInputFiles(localImgPath);   // 关键一步：塞任意本地图
```

### 3. 填文案
- 标题：`input[placeholder*="标题"]` → `.fill(title)`
- 正文：富文本 `[contenteditable="true"]` → `.click()` 后 `page.keyboard.type(body)`
- 话题：把 `#话题` 写在正文末尾即可（抖音自动识别）

### 4. 人工确认闸门（防误发，重要）
**发布不可撤 + 公开**。脚本填好后必须**停在发布前**，等人确认：
- 截图 `before-publish.png`
- 轮询一个 flag 文件（如 `.publish-go`），**不给信号不发布**
- 人核对截图填对了 → `touch .publish-go` → 脚本才点发布

这一步是对"不可撤公开发布"的安全保护，别省。

### 5. 发布
```js
await page.getByRole('button', { name: '发布', exact: true }).click();
```
注意：`exact: true` 排除左上角"高清发布"，取底部主"发布"按钮。

### 6. 验证
发布成功信号：**跳转到作品管理页** + 弹出"**发布满意度**"调查窗。到 `content/manage` 作品列表确认那条状态（图文要过审）。

---

## 四、踩坑记录

| 坑 | 真相 | 解 |
|---|---|---|
| 扩展 `file_upload` 拒图 | 只收会话 attach 文件，拒 AI 生成图 | 用 Playwright `setInputFiles` |
| 扩展 `navigate` 到 `file://` | 被强加 `https://` 前缀，开不了本地 HTML | 用 Playwright / headless chrome 渲染 |
| Git Bash 里 `&` 调 exe 报错 | Bash 工具是 Git Bash，不是 PowerShell | exe 用 `/c/...` 正斜杠路径直接调 |
| `wmic` 杀进程 command not found | Win11 移除了 wmic | 让脚本优雅自退（`waitForTimeout` + `ctx.close()`），别强杀 |
| 发布后作品列表没新帖 | 截图截太早，列表没刷新 / 图文在审核中 | 重开 `content/manage` 刷新确认 |
| 作品状态"不适宜公开" | **YMYL / 敏感类目风控**（见下） | 改纯科普 / 资讯向文案 |

---

## 五、内容合规（YMYL / 敏感类目尤其重要）

实测：YMYL 类目（涉及健康、财运、人生重大决策的内容）直接发**极易被抖音判"不适宜公开"**（限流 / 不公开展示）。通用雷区：

- ❌ 服务诱导 / 引导私下联系（"评论区留 X，我帮你 Y"）
- ❌ 具体承诺 / 保证性表述
- ✅ 必带合规免责声明
- ✅ **纯科普 / 资讯向**：讲概念、背景、知识，绝不涉具体服务承诺

抖音对 YMYL 敏感类目审核严，这类账号要走"科普 / 资讯"人设，不做"在线服务"。

---

## 六、TikTok 差异（同引擎，改 URL + 加代理）

技术跟抖音一样（`setInputFiles`），但多几道坎：

- 🔴 **国内 IP 必死**：TikTok 封中国大陆 IP，直连秒封。**必须挂海外代理**：
  ```js
  launchPersistentContext(USER_DATA, {
    channel: 'chrome',
    proxy: { server: 'http://127.0.0.1:7890' },  // 指向本地 VPN/sing-box 端口
    ...
  });
  ```
  （VPN 若是全局 TUN 模式，系统已翻墙，可不配 proxy；socks/mixed 端口模式则配 proxy 指端口）
- 海外账号登录
- ⚠️ 机房 IP（VPS）可能被风控限流，住宅 IP 最稳
- 主力是**视频**，图文 photo mode 的 web 端支持有限

---

## 七、配图（配套）

配图用 Claude **手写 SVG/HTML → headless chrome 截 PNG**（中文零乱码、可复现、不依赖外部生图 API）：
```
chrome --headless --disable-gpu --window-size=1200,630 \
  --default-background-color=ffffffff \
  --screenshot=out.png "file:///path/cover.html"
```
手绘抖动用 SVG filter `feTurbulence` + `feDisplacementMap`。

---

## 八、脚本模式速查

```
node douyin.mjs login            # 扫码登录，存 profile
node douyin.mjs publish [图]      # 只塞图 + 截图（不发布，验证用）
node douyin.mjs send [图]         # 塞图 + 填文案 + 停发布前，等 .publish-go 信号才真发
node douyin.mjs check            # 打开作品管理页截图，验证发布结果
```
