// IMPORTANT: Load environment variables FIRST before any other imports
import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import scraperRoutes from './routes/scraper.js';
import aiRoutes from './routes/ai.js';
import consumptionRoutes from './routes/consumption.js';
import pelletRoutes from './routes/pellets.js';
import heatingRoutes from './routes/heating.js';
import weatherRoutes from './routes/weather.js';
import heaterRoutes from './routes/heater.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 8000;

// Security Middleware - Helmet sets various HTTP headers to help protect the app
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server (not serving HTML)
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests for local development
}));

// CORS - Whitelist specific origins for frontend-backend communication
const allowedOrigins = [
  'http://localhost:3000',           // Local frontend development
  'http://localhost:5173',           // Vite default port
  'http://127.0.0.1:3000',          // Alternative localhost
  'http://127.0.0.1:5173',          // Alternative Vite port
];

// In production, you can add your deployed frontend URL to this list
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body Parsing with size limits (Phase 2.3)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', scraperRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/pellets', pelletRoutes);
app.use('/api/heating', heatingRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/heater', heaterRoutes);

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
