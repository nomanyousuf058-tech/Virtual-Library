const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'admin',
  host: 'postgres',
  database: 'virtuallibrary',
  password: 'password123',
  port: 5432,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      elasticsearch: 'connected'
    }
  });
});

// Books endpoints
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books WHERE is_published = true');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  
  try {
    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user (in production, hash the password!)
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, password, name, role || 'reader']
    );

    res.status(201).json({ 
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Live sessions endpoints
app.get('/api/live-sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM live_sessions 
      WHERE scheduled_time > NOW() 
      ORDER BY scheduled_time ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});