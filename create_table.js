const db = require('./db');

async function createTable() {
    try {
        const exists = await db.schema.hasTable('enrollments');
        if (!exists) {
            await db.schema.createTable('enrollments', (table) => {
                table.increments('enrollmentid').primary();
                table.string('parentguardianname');
                table.string('phone');
                table.string('email');
                table.string('participantname');
                table.date('participantdob');
                table.string('grade');
                table.string('school');
                table.text('programinterest');
                table.string('mariachiinstrument');
                table.text('instrumentexperience');
                table.string('feestatus');
                table.boolean('tuitionagreement');
                table.string('languagepreference');
                table.boolean('medicalconsent');
                table.boolean('photoconsent');
                table.boolean('liabilityrelease');
                table.string('parentsignature');
                table.timestamp('submissiondate').defaultTo(db.fn.now());
            });
            console.log('Table enrollments created successfully.');
        } else {
            console.log('Table enrollments already exists.');
        }
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        db.destroy();
    }
}

createTable();
