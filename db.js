const knex = require('knex');
require('dotenv').config();

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ellarises_local',
        port: 5432
    }
});

// Verify connection
db.raw('SELECT 1')
    .then(() => {
        console.log('Connected to PostgreSQL database');
    })
    .catch((e) => {
        console.error('Could not connect to PostgreSQL database');
        console.error(e);
    });

module.exports = db;
