const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');


const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Auth Middleware
const checkAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const checkManager = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Manager') {
        next();
    } else {
        res.status(403).send('Access Denied: Managers Only');
    }
};

// Routes
app.get('/teapot', (req, res) => {
    res.status(418).send("I'm a teapot");
});

app.get('/', (req, res) => {
    res.render('index', { title: 'Home', user: req.session.user });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us', user: req.session.user });
});

// Programs Page
app.get('/programs', (req, res) => {
    res.render('programs', { title: 'Programs', user: req.session.user });
});

app.get('/donate', (req, res) => {
    res.render('donate', { title: 'Donate', user: req.session.user });
});

app.post('/donate', async (req, res) => {
    const { amount } = req.body;
    try {
        await db('donations').insert({
            donationamount: amount,
            donationdate: new Date()
            // participantid is left null for public anonymous donations
        });
        res.render('donate', { title: 'Donate', user: req.session.user, success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', user: req.session.user });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Hardcoded test user (Bypasses DB)
    if (email === 'admin@test.com' && password === 'admin') {
        req.session.user = { userid: 999, email: 'admin@test.com', role: 'Manager', firstname: 'Admin', lastname: 'User' };
        return res.redirect('/dashboard');
    }

    try {
        const user = await db('users').where({ email: email }).first();
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.render('login', { title: 'Login', user: req.session.user, error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/signup', async (req, res) => {
    const { email, password, confirm_password, firstname, lastname } = req.body;

    if (password !== confirm_password) {
        return res.render('login', { title: 'Login', user: req.session.user, error: 'Passwords do not match' });
    }

    try {
        const existingUser = await db('users').where({ email: email }).first();
        if (existingUser) {
            return res.render('login', { title: 'Login', user: req.session.user, error: 'Email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        await db('users').insert({
            email: email,
            password: password_hash,
            firstname: firstname,
            lastname: lastname,
            role: 'user' // Default role
        });

        // Auto-login after signup
        const newUser = await db('users').where({ email: email }).first();
        req.session.user = newUser;
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/dashboard', checkManager, async (req, res) => {
    // Mock data for test user
    if (req.session.user && req.session.user.username === 'test') {
        const participants = [
            { id: 1, name: 'Test Participant', age: 18, school: 'Test High', eventsAttended: 5 },
            { id: 2, name: 'Another Student', age: 16, school: 'Mock School', eventsAttended: 2 }
        ];
        const events = [
            { id: 1, name: 'Test Event', date: '2025-01-01', type: 'Workshop', attendees: 10 },
            { id: 2, name: 'Mock Seminar', date: '2025-02-01', type: 'Seminar', attendees: 20 }
        ];
        return res.render('dashboard', { title: 'Dashboard', participants, events, user: req.session.user });
    }

    try {
        const participants = await db('participants').select('*');
        const events = await db("event_occurrences as eo")
            .join("event_templates as et", "eo.eventtemplateid", "et.eventtemplateid")
            .select(
                "eo.*",
                "et.eventname",
                "et.eventtype",
                "et.eventdescription"
            );
        res.render('dashboard', { title: 'Dashboard', participants, events, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Participants Routes
app.get('/participants', checkAuth, async (req, res) => {
    const { search } = req.query;
    try {
        let query = db('participants').select('*');
        if (search) {
            query = query.where('participantfirstname', 'ilike', `%${search}%`)
                .orWhere('participantlastname', 'ilike', `%${search}%`)
                .orWhere('participantemail', 'ilike', `%${search}%`);
        }
        const participants = await query;
        res.render('participants', { title: 'Participants', participants, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/participants/add', checkManager, async (req, res) => {
    const { participantfirstname, participantlastname, participantemail, participantphone, participantaddress, participantcity, participantstate, participantzip, participantdateofbirth, participantgender } = req.body;
    try {
        await db('participants').insert({
            participantfirstname, participantlastname, participantemail, participantphone, participantaddress, participantcity, participantstate, participantzip, participantdateofbirth, participantgender,
            participantcreatedat: new Date()
        });
        res.redirect('/participants');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding participant');
    }
});

app.post('/participants/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { participantfirstname, participantlastname, participantemail, participantphone, participantaddress, participantcity, participantstate, participantzip, participantdateofbirth, participantgender } = req.body;
    try {
        await db('participants').where({ participantid: id }).update({
            participantfirstname, participantlastname, participantemail, participantphone, participantaddress, participantcity, participantstate, participantzip, participantdateofbirth, participantgender
        });
        res.redirect('/participants');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating participant');
    }
});

app.post('/participants/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('participants').where({ participantid: id }).del();
        res.redirect('/participants');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting participant');
    }
});

// Events Routes
app.get('/events', checkAuth, async (req, res) => {
    const { search } = req.query;
    try {
        // Fetch Occurrences
        let occurrencesQuery = db("event_occurrences as eo")
            .join("event_templates as et", "eo.eventtemplateid", "et.eventtemplateid")
            .select(
                "eo.*",
                "et.eventname",
                "et.eventtype",
                "et.eventdescription"
            );

        if (search) {
            occurrencesQuery = occurrencesQuery.where('et.eventname', 'ilike', `%${search}%`)
                .orWhere('et.eventtype', 'ilike', `%${search}%`);
        }
        const occurrences = await occurrencesQuery;

        // Fetch Templates (for management and dropdown)
        const templates = await db('event_templates').select('*').orderBy('eventname');

        res.render('events', { title: 'Events', occurrences, templates, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Template Routes
app.post('/events/templates/add', checkManager, async (req, res) => {
    const { eventname, eventtype, eventdescription } = req.body;
    try {
        await db('event_templates').insert({ eventname, eventtype, eventdescription });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding event template');
    }
});

app.post('/events/templates/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { eventname, eventtype, eventdescription } = req.body;
    try {
        await db('event_templates').where({ eventtemplateid: id }).update({ eventname, eventtype, eventdescription });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating event template');
    }
});

app.post('/events/templates/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('event_templates').where({ eventtemplateid: id }).del();
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting event template');
    }
});

// Occurrence Routes
app.post('/events/occurrences/add', checkManager, async (req, res) => {
    const { eventtemplateid, eventdatetimestart, eventdatetimeend, eventlocation, eventcapacity, eventregistrationdeadline } = req.body;
    try {
        await db('event_occurrences').insert({ eventtemplateid, eventdatetimestart, eventdatetimeend, eventlocation, eventcapacity, eventregistrationdeadline });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding event occurrence');
    }
});

app.post('/events/occurrences/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { eventtemplateid, eventdatetimestart, eventdatetimeend, eventlocation, eventcapacity, eventregistrationdeadline } = req.body;
    try {
        await db('event_occurrences').where({ eventoccurrenceid: id }).update({ eventtemplateid, eventdatetimestart, eventdatetimeend, eventlocation, eventcapacity, eventregistrationdeadline });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating event occurrence');
    }
});

app.post('/events/occurrences/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('event_occurrences').where({ eventoccurrenceid: id }).del();
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting event occurrence');
    }
});

// Registrations Routes
app.get('/registrations', checkManager, async (req, res) => {
    const { search } = req.query;
    try {
        let query = db('registrations')
            .join('participants', 'registrations.participantid', 'participants.participantid')
            .join('event_occurrences', 'registrations.eventoccurrenceid', 'event_occurrences.eventoccurrenceid')
            .join('event_templates', 'event_occurrences.eventtemplateid', 'event_templates.eventtemplateid')
            .select(
                'registrations.*',
                'participants.participantfirstname',
                'participants.participantlastname',
                'event_templates.eventname',
                'event_occurrences.eventdatetimestart'
            );

        if (search) {
            query = query.where('participants.participantfirstname', 'ilike', `%${search}%`)
                .orWhere('participants.participantlastname', 'ilike', `%${search}%`)
                .orWhere('event_templates.eventname', 'ilike', `%${search}%`);
        }
        const registrations = await query;
        res.render('registrations', { title: 'Registrations', registrations, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/events/register', checkAuth, async (req, res) => {
    const { eventoccurrenceid } = req.body;
    try {
        const participant = await db('participants').where({ participantemail: req.session.user.email }).first();

        if (!participant) {
            return res.status(400).send('No participant profile found for your email. Please contact admin.');
        }

        await db('registrations').insert({
            participantid: participant.participantid,
            eventoccurrenceid: eventoccurrenceid,
            registrationstatus: 'Registered',
            registrationcreatedat: new Date()
        });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error registering for event');
    }
});

// User Maintenance Routes
app.get('/users', checkManager, async (req, res) => {
    try {
        const users = await db('users').select('userid', 'email', 'role').orderBy('userid');
        res.render('users', { title: 'User Management', users, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/users/add', checkManager, async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        await db('users').insert({ email, password: password_hash, role });
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating user');
    }
});

app.post('/users/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { email, password, role } = req.body;
    try {
        const updateData = { email, role };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await db('users').where({ userid: id }).update(updateData);
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating user');
    }
});

app.post('/users/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('users').where({ userid: id }).del();
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting user');
    }
});

// Surveys Routes
app.get('/surveys', checkAuth, async (req, res) => {
    const { search } = req.query;
    try {
        let query = db("surveys")
            .leftJoin("participants", "surveys.participantid", "participants.participantid")
            .select(
                "surveys.*",
                "participants.participantfirstname",
                "participants.participantlastname"
            );

        if (search) {
            query = query.where('participants.participantfirstname', 'ilike', `%${search}%`)
                .orWhere('participants.participantlastname', 'ilike', `%${search}%`);
        }
        const surveys = await query;
        const participants = await db('participants').select('participantid', 'participantfirstname', 'participantlastname');

        res.render('surveys', { title: 'Survey Submissions', surveys, participants, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/surveys/add', checkManager, async (req, res) => {
    const { participantid, surveysatisfactionscore, surveyusefulnessscore, surveyinstructorscore, surveyrecommendationscore, surveyoverallscore, surveynpsbucket, surveycomments, surveysubmissiondate } = req.body;
    try {
        await db('surveys').insert({
            participantid: participantid || null,
            surveysatisfactionscore, surveyusefulnessscore, surveyinstructorscore, surveyrecommendationscore, surveyoverallscore, surveynpsbucket, surveycomments, surveysubmissiondate
        });
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding survey submission');
    }
});

app.post('/surveys/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { participantid, surveysatisfactionscore, surveyusefulnessscore, surveyinstructorscore, surveyrecommendationscore, surveyoverallscore, surveynpsbucket, surveycomments, surveysubmissiondate } = req.body;
    try {
        await db('surveys').where({ surveyid: id }).update({
            participantid: participantid || null,
            surveysatisfactionscore, surveyusefulnessscore, surveyinstructorscore, surveyrecommendationscore, surveyoverallscore, surveynpsbucket, surveycomments, surveysubmissiondate
        });
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating survey submission');
    }
});

app.post('/surveys/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('surveys').where({ surveyid: id }).del();
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting survey submission');
    }
});

// Milestones Routes
app.get('/milestones', checkAuth, async (req, res) => {
    const { search } = req.query;

    try {
        let query = db('milestones')
            .leftJoin('participants', 'milestones.participantid', 'participants.participantid')
            .select('milestones.*', 'participants.participantfirstname', 'participants.participantlastname');

        if (search) {
            query = query.where('milestones.milestonetitle', 'ilike', `%${search}%`)
                .orWhere('participants.participantfirstname', 'ilike', `%${search}%`)
                .orWhere('participants.participantlastname', 'ilike', `%${search}%`);
        }
        const milestones = await query;
        const participants = await db('participants').select('participantid', 'participantfirstname', 'participantlastname');

        res.render('milestones', { title: 'Milestones', milestones, participants, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/milestones/add', checkManager, async (req, res) => {
    const { participantid, milestonetitle, milestonedate } = req.body;
    try {
        await db('milestones').insert({
            participantid: participantid || null,
            milestonetitle,
            milestonedate
        });
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding milestone');
    }
});

app.post('/milestones/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { participantid, milestonetitle, milestonedate } = req.body;
    try {
        await db('milestones').where({ milestoneid: id }).update({
            participantid: participantid || null,
            milestonetitle,
            milestonedate
        });
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating milestone');
    }
});

app.post('/milestones/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('milestones').where({ milestoneid: id }).del();
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting milestone');
    }
});

// Donations Routes (Internal View)
app.get('/donations', checkAuth, async (req, res) => {
    const { search } = req.query;
    try {
        let query = db('donations')
            .leftJoin('participants', 'donations.participantid', 'participants.participantid')
            .select('donations.*', 'participants.participantfirstname', 'participants.participantlastname');

        if (search) {
            query = query.where('participants.participantfirstname', 'ilike', `%${search}%`)
                .orWhere('participants.participantlastname', 'ilike', `%${search}%`);
        }
        const donations = await query;
        const participants = await db('participants').select('participantid', 'participantfirstname', 'participantlastname');

        res.render('donations', { title: 'Donations', donations, participants, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/donations/add', checkManager, async (req, res) => {
    const { participantid, donationamount, donationdate } = req.body;
    try {
        await db('donations').insert({
            participantid: participantid || null,
            donationamount,
            donationdate
        });
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding donation');
    }
});

app.post('/donations/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { participantid, donationamount, donationdate } = req.body;
    try {
        await db('donations').where({ donationid: id }).update({
            participantid: participantid || null,
            donationamount,
            donationdate
        });
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating donation');
    }
});

app.post('/donations/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('donations').where({ donationid: id }).del();
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting donation');
    }
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await db.raw('SELECT NOW()');
        res.json({ success: true, time: result.rows[0] });
    } catch (err) {
        console.error('DB connection failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Ella Rises prototype running at http://localhost:${port}`);
});
