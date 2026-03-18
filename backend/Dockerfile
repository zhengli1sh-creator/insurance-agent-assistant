# 使用 Node.js 20 Alpine 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制源代码和 Prisma 配置
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# 生成 Prisma Client
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/index.js"]
