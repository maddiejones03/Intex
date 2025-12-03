const db = require('./db');

async function debug() {
    try {
        console.log('--- USERS ---');
        const users = await db('users').select('email', 'firstname', 'lastname', 'role');
        console.table(users);

        console.log('\n--- PARTICIPANTS ---');
        const participants = await db('participants').select('participantemail', 'participantfirstname', 'participantlastname', 'userid');
        console.table(participants);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

debug();
