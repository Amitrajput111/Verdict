import express from 'express';
import app from '../backend/src/app';

const vercelApp = express();

vercelApp.use((req, res, next) => {
  // Strip the /api prefix before forwarding to the backend router
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '') || '/';
  }
  next();
});

// Forward all requests to the original app
vercelApp.use(app);

export default vercelApp;
