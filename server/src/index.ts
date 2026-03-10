import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route';
import companyRoutes from './routes/company.route';
import requestRoutes from './routes/request.route';
import userRoutes from './routes/user.route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ping', (req, res) => {
  res.send('Server is alive and reachable!');
});

// Final 404 Handler
app.use((req, res) => {
  console.log(`!!! 404 NOT FOUND !!! - ${req.method} ${req.url}`);
  res.status(404).json({ 
    message: `Маршрут ${req.method} ${req.url} не найден на этом сервере.`,
    availableRoutes: ['/api/auth', '/api/users', '/api/companies', '/api/requests', '/api/health']
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('!!! GLOBAL SERVER ERROR !!!');
  console.error(err);
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

// Start server if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
