# aria-max

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/your-repo/aria-max)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](#许可证)

aria-max 是一个为 aria2 打造的现代 Web 管理面板。提供直观的下载任务管理、文件浏览、实时系统监控和运行时配置调整能力。

## 为什么选择 aria-max

- **开箱即用** — 单进程部署，无需额外配置数据库或反向代理。一个命令启动，前后端一体化运行
- **远程管理** — aria2 可以运行在任何地方：本机、局域网、Docker 容器、远程服务器。通过 RPC 连接，无需与 aria2 部署在同一环境
- **运行时调参** — 通过 Web 界面直接调整 aria2 运行时参数（连接数、速度限制、BT 设置等），修改立即生效，无需重启 aria2
- **i18n** — 内置中文/英文双语支持
- **PWA** — 可安装为桌面或移动应用，获得接近原生应用的体验
- **响应式** — 手机和电脑都有良好的操作体验
- **TypeScript 全栈** — 前后端完全类型安全，共享类型定义

## 功能概览

### 下载管理
- 支持 HTTP/HTTPS/FTP/磁力链/种子文件/Metalink 多种下载方式
- 任务暂停、恢复、删除，支持批量操作
- 实时下载/上传速度、连接数、进度展示
- BT 任务详情：Peer 连接信息、Tracker 状态

### 文件管理
- 在线浏览下载目录，支持目录导航
- 多媒体文件在线预览（视频、音频、图片、文本）
- 文件上传、重命名、删除
- 创建目录、符号链接处理

### 系统监控
- 实时系统状态：CPU、内存、磁盘、网络
- aria2 连接状态检测与版本信息
- 下载速度实时刷新

### 配置管理
- **系统设置** — 配置 RPC 连接地址、密钥、文件管理目录等，持久化保存
- **Aria2 设置** — 通过 RPC 临时调整 aria2 运行时参数，按分类展示（文件保存、进度保存、下载连接、BT/PT、RPC），立即生效，重启后恢复

## 快速开始

### 环境要求

- Node.js 16+
- aria2 已安装并运行（可在远程机器或容器中）

### 安装

```bash
git clone <repository-url>
cd aria-max
npm install
```

### 开发

```bash
# 同时启动前后端开发服务器
npm run dev

# 或分别启动
npm run dev:server   # 后端 http://localhost:2999
npm run dev:client   # 前端 http://localhost:3000
```

### 生产部署

```bash
npm run build        # 构建
npm start            # 启动 http://localhost:2999

# 或使用 CLI 工具后台运行
npm link
aria2max start       # PM2 后台启动
```

### 首次配置

1. 打开浏览器访问 `http://localhost:2999`
2. 进入 **系统设置** 页面
3. 填写 aria2 RPC 地址和密钥
4. 点击 **测试连接** 确认连通
5. 保存配置，开始使用

## CLI 工具

```bash
aria2max start       # 后台启动服务 (PM2)
aria2max stop        # 停止服务
aria2max restart     # 重启服务
aria2max status      # 查看服务状态
aria2max log         # 查看日志
```

安装方式：`npm link` 或 `npm install -g .`

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router |
| 后端 | Node.js + Express + TypeScript |
| 通信 | RESTful API（前后端）、JSON-RPC（与 aria2） |
| 进程管理 | Commander.js + PM2 |
| 国际化 | vue-i18n |

## 项目结构

```
src/
├── client/          # 前端 Vue 3 应用
│   ├── components/  # UI 组件
│   ├── views/       # 页面（Dashboard、TaskList、FileManager、Settings...）
│   ├── store/       # Pinia 状态管理
│   ├── services/    # API 调用
│   ├── config/      # 前端配置
│   └── i18n/        # 国际化
├── server/          # 后端 Express 应用
│   ├── controllers/ # 请求处理
│   ├── routes/      # 路由定义
│   ├── config/      # aria2 RPC 客户端
│   └── services/    # 业务逻辑
└── shared/          # 前后端共享类型
```

## NPM 脚本

```bash
npm run dev              # 同时启动前后端开发服务器
npm run dev:server       # 仅后端
npm run dev:client       # 仅前端
npm run build            # 构建生产版本
npm start                # 启动生产服务器
npm run lint             # ESLint 检查
```

## 注意事项

- aria2 可以运行在与本项目不同的机器或容器中，只需确保 RPC 端口可达
- 如果 aria2 在容器中运行，容器内外的文件路径可能不同。系统设置中的「文件管理目录」应填写本机能访问到的路径
- Aria2 设置页面的修改是运行时临时的，不会修改 aria2 配置文件，重启 aria2 后恢复原始值

## 文档

- [Aria2 配置说明](docs/aria2-config-guide.md) — aria2 配置选项完整参考
- [CLI 工具需求](docs/cli-requirements.md)
- [待办事项](docs/TODO.md)

## 许可证

[MIT License](LICENSE)
