# aria-max

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/your-repo/aria-max)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](#许可证)

aria-max 是一个基于 aria2 的 Web 端面板工具，提供可视化下载管理、配置、进度查看、下载细节展示和文件管理功能。

## 特色功能

- **自动清理元数据** - 下载完成后自动清理 aria2 元数据文件
- **自动屏蔽迅雷吸血** - (计划中)
- **单体应用架构** - 部署简单，一个进程搞定前后端
- **TypeScript 全栈** - 前后端完全使用 TypeScript 开发，类型安全
- **PWA 支持** - 可安装为桌面/移动应用
- **响应式设计** - 完美适配手机与 PC 端
- **CLI 工具** - 提供命令行管理工具，支持 PM2 后台运行

## 功能预览

- 下载任务管理（添加、暂停、恢复、删除）
- 实时下载进度显示
- 文件浏览与管理（上传、重命名、预览、删除）
- 多媒体文件预览（视频、音频、图片、文本）
- 系统配置管理
- Aria2 连接状态监控

## 项目结构

```
aria-max/
├── src/
│   ├── client/         # 前端代码 (Vue 3 + TypeScript)
│   │   ├── components/ # 可复用 UI 组件
│   │   ├── views/      # 页面组件
│   │   ├── router/     # 路由配置
│   │   ├── store/      # Pinia 状态管理
│   │   ├── services/   # API 服务层
│   │   └── assets/     # 静态资源
│   ├── server/         # 后端代码 (Node.js + Express + TypeScript)
│   │   ├── config/     # 配置文件
│   │   ├── controllers/# 控制器
│   │   ├── routes/     # 路由定义
│   │   ├── services/   # 业务逻辑
│   │   └── types/      # 类型定义
│   ├── shared/         # 前后端共享代码
│   └── public/         # 静态资源
├── bin/                # CLI 工具
│   ├── cli.ts          # 命令行入口
│   └── ecosystem.config.cjs  # PM2 配置
├── dist/               # 构建输出目录
├── docs/               # 文档目录
├── server.ts           # 服务端入口
├── package.json        # 项目配置
└── README.md           # 项目说明文件
```

## 技术栈

### 前端
- Vue 3 (Composition API)
- TypeScript
- Vite (构建工具)
- Vue Router
- Pinia (状态管理)
- PWA (Progressive Web App)
- 响应式设计 (适配手机与PC端)

### 后端
- Node.js
- Express.js
- TypeScript
- RESTful API
- 与 aria2 JSON-RPC 通信

### CLI 工具
- Commander.js
- PM2 (进程管理)

## 快速开始

### 环境要求
- Node.js 16+
- aria2 已安装并运行

### 安装和启动

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd aria-max
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置 aria2 连接信息
   ```

4. **启动开发模式**
   ```bash
   npm run dev
   ```

5. **构建生产版本**
   ```bash
   npm run build
   ```

6. **启动生产模式**
   ```bash
   npm start
   ```

## 访问地址

- **开发模式**: http://localhost:3000 (前端) + http://localhost:3001/api (后端API)
- **生产模式**: http://localhost:3001 (单体应用)

## CLI 工具

项目提供命令行界面工具，可以通过 `aria2max` 命令管理应用程序：

```bash
aria2max start        # 后台启动服务 (使用 PM2)
aria2max stop         # 停止服务
aria2max restart      # 重启服务
aria2max status       # 查看服务状态
aria2max log          # 查看日志
aria2max --help       # 显示帮助信息
aria2max --version    # 显示版本信息
```

### 安装 CLI 工具

```bash
# 方式一：使用 npm link (开发测试推荐)
npm link

# 方式二：全局安装
npm install -g .
```

安装后，可以在任何位置使用 `aria2max` 命令。

## NPM 脚本

```bash
# 开发
npm run dev              # 同时启动前后端开发服务器
npm run dev:server       # 仅启动后端开发服务器
npm run dev:client       # 仅启动前端开发服务器

# 构建
npm run build            # 构建前后端
npm run build:server     # 仅构建后端
npm run build:client     # 仅构建前端

# 生产运行
npm start                # 启动生产服务器
npm run preview          # 构建并预览

# 代码质量
npm run lint             # 运行 ESLint
npm run typecheck        # 后端类型检查
npm run typecheck:client # 前端类型检查
```

## 部署要求

- aria2 程序安装并运行
- Node.js 运行环境
- 重要配置项：
  - aria2 RPC 地址 (`ARIA2_RPC_URL`)
  - aria2 RPC 密钥 (`ARIA2_RPC_SECRET`)
  - 下载目录路径 (`DOWNLOAD_DIR`)

> **注意**: aria2 程序可以运行在与本项目不同的机器或容器中。如果 aria2 在容器中运行，请注意容器内外的路径映射差异。

## API 接口

### 任务管理
- `GET /api/tasks` - 获取所有下载任务
- `POST /api/tasks` - 添加新下载任务
- `GET /api/tasks/:gid` - 获取任务详情
- `PUT /api/tasks/:gid/pause` - 暂停任务
- `PUT /api/tasks/:gid/resume` - 恢复任务
- `DELETE /api/tasks/:gid` - 删除任务

### 文件管理
- `GET /api/files` - 获取文件列表
- `GET /api/files/download` - 下载文件
- `DELETE /api/files` - 删除文件/目录
- `POST /api/files/mkdir` - 创建目录
- `PUT /api/files/rename` - 重命名文件/目录
- `POST /api/files/upload` - 上传文件

### 系统配置
- `GET /api/system/config` - 获取系统配置
- `PUT /api/system/config` - 更新系统配置
- `POST /api/system/test-connection` - 测试 Aria2 连接
- `GET /api/system/status` - 获取 Aria2 系统状态

## 文档

- [CLI 需求文档](docs/cli-requirements.md)
- [代码分析报告](docs/code_analysis_report.md)
- [待办事项](docs/TODO.md)

## 从旧版本迁移

如果你之前使用的是前后端分离版本，可以通过以下步骤迁移：

1. 备份原有配置
2. 更新到新的单体项目结构
3. 将原有的 `.env` 配置迁移到新项目
4. 删除 `frontend/` 和 `backend/` 目录（可选）

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](LICENSE)

## 致谢

- [aria2](https://aria2.github.io/) - 强大的命令行下载工具
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Express.js](https://expressjs.com/) - Node.js Web 框架
