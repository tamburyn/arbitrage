import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { orderbooksRouter } from './routes/orderbooks';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Podstawowe middleware
app.use(helmet()); // Bezpieczeństwo
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoded parsing

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/orderbooks', orderbooksRouter);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;