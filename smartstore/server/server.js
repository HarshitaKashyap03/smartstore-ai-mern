const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const io = new Server(server, {
  cors: { origin: clientUrl, methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors()); // Allow all for local dev
app.use(express.json());

// Make io accessible in routes
app.use((req, res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/sales',      require('./routes/sales'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/predict',    require('./routes/predict'));
app.use('/api/billing',    require('./routes/billing'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/settings',   require('./routes/settings'));

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// MongoDB connect + seed
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await require('./seedData')(io);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch(err => console.error(err));
// trigger restart 5
