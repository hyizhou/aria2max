# Docker部署说明

## 构建和运行

1. 确保已安装Docker和docker-compose
2. 在项目根目录下运行以下命令：

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f aria-max
```

## 访问应用

应用启动后可通过以下URL访问：
- http://localhost:2999

## 环境变量配置

在`docker-compose.yml`中可以修改以下环境变量：
- `PORT`: 应用监听端口（默认2999）
- `ARIA2_RPC_URL`: Aria2 RPC地址（默认http://host.docker.internal:6800/jsonrpc）
- `ARIA2_RPC_SECRET`: Aria2 RPC密钥
- `DOWNLOAD_DIR`: 下载文件存储目录

## 停止服务

```bash
# 停止服务
docker-compose down

# 停止服务并删除卷
docker-compose down -v
```