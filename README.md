# aria-max

aria-max 是一个基于 aria2 的 Web 端面板工具，提供可视化下载管理、配置、进度查看、下载细节展示和文件管理功能。

特色：
- 自动清理元数据
- 自动屏蔽迅雷吸血
- 单体应用架构，部署简单

## 项目结构

```
aria-max/
├── src/
│   ├── client/         # 前端代码 (Vue 3 + TypeScript)
│   ├── server/         # 后端代码 (Node.js + Express)
│   └── public/         # 静态资源
├── dist/               # 构建输出目录
├── server.js           # 应用入口文件
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
- RESTful API
- 与 aria2 JSON-RPC 通信

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
   ./start.sh install
   # 或
   npm install
   ```

3. **配置环境**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置 aria2 连接信息
   ```

4. **启动开发模式**
   ```bash
   ./start.sh dev
   # 或
   npm run dev
   ```

5. **启动生产模式**
   ```bash
   ./start.sh prod
   # 或
   npm run build && npm start
   ```

## 访问地址

- **开发模式**: http://localhost:3000 (前端) + http://localhost:3001/api (后端API)
- **生产模式**: http://localhost:3001 (单体应用)

## 部署要求

- aria2 程序安装
- Node.js 运行环境
- 重要配置项：
  - aria2 API 地址 (`ARIA2_RPC_URL`)
  - aria2 密钥 (`ARIA2_RPC_SECRET`)
  - 下载目录路径 (`DOWNLOAD_DIR`)

## 部署要求

- aria2 程序安装并与本项目部署在同一台机器上
- Node.js 运行环境
- 重要配置项：
  - aria2 API 地址
  - 下载目录路径

## 脚本命令

```bash
./start.sh dev        # 启动开发模式
./start.sh prod       # 启动生产模式
./start.sh build      # 仅构建前端
./start.sh install    # 仅安装依赖
```

或者使用 npm 命令：
```bash
npm run dev           # 开发模式
npm run build         # 构建项目
npm start             # 生产模式
npm run preview       # 构建并预览
```

## 文档

- [需求文档](docs/REQUIREMENTS.md)
- [架构设计](docs/ARCHITECTURE.md)
- [API接口规范](docs/API_SPEC.md)
- [前端组件设计](docs/FRONTEND_COMPONENTS.md)
- [项目目录结构](docs/PROJECT_STRUCTURE.md)

## 从旧版本迁移

如果你之前使用的是前后端分离版本，可以通过以下步骤迁移：

1. 备份原有配置
2. 更新到新的单体项目结构
3. 将原有的 `.env` 配置迁移到新项目
4. 删除 `frontend/` 和 `backend/` 目录（可选）
