// Express 应用配置 —— 中间件流水线
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// 1. 安全头
app.use(helmet());

// 2. CORS（开发阶段允许本地前端）
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));

// 3. 请求体解析（限制大小防攻击）
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. 请求日志
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 5. 业务路由
app.use('/api/v1', routes);

// 6. 全局错误处理（必须在路由之后）
app.use(errorHandler);

export default app;
