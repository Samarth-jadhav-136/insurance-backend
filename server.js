require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

// 🔧 DNS fix
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ✅ CREATE APP FIRST
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug logs
console.log("--- Environment Check ---");
console.log("PORT:", process.env.PORT || 5000);
console.log("Mongo URI Found:", !!process.env.MONGO_URI);
console.log("OpenRouter Key Found:", !!process.env.OPENROUTER_API_KEY);
console.log("-------------------------");

// 🔌 Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  });

// 📦 Import routes
const policyRoutes = require('./routes/policyRoutes');
const authRoutes = require('./routes/authRoutes');

// ✅ USE ROUTES AFTER app is created
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);

// Base route
app.get('/', (req, res) => {
  res.send("Insurance AI Backend Running");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});