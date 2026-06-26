const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
const isPostgres = !!process.env.DATABASE_URL;
const jsonDbPath = path.join(__dirname, 'inquiries_db.json');

if (isPostgres) {
  console.log('[DATABASE] DATABASE_URL detected. Configuring PostgreSQL connection pool.');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  console.warn('[DATABASE] DATABASE_URL is not set. Falling back to local JSON database: inquiries_db.json');
}

async function initDb() {
  if (isPostgres) {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        stakeholder_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'New'
      );
    `;
    try {
      await pool.query(createTableQuery);
      console.log('[DATABASE] PostgreSQL inquiries table initialized successfully.');
    } catch (err) {
      console.error('[DATABASE] Error initializing PostgreSQL table:', err);
      throw err;
    }
  } else {
    // Local JSON DB initialization
    if (!fs.existsSync(jsonDbPath)) {
      fs.writeFileSync(jsonDbPath, JSON.stringify([], null, 2), 'utf8');
      console.log('[DATABASE] Local JSON database created at inquiries_db.json');
    } else {
      console.log('[DATABASE] Local JSON database loaded.');
    }
  }
}

async function saveInquiry({ stakeholder_name, email, message }) {
  const createdAt = new Date().toISOString();
  const status = 'New';

  if (isPostgres) {
    const insertQuery = `
      INSERT INTO inquiries (stakeholder_name, email, message, created_at, status)
      VALUES ($1, $2, $3, NOW(), $4)
      RETURNING *;
    `;
    try {
      const res = await pool.query(insertQuery, [stakeholder_name, email, message, status]);
      return res.rows[0];
    } catch (err) {
      console.error('[DATABASE] Error saving inquiry to PostgreSQL:', err);
      throw err;
    }
  } else {
    // Local JSON DB logic
    try {
      let data = [];
      if (fs.existsSync(jsonDbPath)) {
        const fileContent = fs.readFileSync(jsonDbPath, 'utf8');
        data = JSON.parse(fileContent || '[]');
      }
      
      const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
      const newRecord = {
        id: newId,
        stakeholder_name,
        email,
        message,
        created_at: createdAt,
        status
      };
      
      data.push(newRecord);
      fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
      return newRecord;
    } catch (err) {
      console.error('[DATABASE] Error saving inquiry to JSON DB:', err);
      throw err;
    }
  }
}

module.exports = {
  initDb,
  saveInquiry,
  isPostgres
};
