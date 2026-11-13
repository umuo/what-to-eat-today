# 今天吃什么？ (What to Eat Today?)

一款治愈系、高颜值的美食决策全栈 Web 应用，提供 **大转盘、老虎机、随机抽取、扭蛋机** 四种趣味模式帮你终结「今天吃什么」的选择困难。支持游客即开即玩、自定义多套菜单、一键生成好友分享链接，以及手机九宫格 4 位数字 PIN 码保护与云端数据库同步。

- **在线预览**：https://what-to-eat-today-woad-pi.vercel.app
- **代码仓库**：`git@github.com:umuo/what-to-eat-today.git`

---

## 核心功能

### 1. 四种趣味抽取模式
- **大转盘 (`WheelMode`)**：马卡龙色系渐变转盘 + 外圈呼吸灯，支持按权重占比动态分配扇区。
- **老虎机 (`SlotMode`)**：点击或拉动右侧拉杆，三列滚轴依次减速锁定，触发三连美食锁定结果。
- **随机抽取 (`DiceGridMode`)**：双骰翻滚 + 九宫格跑马灯聚光灯跳跃高亮揭晓今日美味。
- **扭蛋机 (`GashaponMode`)**：旋转紫色旋钮掉落彩色扭蛋球并拆蛋揭晓结果。

### 2. 沉浸式交互与防逃避结果弹窗
- **权重加权随机**：支持为每个菜品或店名设置 `1–5` 档权重，越爱吃抽中概率越高。
- **Web Audio 拟真音效**：转盘滴答声、拉杆阻尼、滚轴落锁、扭蛋弹出、中奖和弦，支持右上角一键静音。
- **防逃避结果选择**：抽中菜品后需在弹窗中选择一项执行：**就吃它（记录历史）** / **直接重抽** / **暂排并重抽（本轮剔除该选项）**，避免盲目关窗反复纠结。

### 3. 个性化菜单管理与社交分享
- **24 款图标 + 智能配图**：内置 12 款柔和 3D 透明插画（`.webp`）与 12 款渐变矢量图标；输入菜名或店名（如「海底捞」「喜茶」「黄焖鸡」）自动匹配对应图标。
- **多套菜单切换**：支持创建多套场景菜单（如「公司周边」「周末聚餐」「夜宵」），最多支持 20 套菜单 × 50 项菜品。
- **一键分享 (`?share=`)**：将当前菜单快照生成 30 天有效的分享链接发给朋友一起抽，对方也可一键保存为自己的菜单。

### 4. 安全防护与防刷设计
- **手机 `1–9` 数字键盘 + 4 位 PIN 码**：
  - 仿手机锁屏 `1–9` + `清空 / 0 / ⌫` 九宫格输入体验（同时兼容电脑键盘 `0–9` / `Backspace`），输满 4 位自动提交，支持「显示/隐藏数字」。
  - 后端使用 `crypto.scryptSync` + 随机盐存储 PIN，校验成功后签发 `HMAC-SHA256` 会话令牌；修改 PIN 后旧令牌自动失效。
- **跨实例持久化限流 & 反脚本校验**：
  - 数据库层持久化记录限流桶（`wte_rate_limits` / `rate_limits`）：单账号连续输错 5 次 PIN（或单 IP 连续输错 15 次）自动锁定 10 分钟；限制每 IP 每小时最多新建 5 个账号、每 10 分钟最多创建 10 条分享链接。
  - 所有写接口校验客户端头（`X-WTE-Client`）、同源 `Origin`、64KB 请求体上限与隐藏蜜罐字段，拦截裸脚本请求。
- **存储容量自愈**：每用户抽取历史滚动保留最新 50 条；分享快照自动过期清理超过 30 天的记录并限制总上限 2,000 条。

---

## 技术栈

- **前端**：React 18 + Vite 5 + Tailwind CSS 3 + 原生 Canvas 彩带/转盘渲染 + Web Audio API
- **后端**：Express 4 + Node.js 原生 `node:crypto`
- **双存储架构**：
  - **本地开发默认**：Node.js 内置 `node:sqlite`（零配置开箱即用，数据保存在 `server/data/what_to_eat.db`）
  - **云端生产环境**：Prisma Postgres (`pg` + `@vercel/functions` `attachDatabasePool`)
- **部署平台**：Vercel（静态前端 + `api/index.js` Serverless API）

---

## 本地快速开始

