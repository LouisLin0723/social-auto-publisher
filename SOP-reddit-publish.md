# Reddit 自动发帖 SOP（Playwright）

> 一句话：Reddit 反爬是主流平台里最狠的。破法不是更强的伪装，而是**模拟真人** —— 有历史的浏览器 + 完整登录 + 连续会话。

---

## 一、核心：真人模式 vs 空白爬虫（决定成败）

| 反模式（被 block） | 真人模式（通过） |
|---|---|
| 全新空白独立 profile（无历史痕迹） | 有历史 / 登录态的 profile |
| 没登录就直接访问 `/submit` | 先**完整登录**，cookie 留在 session |
| login 和发帖**拆成两次独立进程**（关了再开） | **一个连续会话**：首页 → 登录 → 发帖，不关不拆 |
| `old.reddit.com/submit`（对自动化最敏感） | `www.reddit.com`（new reddit） |

**撞反爬的症状**：`old.reddit.com/submit` 返回
> "whoa there, pardner! Your request has been blocked due to a network policy. ... If you're running a script or application, please register or sign in with your developer credentials."

一开始误判成"机房 IP 被拉黑、要官方 API"。**错**。真因是上面那张表左列的反模式叠加。换成右列就通。

---

## 二、连续会话流程（关键骨架）

一个 Playwright `page`，全程不关：

1. `goto www.reddit.com`（首页 —— 像真人先到首页晃一下，不直接冲 submit）
2. 用户在**同一个窗口**登录（flag 等待，不限时；登录成功 cookie 实时写入 profile）
3. 同会话 `goto www.reddit.com/submit?type=TEXT`（带着登录 cookie 进去）
4. 选社区 → 填标题/正文 → 发帖

登录态存进独立 `.reddit-profile`，之后发帖复用、免再登。

---

## 三、坑1：new reddit 是 Web Component（shadow DOM）

标题/正文是 faceplate web component + lexical 富文本（`contenteditable` `data-lexical-editor`）。Playwright 的 `getByPlaceholder('标题')` / `locator('[contenteditable]')` 全被判 **"not visible"**，selector 穿不透 shadow DOM。

**解法：坐标点击 + 键盘输入**（绕过 selector）：
```js
await page.mouse.click(648, 273);   // 标题框坐标 (viewport 1366×900)
await page.keyboard.type(TITLE);
await page.mouse.click(648, 470);   // 正文框坐标
await page.keyboard.type(BODY);
```
坐标从 before 截图量；依赖固定 viewport。

---

## 四、坑2：选社区大小写

subreddit 名**全小写**（Reddit 真实版块名都是小写，别照显示名的大小写写）。`getByText('r/' + name, { exact: false })` 模糊匹配搜索结果，别用 `exact: true`。

---

## 五、坑3：私人 / 受限社区（发帖前必查）

很多优质 niche 版块是 **private / restricted** —— 要版主批准才能发。点"请求发帖"会弹：
> "这是私人社区。仅获批准成员可张贴和贡献内容。"（按钮：转到社区 / 向版主发送消息）

- 例：某 niche 小众版块（几百成员）常常就是 **private**，封闭
- "发帖按钮显示『请求发帖』而非『发帖』" = 该版块审批制的信号
- **发帖前先确认目标版块开放**（或先申请加入养几天）

---

## 六、养号红线

新号发帖 / 带链接 = 秒 ban + shadowban（shadowban = 你以为发了，全世界只有你自己看得到）。要：
- 已养的号（账龄 + karma + 相关版块有互动）
- 软性价值帖，**无裸链接**（Reddit 最恨 self-promotion）

---

## 七、脚本模式

```
node reddit-flow.mjs   # 连续会话: 首页 → 你登录(flag) → 同会话进 submit (验证登录态)
node reddit-post.mjs   # 复用登录态, 选社区 + 填标题/正文(坐标) → 发帖
```

环境：Reddit 在国内被墙，要 VPN（全局/TUN 模式直接走；端口模式设 `RT_PROXY`）。
