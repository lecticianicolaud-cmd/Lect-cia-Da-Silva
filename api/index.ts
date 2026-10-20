import express from 'express';
import { apiRouter } from '../server/routes';

const app = express();

app.use(express.json({ limit: '15mb' }));

// Montar rotas da API
app.use('/api', apiRouter);

// Health check para Vercel
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Gráfica Palanga — API Serverless',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
});

export default app;
