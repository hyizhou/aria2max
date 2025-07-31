# aria-max

aria-max 是一个基于 aria2 的 Web 端面板工具，提供可视化下载管理、配置、进度查看、下载细节展示和文件管理功能。

特色：
- 自动清理元数据
- 自动屏蔽迅雷吸血

## 项目结构

```
aria-max/
├── frontend/           # 前端项目 (Vue 3 + TypeScript + Vite)
├── backend/            # 后端项目 (Node.js + Express)
├── docs/               # 项目文档
└── README.md           # 项目说明文件
```

## 技术栈

### 前端
- Vue 3 (Composition API)
- TypeScript
- Vite
- Vue Router
- Pinia (状态管理)
- PWA (Progressive Web App)
- 响应式设计 (适配手机与PC端)

### 后端
- Node.js
- Express.js
- RESTful API
- 与 aria2 JSON-RPC 通信

## 开发环境搭建

### 前端开发环境
1. 进入前端目录: `cd frontend`
2. 安装依赖: `npm install`
3. 启动开发服务器: `npm run dev`
4. 访问地址: http://localhost:3000

### 后端开发环境
1. 进入后端目录: `cd backend`
2. 安装依赖: `npm install`
3. 启动开发服务器: `npm run dev`
4. 服务地址: http://localhost:3001

## 部署要求

- aria2 程序安装并与本项目部署在同一台机器上
- Node.js 运行环境
- 重要配置项：
  - aria2 API 地址
  - 下载目录路径

## 文档

- [需求文档](docs/REQUIREMENTS.md)
- [架构设计](docs/ARCHITECTURE.md)
- [API接口规范](docs/API_SPEC.md)
- [前端组件设计](docs/FRONTEND_COMPONENTS.md)
- [项目目录结构](docs/PROJECT_STRUCTURE.md)
