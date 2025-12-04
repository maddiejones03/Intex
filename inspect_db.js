const db = require('./db');

async function inspect() {
    try {
        const result = await db('event_templates').first();
        console.log('Columns in event_templates:', Object.keys(result));
    } catch (err) {
        console.error('Error inspecting table:', err);
    } finally {
        process.exit();
    }
}

inspect();
