#!/bin/bash

# 一键启动前端和后端服务
# 脚本会启动后端服务和前端开发服务器，并在输出中区分前后端日志

echo "🚀 启动 aria-max 服务..."

# 检查是否在项目根目录
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo "❌ 错误: 请在项目根目录运行此脚本"
  echo "项目根目录应包含 frontend 和 backend 文件夹"
  exit 1
fi

# 创建临时文件用于日志处理
BACKEND_LOG=$(mktemp)
FRONTEND_LOG=$(mktemp)

# 清理函数
cleanup() {
  rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
  echo "🛑 所有服务已停止"
  exit 0
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 启动后端日志处理进程
process_backend_logs() {
  tail -f "$BACKEND_LOG" | while IFS= read -r line; do
    echo "[BACKEND] $line"
  done
}

# 启动前端日志处理进程
process_frontend_logs() {
  tail -f "$FRONTEND_LOG" | while IFS= read -r line; do
    echo "[FRONTEND] $line"
  done
}

# 启动后端服务
echo "⚙️  启动后端服务..."
cd backend
npm run dev 2>&1 > "$BACKEND_LOG" &
BACKEND_PID=$!
cd ..

# 启动前端服务
echo "🌐 启动前端服务..."
cd frontend
npm run dev 2>&1 > "$FRONTEND_LOG" &
FRONTEND_PID=$!
cd ..

# 启动日志处理进程
process_backend_logs &
process_frontend_logs &

# 显示服务状态
echo "📊 服务启动中..."
echo "后端 PID: $BACKEND_PID"
echo "前端 PID: $FRONTEND_PID"
echo ""
echo "✅ 启动完成!"
echo "前端访问地址: http://localhost:3000"
echo "后端 API 地址: http://localhost:3333"
echo ""
echo "💡 日志说明:"
echo "- 所有日志都会在当前终端直接输出"
echo "- 后端日志行以 [BACKEND] 开头"
echo "- 前端日志行以 [FRONTEND] 开头"
echo "- 按 Ctrl+C 可以停止所有服务"

# 等待服务
wait $BACKEND_PID $FRONTEND_PID