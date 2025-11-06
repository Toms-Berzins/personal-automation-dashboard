// IMPORTANT: Load environment variables FIRST before any other imports
import './config/env.js';
import express from 'express';
import cors from 'cors';
import scraperRoutes from './routes/scraper.js';
import aiRoutes from './routes/ai.js';
import consumptionRoutes from './routes/consumption.js';
import pelletRoutes from './routes/pellets.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', scraperRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/pellets', pelletRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
