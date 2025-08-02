# 使用官方Node.js运行时作为基础镜像
FROM node:22-alpine

# 安装Python和编译工具以支持原生模块编译
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装所有依赖
RUN npm ci --only=production

# 复制应用源代码
COPY . .

# 构建前端
RUN npm run build

# 暴露端口
EXPOSE 2999

# 启动应用
CMD ["npm", "start"]