### 环境要求
- **Node.js >= 22.5.0**（用于支持内置 `node:sqlite` 与 `process.loadEnvFile`）

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动全栈开发服务（Vite + Express，默认端口 5173）
npm run dev
```

打开浏览器访问 `http://localhost:5173`。若未配置云端 Postgres 环境变量，应用会自动使用本地 SQLite，无需任何额外数据库服务即可使用全部功能。

### 常用命令

```bash
npm run dev     # 启动前后端一体化开发服务器 (http://localhost:5173)
npm test        # 运行核心存储、PIN 认证、限流与 HTTP 安全单元测试
npm run build   # 构建前端生产产物到 dist/
npm start       # 以生产模式运行 Node 服务器 (NODE_ENV=production)
```

---

## 环境变量说明（可选）

如需连接云端 PostgreSQL / Prisma Postgres，可参考 [.env.example](.env.example) 创建 `.env.local`（已被 `.gitignore` 忽略，请勿提交真实密钥）：

| 变量名 | 说明 |
| --- | --- |
| `DATABASE_URL` | Postgres 直连地址（用于 Schema 初始化与兜底连接） |
| `DATABASE_URL_POOLED` | Postgres 连接池地址（优先用于高频读写查询） |
| `POSTGRES_URL` / `PRISMA_DATABASE_URL` | 兼容常见 Vercel / Prisma Postgres 注入变量名 |
| `AUTH_SECRET` | 可选，用于覆盖会话令牌 `HMAC-SHA256` 签名密钥种子 |
| `PORT` | 可选，自定义本地服务端口（默认 `5173`） |

---

## 项目结构

```text
what_to_eat_today/
├── api/
│   └── index.js                # Vercel Serverless API 入口与路由转发
├── public/
│   └── assets/illustrations/   # 美食透明软 3D 插画资源 (.webp / .png)
├── server/
│   ├── api.js                  # Express API 路由、Token 鉴权与防刷中间件
│   ├── db.js                   # 本地 SQLite 存储实现与通用数据校验
│   ├── postgresStore.js        # 云端 Prisma Postgres 存储实现与表结构迁移
│   ├── security.js             # PIN scrypt 哈希、HMAC 令牌、反爬虫与限流常量
│   ├── index.js                # 本地全栈服务入口 (Vite middleware / dist)
│   └── db.test.js              # 存储层、防爆破限流与 HTTP API 单元测试
├── src/
│   ├── components/
│   │   ├── Header.jsx          # 顶部导航栏、模式切换与用户下拉菜单
│   │   ├── MenuSidebar.jsx     # 右侧菜单管理、权重调整与菜品编辑抽屉
│   │   ├── modals/
│   │   │   ├── PinKeypad.jsx   # 仿手机端 1-9 九宫格 4 位 PIN 数字键盘
│   │   │   ├── LoginModal.jsx  # 用户名识别 + 4 位 PIN 登录/绑定弹窗
│   │   │   ├── ChangePinModal.jsx # 修改 4 位 PIN 码弹窗
│   │   │   ├── ResultModal.jsx # 防逃避抽取结果必选弹窗
│   │   │   ├── HistoryModal.jsx# 抽取历史记录弹窗
│   │   │   └── ShareBanner.jsx # 分享模式顶部提示与一键保存条
│   │   └── modes/              # 四种抽取模式组件 (Wheel/Slot/DiceGrid/Gashapon)
│   ├── constants/              # 美食图标目录、关键词自动配图规则与模式定义
│   ├── utils/                  # API 客户端封装、加权随机、Web Audio 音效引擎
│   └── App.jsx                 # 主应用状态管理与页面布局
├── vercel.json                 # Vercel 构建配置与 SPA / API 重写规则
└── package.json
```

---

## Vercel 部署

项目内置 [vercel.json](vercel.json) 与 [api/index.js](api/index.js)，开箱适配 Vercel：

1. 在 Vercel 导入仓库并连接项目（或通过 `vercel deploy --prod --yes` 部署）。
2. 在 Vercel Project Settings -> Environment Variables 中配置 `DATABASE_URL` / `DATABASE_URL_POOLED`（以及可选的 `AUTH_SECRET`）。
3. 首次访问接口时会自动在 Postgres 中幂等创建 `wte_users`、`wte_menus`、`wte_menu_items`、`wte_draw_history`、`wte_shared_menus` 与 `wte_rate_limits` 表结构。
