import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { apiRateLimit } from './middleware/rateLimit.js';
import { catRouter } from './routes/cat.routes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sleepy-cat';

app.set('trust proxy', true);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  }),
);
app.use(express.json({ limit: '16kb' }));
app.use(apiRateLimit);

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'sleepy-cat-api' });
});

app.use(catRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const startServer = async () => {
  try {
    await mongoose.connect(mongoUri);
    app.listen(port, () => {
      console.log(`Sleepy Cat API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to start Sleepy Cat API:', error.message);
    process.exit(1);
  }
};

startServer();
