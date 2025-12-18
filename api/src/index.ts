import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

import workloadRoutes from './routes/workload';
import chatRoutes from './routes/chat';
import projectRoutes from './routes/projects';
import employeeRoutes from './routes/employees';
import dependencyRoutes from './routes/dependencies';
import leaveRoutes from './routes/leave';
import calendarRoutes from './routes/calendar';
import insightsRoutes from './routes/insights';
import digestRoutes from './routes/digest';
import integrationsRoutes from './routes/integrations';
import { llmRoutes } from './routes/llm';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

// Error handling
app.onError(errorHandler);

// Health check (public)
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API info (public)
app.get('/', (c) => c.json({
  name: 'WorkLens AI API',
  version: '0.1.0',
  description: 'Enterprise Workload, Risk & Delivery Intelligence Platform',
}));

// Protected routes
const api = new Hono();
api.use('*', authMiddleware);

api.route('/workload', workloadRoutes);
api.route('/chat', chatRoutes);
api.route('/projects', projectRoutes);
api.route('/employees', employeeRoutes);
api.route('/dependencies', dependencyRoutes);
api.route('/leave', leaveRoutes);
api.route('/calendar', calendarRoutes);
api.route('/insights', insightsRoutes);
api.route('/digest', digestRoutes);
api.route('/integrations', integrationsRoutes);
api.route('/llm', llmRoutes);

app.route('/api', api);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found', message: 'The requested endpoint does not exist' }, 404));

const port = parseInt(process.env.PORT || '8787');

console.log(`🚀 WorkLens API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

