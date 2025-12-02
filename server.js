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
    const { donor_name, amount, message } = req.body;
    try {
        await db('donations').insert({
            donor_name,
            amount,
            message,
            date: new Date()
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
        req.session.user = { id: 999, username: 'admin@test.com', role: 'Manager' };
        return res.redirect('/dashboard');
    }

    try {
        const user = await db('users').where({ username: email }).first();
        if (user && await bcrypt.compare(password, user.password_hash)) {
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
    const { email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.render('login', { title: 'Login', user: req.session.user, error: 'Passwords do not match' });
    }

    try {
        const existingUser = await db('users').where({ username: email }).first();
        if (existingUser) {
            return res.render('login', { title: 'Login', user: req.session.user, error: 'Email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        await db('users').insert({
            username: email, // Storing email in username column
            password_hash,
            role: 'User' // Default role
        });

        // Auto-login after signup
        const newUser = await db('users').where({ username: email }).first();
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
        const events = await db('events').select('*');
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
            query = query.where('name', 'ilike', `%${search}%`)
                .orWhere('school', 'ilike', `%${search}%`);
        }
        const participants = await query;
        res.render('participants', { title: 'Participants', participants, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/participants/add', checkManager, async (req, res) => {
    const { name, age, school, eventsAttended } = req.body;
    try {
        await db('participants').insert({ name, age, school, eventsAttended });
        res.redirect('/participants');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding participant');
    }
});

app.post('/participants/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { name, age, school, eventsAttended } = req.body;
    try {
        await db('participants').where({ id }).update({ name, age, school, eventsAttended });
        res.redirect('/participants');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating participant');
    }
});

app.post('/participants/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('participants').where({ id }).del();
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
        let query = db('events').select('*');
        if (search) {
            query = query.where('name', 'ilike', `%${search}%`)
                .orWhere('type', 'ilike', `%${search}%`);
        }
        const events = await query;
        res.render('events', { title: 'Events', events, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/events/add', checkManager, async (req, res) => {
    const { name, date, type, attendees } = req.body;
    try {
        await db('events').insert({ name, date, type, attendees });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding event');
    }
});

app.post('/events/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { name, date, type, attendees } = req.body;
    try {
        await db('events').where({ id }).update({ name, date, type, attendees });
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating event');
    }
});

app.post('/events/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('events').where({ id }).del();
        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting event');
    }
});

// User Maintenance Routes
app.get('/users', checkManager, async (req, res) => {
    try {
        const users = await db('users').select('id', 'username', 'role').orderBy('id');
        res.render('users', { title: 'User Management', users, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/users/add', checkManager, async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        await db('users').insert({ username, password_hash, role });
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating user');
    }
});

app.post('/users/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    try {
        const updateData = { username, role };
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }
        await db('users').where({ id }).update(updateData);
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating user');
    }
});

app.post('/users/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('users').where({ id }).del();
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
        let query = db('surveys').select('*');
        if (search) {
            query = query.where('topic', 'ilike', `%${search}%`)
                .orWhere('question', 'ilike', `%${search}%`);
        }
        const surveys = await query;
        res.render('surveys', { title: 'Surveys', surveys, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/surveys/add', checkManager, async (req, res) => {
    const { topic, question } = req.body;
    try {
        await db('surveys').insert({ topic, question, responses: JSON.stringify([]) });
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding survey');
    }
});

app.post('/surveys/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { topic, question } = req.body;
    try {
        await db('surveys').where({ id }).update({ topic, question });
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating survey');
    }
});

app.post('/surveys/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('surveys').where({ id }).del();
        res.redirect('/surveys');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting survey');
    }
});

// Milestones Routes
app.get('/milestones', checkAuth, async (req, res) => {
    const { search } = req.query;

    if (req.session.user && req.session.user.username === 'test') {
        const milestones = [
            { id: 1, name: 'Test Milestone', description: 'Achieved something', date: '2025-01-01' }
        ];
        return res.render('milestones', { title: 'Milestones', milestones, user: req.session.user, search });
    }

    try {
        let query = db('milestones').select('*');
        if (search) {
            query = query.where('name', 'ilike', `%${search}%`);
        }
        const milestones = await query;
        res.render('milestones', { title: 'Milestones', milestones, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/milestones/add', checkManager, async (req, res) => {
    const { name, description, date } = req.body;
    try {
        await db('milestones').insert({ name, description, date });
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding milestone');
    }
});

app.post('/milestones/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { name, description, date } = req.body;
    try {
        await db('milestones').where({ id }).update({ name, description, date });
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating milestone');
    }
});

app.post('/milestones/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('milestones').where({ id }).del();
        res.redirect('/milestones');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting milestone');
    }
});

// Donations Routes (Internal View)
app.get('/donations', checkAuth, async (req, res) => {
    const { search } = req.query;

    if (req.session.user && req.session.user.username === 'test') {
        const donations = [
            { id: 1, donor_name: 'Test Donor', amount: 50.00, date: '2025-01-01', message: 'Test donation' }
        ];
        return res.render('donations', { title: 'Donations', donations, user: req.session.user, search });
    }

    try {
        let query = db('donations').select('*');
        if (search) {
            query = query.where('donor_name', 'ilike', `%${search}%`);
        }
        const donations = await query;
        res.render('donations', { title: 'Donations', donations, user: req.session.user, search });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/donations/add', checkManager, async (req, res) => {
    const { donor_name, amount, date, message } = req.body;
    try {
        await db('donations').insert({ donor_name, amount, date, message });
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding donation');
    }
});

app.post('/donations/edit/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    const { donor_name, amount, date, message } = req.body;
    try {
        await db('donations').where({ id }).update({ donor_name, amount, date, message });
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating donation');
    }
});

app.post('/donations/delete/:id', checkManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('donations').where({ id }).del();
        res.redirect('/donations');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting donation');
    }
});

app.listen(port, () => {
    console.log(`Ella Rises prototype running at http://localhost:${port}`);
});
