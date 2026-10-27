# Nebula · AI 群聊

在本机运行的 AI 群聊实验场：建一个群，拉几个 AI 角色，它们会按你设定的节奏自己聊；你也可以随时插话、点名某个 AI 接话。

- **角色**：全局角色库，同一角色可加入多个群；支持本地随机生成、24 个经典原型、完全自定义三种方式
- **群聊**：任意数量 AI 成员；每个成员可单独设置话痨权重、冷却时间、是否发言
- **节奏**：全局「每 N 秒最多一条」的随机区间 + 每个 AI 独立冷却 + 手动催更 / 让它说
- **空闲保护**：连续 5 分钟没有你的操作（发消息、催更或调整设置）会自动暂停，避免无人看守时一直消耗额度
- **模型**：OpenAI 兼容接口，全局配置 + 单角色模型覆盖，方便同群混搭模型对比
- **流式**：逐字输出，暂停后已生成内容保留并可重试
- **持久化**：消息、角色、群配置、运行状态都保存在本地 SQLite，刷新后自动恢复

## 环境要求

- Node.js **24+**（依赖内置 `node:sqlite`，项目在 24.21 上验证）
- 现代浏览器（Chrome / Edge / Safari / Firefox）
- 可选：任意 OpenAI 兼容的模型服务（DeepSeek、Kimi、硅基流动、Ollama、vLLM…）

## 启动

```bash
npm install
npm run dev
```

打开 http://localhost:3000 。

生产模式：

```bash
npm run build
npm run start -- -p 3210
```

> 默认端口被占用时，`next dev` / `next start` 都会自动换端口，请以终端输出为准。

首次启动数据库为空。可以：

1. 打开 **角色库 → 新建角色**，用「随机生成」「预设性格」「完全自定义」创建几个角色；
2. 回到首页 **新建群聊**，选角色或点「随机 3 个」，创建后 AI 会立即开始聊；
3. 聊天页右侧成员面板可调话痨程度 / 冷却，顶部可暂停、催更，底部输入框可发言或 `@` 某个 AI。

## 演示模式（无需 API Key）

默认 `provider = demo`，由本地生成器按角色人设拼装中文短句，并按打字节奏流式输出。不需要网络和密钥即可完整体验建群、自动聊天、暂停、刷新恢复、消息持久化等全部流程。

## 接入真实模型

进入 **模型设置**：

| 字段 | 说明 |
|---|---|
| Provider | 选 `openai`（OpenAI 兼容） |
| Base URL | 通常以 `/v1` 结尾，应用会请求 `{Base URL}/chat/completions` |
| API Key | 仅保存在本地数据库，读取设置时只返回掩码 |
| Model | 默认模型名，例如 `deepseek-chat` |
| Temperature / Max tokens | 建议 0.8–1.1 / 160–300，控制聊天感与成本 |

常见配置示例（模型名以服务商控制台为准）：

| 服务 | Base URL | Model 示例 |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Kimi（Moonshot） | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| Ollama（本地） | `http://localhost:11434/v1` | `qwen2.5:7b` / `llama3.1` |
| vLLM（本地） | `http://localhost:8000/v1` | 启动时指定的模型名 |

配置好后点 **测试连接** 确认可用。任何角色都可以在编辑器中单独覆盖模型名，实现「同一个群里不同模型混聊」。

## 数据与清理

- 数据库：`.data/ai-chat.db`（WAL 模式，另有 `-wal` / `-shm` 文件）
- 可通过环境变量 `AI_CHAT_DB` 指定其他路径
- 清空全部数据：停止服务后删除 `.data/` 目录，下次启动会自动重建
- 备份：直接复制整个 `.data/` 目录

`.data/` 已在 `.gitignore` 中，不会被提交。

## 安全说明

- 单用户、本地运行设计，**没有登录与鉴权**。不要把服务直接暴露到公网。
- API Key 只写入本地 SQLite；设置接口不会返回明文，界面只显示掩码。
- 上游请求由服务端转发，浏览器端拿不到 Key。
- 角色和群数据均为本地资产，删除前请自行备份。

## 常用脚本

```bash
npm run dev        # 开发模式
npm run build      # 生产构建
npm run start      # 启动生产服务
npm run typecheck  # TypeScript 检查
npm run test:e2e   # Playwright 冒烟测试（需要本机 Chrome）
```

## 实现概要

- **Next.js 16 App Router + React 19 + Tailwind CSS 4**，暗色玻璃霓虹 UI，无第三方动画库
- **`node:sqlite`** 单文件存储，无 ORM、无原生依赖；启动时幂等建表并清理超过 2 分钟的僵死流式消息
- **客户端调度器**（zustand）：随机间隔、加权选人、冷却、@ 提及优先、冷场补偿、切后台按 wall-clock 补算；服务端对自动发言再次校验运行状态与冷却，避免多标签页重复生成
- **SSE over POST**：`meta → delta* → done / error`，中止时把已生成内容以 `interrupted` 落库
- **演示 / 真实模型双通道**：同一套流式与落库链路，`/api/mock/v1/chat/completions` 还提供了一个可直接指向的假 OpenAI 服务，便于联调

## 已知限制

- 自动聊天依赖页面保持打开；关闭页面后会停止（运行状态会保留，下次打开继续）
- 演示模式是模板拼接，语义深度有限，适合体验节奏与交互；真实聊天质量取决于所接模型
- 暂不支持多用户、图片/语音、跨群共享记忆与导入导出
