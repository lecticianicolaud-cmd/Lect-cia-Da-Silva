import express from 'express';
import { apiRouter } from '../server/routes';

const app = express();

app.use(express.json({ limit: '15mb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Suportar tanto /api/* como rotas diretas (caso o rewrite da Vercel remova o prefixo /api)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Health check para Vercel
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Gráfica Palanga — API Serverless',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
});

// Tratamento de erros garantindo resposta JSON (nunca HTML 500)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Vercel Serverless Error]:', err);
  res.status(500).json({ error: err?.message || 'Erro interno no servidor da API.' });
});

export default app;
