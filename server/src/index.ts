import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.route';
import companyRoutes from './routes/company.route';
import requestRoutes from './routes/request.route';
import userRoutes from './routes/user.route';
import contractRoutes from './routes/contract.route';
import publicRoutes from './routes/public.route';
import counterpartyRoutes from './routes/counterparty.routes';
import expenseRoutes from './routes/expense.route';
import tariffRoutes from './routes/tariff.route';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Слишком много запросов с этого IP, пожалуйста, повторите попытку позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/counterparties', counterpartyRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tariffs', tariffRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ping', (req, res) => {
  res.send('Server is alive and reachable!');
});

app.use((req, res) => {
  console.log(`!!! 404 NOT FOUND !!! - ${req.method} ${req.url}`);
  res.status(404).json({ 
    message: `Маршрут ${req.method} ${req.url} не найден на этом сервере.`,
    availableRoutes: ['/api/auth', '/api/users', '/api/companies', '/api/requests', '/api/contracts', '/api/counterparties', '/api/expenses', '/api/health']
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('!!! GLOBAL SERVER ERROR !!!');
  console.error(err);
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack 
  });
});

const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;