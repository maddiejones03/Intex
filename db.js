const knex = require('knex');

// Load .env only in local development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const isProduction = process.env.NODE_ENV === 'production';

// Build connection object
const connection = isProduction
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
      }
    : {
          host: process.env.DB_HOST || '127.0.0.1',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'ellarises_local',
          port: process.env.DB_PORT || 5432
      };

const db = knex({
    client: 'pg',
    connection
});

// Test connection
db.raw('SELECT 1')
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch((e) => {
      console.error('Could not connect to PostgreSQL database');
      console.error(e);
  });

module.exports = db;