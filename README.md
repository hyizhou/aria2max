# aria-max

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/your-repo/aria-max)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](#许可证)

aria-max 是一个为 aria2 打造的现代 Web 管理面板。

## 它能做什么

**下载管理** — 支持 HTTP/FTP/磁力链/种子/Metalink，暂停、恢复、批量删除，BT 任务可查看 Peer 和 Tracker 状态。

**文件管理** — 在线浏览下载目录，视频/音频/图片/文本在线预览，上传、重命名、删除、建目录。

**系统监控** — CPU、内存、磁盘、网络实时状态，下载速度刷新。

**运行时调参** — 在 Web 界面直接调整 aria2 的连接数、速度限制、BT 设置等参数，改完立即生效，不用重启 aria2。

**远程连接** — aria2 不需要装在同一台机器上。本地、局域网、Docker、远程服务器，只要 RPC 端口能连通就能管理。

## 特点

- **开箱即用** — 单进程部署，`npm start` 一条命令启动，不需要数据库或反向代理
- **PWA 支持** — 可以安装到手机桌面或电脑上，像原生应用一样使用
- **中英双语** — 界面内置中文和英文切换
- **手机友好** — 响应式设计，手机上也能正常操作
- **配置分离** — 系统设置持久化保存；Aria2 参数通过 RPC 临时修改，不动配置文件，重启即恢复

## 安装和使用

需要 Node.js 16+ 和一个运行中的 aria2。

```bash
git clone <repository-url>
cd aria-max
npm install
npm run build
npm start
```

浏览器打开 `http://localhost:2999`，在设置页面填入 aria2 的 RPC 地址和密钥，测试连接通过后即可使用。

也可以用 CLI 后台运行：

```bash
npm link
aria2max start    # PM2 后台启动
aria2max log      # 查看日志
aria2max stop     # 停止
```

## 注意事项

- aria2 可以在远程机器或 Docker 容器中运行，只需 RPC 端口可达
- 如果 aria2 在容器中，本项目的「文件管理目录」应填写宿主机上映射的路径，而不是容器内路径
- Aria2 设置页面的修改是运行时临时的，不会改写 aria2 配置文件，aria2 重启后恢复原始值

## 许可证

[MIT License](LICENSE)
