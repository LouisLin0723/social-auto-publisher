<div align="center">

# 🚀 social-auto-publisher

**一套工具,把内容自动发到 抖音 · 小红书 · TikTok · Reddit · X —— 还手把手教你怎么破平台反爬。**

*One toolkit to auto-post across Douyin, Xiaohongshu, TikTok, Reddit & X — and the playbook to beat every anti-bot wall.*

`Playwright` · `Chrome MCP` · `Node.js` · 中英双语 / Bilingual

</div>

---

> **别家开源只丢给你一坨代码;这里给你"怎么真的发出去"的完整方法论 —— 16 个真实踩坑 + 破反爬实战,全部公开。**
>
> *Other repos just dump code. This one hands you the **know-how** to actually get past the walls — 16 real-world pitfalls, fully documented.*

## 😫 你是不是也这样 / The Pain

- 一条内容手动发 5 个平台,复制粘贴到崩溃
- 自己写脚本发 → **被反爬当机器人秒拦**(Reddit 的 `whoa there, pardner!` 见过没?)
- SaaS 工具月费几十刀,还不支持国内平台
- 抖音网页传图,脚本死活塞不进去(原来是 OS 文件框 DOM 碰不到)

## ✨ 核心杀手锏 / Why This One

- 🛡️ **破反爬方法论(不只给代码)** —— 模拟真人连续会话、坐标点击破 shadow DOM、`setInputFiles` 绕文件上传沙箱。**每个坑怎么踩、怎么破,全写进 SOP**。
  *The anti-bot playbook, not just code: human-like sessions, coordinate clicks through shadow DOM, sandbox-bypassing uploads — every pitfall documented.*
- 🔀 **双引擎双路线** —— Playwright 脚本(独立 profile,适合批量/定时)+ **Chrome MCP 真实浏览器**(真实指纹,国内平台最防封)。别家只有单路线。
  *Dual engine: Playwright scripts + real-browser via Chrome MCP. No one else has both.*
- 🤖 **为 AI / Claude 驱动而生** —— 自然语言驱动发布,天然适配 AI agent 工作流。
  *Built for AI agents — drive posting with natural language.*
- 🌏 **中英 5 平台全覆盖** —— 国内 + 国际,一套搞定。

## 🗺️ 平台支持 / Platforms

| 平台 Platform | 路线 Route | 状态 Status |
|---|---|---|
| 抖音 Douyin | Playwright (`setInputFiles` 绕沙箱) | ✅ 发布成功 / Verified |
| Reddit | Playwright (模拟真人连续会话) | ✅ 链路全通 / Verified |
| TikTok | Playwright (+ 代理) | 🟡 就绪 / Ready |
| X (Twitter) | Playwright adapter | ✅ 可行 / Works\* |
| 小红书 Xiaohongshu | **Chrome MCP** 真实浏览器(免脚本) | ✅ 可行 / Works\* |

<sub>\* 路线验证可行,未在本仓脚本端到端实测 / route proven, not yet e2e-tested in this repo.</sub>

## 👥 谁该用 / Who It's For

- 🛒 **出海 / 跨境卖家** — 多平台矩阵引流,告别手动搬运
- ✍️ **自媒体 / 创作者** — 一稿多发,把时间还给创作
- 👨‍💻 **开发者** — 抄方法论、二次开发,反爬实战参考
- 📈 **增长 / 营销人** — 自动化获客,运营矩阵

## 🎬 Demo

<div align="center">

![social-auto-publisher — 一份内容,自动发 5 平台 / one content, auto-posted to 5 platforms](assets/demo.png)

</div>

## ⚡ 快速开始 / Quick Start

```bash
npm install                          # 装 playwright-core (复用系统 Chrome, 不下载浏览器)
node douyin-test.mjs login           # 首次扫码登录, profile 存住复用
node douyin-test.mjs send 图片.png    # 填好内容 → 人工确认 → 自动发布
```

> 各平台脚本模式见对应 SOP。发布前内置**人工确认闸门**(截图核对才发,防误发)。

## 🧠 方法论 & 16 个踩坑 / The Playbook

**这才是高收藏的部分** —— 别家不会告诉你的实战 know-how:

- 📄 [**抖音发布 SOP**](SOP-douyin-playwright-publish.md) — 为什么浏览器扩展走不通、`setInputFiles` 怎么绕沙箱、YMYL 内容合规
- 📄 [**Reddit 发布 SOP**](SOP-reddit-publish.md) — "模拟真人"怎么破 network policy、坐标点击破 shadow DOM、私人版块识别

精选踩坑:扩展文件沙箱 → CDP 绕过 / `old.reddit` 被反爬拦 → 连续会话真人模式 / new reddit shadow DOM → 坐标输入 / 私人版块 → "请求发帖"信号识别 …… 共 16 个,全在 SOP。

## 🛠️ 技术栈 / Stack

`playwright-core` (channel:chrome,复用系统 Chrome 免下载) · `launchPersistentContext` 持久登录态 · 抹 `navigator.webdriver` 反检测 · Chrome MCP 真实浏览器路线

## 📜 License

MIT — 自由使用,欢迎 PR & Star ⭐

---

<div align="center">
<sub>觉得有用?点个 ⭐ Star 支持一下 / Found it useful? Drop a ⭐</sub>
</div>
