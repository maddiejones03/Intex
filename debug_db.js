const db = require('./db');

async function checkSchema() {
    try {
        const exists = await db.schema.hasTable('enrollments');
        console.log('Table enrollments exists:', exists);

        if (exists) {
            const columns = await db('enrollments').columnInfo();
            console.log('Columns:', columns);
        }
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        db.destroy();
    }
}

checkSchema();
