const knex = require('knex');
require('dotenv').config();

let db;

if (process.env.DB_HOST) {
    db = knex({
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 5432,
            ssl: { rejectUnauthorized: false } // Often needed for cloud DBs like RDS/EB
        }
    });
} else {
    // Fallback to SQLite for local development
    db = knex({
        client: 'sqlite3',
        connection: {
            filename: './dev.sqlite3'
        },
        useNullAsDefault: true
    });
}

module.exports = db;
