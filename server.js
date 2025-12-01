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

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', user: req.session.user });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db('users').where({ username }).first();
        if (user && await bcrypt.compare(password, user.password_hash)) {
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect('/dashboard');
        } else {
            res.render('login', { title: 'Login', error: 'Invalid credentials', user: req.session.user });
        }
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
    try {
        const participants = await db('participants').select('*');
        const events = await db('events').select('*');
        res.render('dashboard', { title: 'Dashboard', participants, events, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/participants', checkManager, async (req, res) => {
    try {
        const participants = await db('participants').select('*');
        res.render('participants', { title: 'Participants', participants, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/events', async (req, res) => {
    try {
        const events = await db('events').select('*');
        res.render('events', { title: 'Events', events, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.listen(port, () => {
    console.log(`Ella Rises prototype running at http://localhost:${port}`);
});
