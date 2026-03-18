"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
// 创建 Express 应用
const app = (0, express_1.default)();
// 配置 CORS
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://insurance-agent-frontend-omega.vercel.app', 'https://*.vercel.app']
        : '*',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 导入路由
const customers_1 = __importDefault(require("../routes/customers"));
const visits_1 = __importDefault(require("../routes/visits"));
const activities_1 = __importDefault(require("../routes/activities"));
const query_1 = __importDefault(require("../routes/query"));
const chat_1 = __importDefault(require("../routes/chat"));
const migration_1 = __importDefault(require("../routes/migration"));
// 挂载路由
app.use('/api/customers', customers_1.default);
app.use('/api/visits', visits_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/query', query_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/migration', migration_1.default);
// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 导出 Serverless 处理函数
function handler(req, res) {
    return app(req, res);
}
//# sourceMappingURL=index.js.map