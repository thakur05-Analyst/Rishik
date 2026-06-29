const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { logger } = require('./utils/logger');

let pool = null;
const isPostgres = !!process.env.DATABASE_URL;
const jsonDbPath = path.join(__dirname, 'inquiries_db.json');

if (isPostgres) {
  logger.info('[DATABASE] DATABASE_URL detected. Configuring PostgreSQL connection pool.');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  logger.warn('[DATABASE] DATABASE_URL is not set. Falling back to local JSON database: inquiries_db.json');
}

async function initDb() {
  if (isPostgres) {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        stakeholder_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        company_name VARCHAR(255),
        service_required VARCHAR(100),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'New'
      );
    `;
    try {
      await pool.query(createTableQuery);
      logger.info('[DATABASE] PostgreSQL inquiries table initialized successfully.');
    } catch (err) {
      logger.error(`[DATABASE] Error initializing PostgreSQL table: ${err.message}`);
      throw err;
    }
  } else {
    // Local JSON DB initialization
    if (!fs.existsSync(jsonDbPath)) {
      fs.writeFileSync(jsonDbPath, JSON.stringify([], null, 2), 'utf8');
      logger.info('[DATABASE] Local JSON database created at inquiries_db.json');
    } else {
      logger.info('[DATABASE] Local JSON database loaded.');
    }
  }
}

async function saveInquiry({ stakeholder_name, email, phone, company_name, service_required, message }) {
  const createdAt = new Date().toISOString();
  const status = 'New';

  if (isPostgres) {
    const insertQuery = `
      INSERT INTO inquiries (stakeholder_name, email, phone, company_name, service_required, message, created_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *;
    `;
    try {
      const res = await pool.query(insertQuery, [stakeholder_name, email, phone, company_name, service_required, message, status]);
      return res.rows[0];
    } catch (err) {
      logger.error(`[DATABASE] Error saving inquiry to PostgreSQL: ${err.message}`);
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
        phone,
        company_name,
        service_required,
        message,
        created_at: createdAt,
        status
      };
      
      data.push(newRecord);
      fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
      return newRecord;
    } catch (err) {
      logger.error(`[DATABASE] Error saving inquiry to JSON DB: ${err.message}`);
      throw err;
    }
  }
}

module.exports = {
  initDb,
  saveInquiry,
  isPostgres
};
