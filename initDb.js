const db = require('./db');
const bcrypt = require('bcrypt');

// Prevent table recreation on Elastic Beanstalk
if (process.env.NODE_ENV === 'production') {
    console.log("initDb skipped in production.");
    process.exit(0);
}

async function initDb() {
    try {
        // Create users table
        const hasUsers = await db.schema.hasTable('users');
        if (!hasUsers) {
            await db.schema.createTable('users', (table) => {
                table.increments('id').primary();
                table.string('username').unique().notNullable();
                table.string('password_hash').notNullable();
                table.string('role').notNullable(); // 'Manager' or 'User'
            });
            console.log('Created users table');

            // Seed users
            const adminHash = await bcrypt.hash('admin', 10);
            const userHash = await bcrypt.hash('user', 10);

            await db('users').insert([
                { username: 'admin', password_hash: adminHash, role: 'Manager' },
                { username: 'user', password_hash: userHash, role: 'User' },
            ]);
            console.log('Seeded users');
        }

        // Create participants table
        const hasParticipants = await db.schema.hasTable('participants');
        if (!hasParticipants) {
            await db.schema.createTable('participants', (table) => {
                table.increments('id').primary();
                table.string('name');
                table.integer('age');
                table.string('school');
                table.integer('eventsAttended');
            });
            console.log('Created participants table');

            // Seed participants
            await db('participants').insert([
                { name: 'Maria Garcia', age: 16, school: 'Provo High', eventsAttended: 3 },
                { name: 'Sofia Rodriguez', age: 15, school: 'Timpview', eventsAttended: 1 },
                { name: 'Isabella Martinez', age: 17, school: 'Orem High', eventsAttended: 5 },
            ]);
            console.log('Seeded participants');
        }

        // Create events table
        const hasEvents = await db.schema.hasTable('events');
        if (!hasEvents) {
            await db.schema.createTable('events', (table) => {
                table.increments('id').primary();
                table.string('name');
                table.date('date');
                table.string('type');
                table.integer('attendees');
            });
            console.log('Created events table');

            // Seed events
            await db('events').insert([
                { name: 'Art & Engineering Workshop', date: '2025-10-15', type: 'Workshop', attendees: 25 },
                { name: 'Leadership Summit', date: '2025-11-01', type: 'Seminar', attendees: 40 },
                { name: 'Coding for Creatives', date: '2025-12-10', type: 'Workshop', attendees: 15 },
            ]);
            console.log('Seeded events');
        }

        // Create surveys table
        const hasSurveys = await db.schema.hasTable('surveys');
        if (!hasSurveys) {
            await db.schema.createTable('surveys', (table) => {
                table.increments('id').primary();
                table.string('topic');
                table.string('question');
                table.json('responses'); // Storing responses as JSON for simplicity
            });
            console.log('Created surveys table');

            await db('surveys').insert([
                { topic: 'Workshop Feedback', question: 'How would you rate the workshop?', responses: JSON.stringify(['Great', 'Good', 'Okay']) },
                { topic: 'Interest', question: 'What topics do you want next?', responses: JSON.stringify(['Coding', 'Robotics']) }
            ]);
            console.log('Seeded surveys');
        }

        // Create milestones table
        const hasMilestones = await db.schema.hasTable('milestones');
        if (!hasMilestones) {
            await db.schema.createTable('milestones', (table) => {
                table.increments('id').primary();
                table.string('name');
                table.string('description');
                table.date('date');
            });
            console.log('Created milestones table');

            await db('milestones').insert([
                { name: 'First Workshop', description: 'Attended their first workshop', date: '2025-10-15' },
                { name: 'Leader Badge', description: 'Demonstrated leadership skills', date: '2025-11-01' }
            ]);
            console.log('Seeded milestones');
        }

        // Create donations table
        const hasDonations = await db.schema.hasTable('donations');
        if (!hasDonations) {
            await db.schema.createTable('donations', (table) => {
                table.increments('id').primary();
                table.string('donor_name');
                table.decimal('amount', 10, 2);
                table.date('date');
                table.string('message');
            });
            console.log('Created donations table');

            await db('donations').insert([
                { donor_name: 'John Doe', amount: 100.00, date: '2025-09-01', message: 'Keep up the good work!' },
                { donor_name: 'Jane Smith', amount: 250.50, date: '2025-10-05', message: 'For the kids.' }
            ]);
            console.log('Seeded donations');
        }

        // Create participant_milestones table (Junction table)
        const hasParticipantMilestones = await db.schema.hasTable('participant_milestones');
        if (!hasParticipantMilestones) {
            await db.schema.createTable('participant_milestones', (table) => {
                table.increments('id').primary();
                table.integer('participant_id').references('id').inTable('participants').onDelete('CASCADE');
                table.integer('milestone_id').references('id').inTable('milestones').onDelete('CASCADE');
                table.date('assigned_date');
            });
            console.log('Created participant_milestones table');

            // Seed relationship (assuming IDs 1 exist)
            // We might need to fetch IDs if we want to be safe, but for init it's likely 1
            await db('participant_milestones').insert([
                { participant_id: 1, milestone_id: 1, assigned_date: '2025-10-16' }
            ]);
            console.log('Seeded participant_milestones');
        }

        console.log('Database initialization complete');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

initDb();
