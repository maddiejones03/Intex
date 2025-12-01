const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Mock Data
const participants = [
    { id: 1, name: 'Maria Garcia', age: 16, school: 'Provo High', eventsAttended: 3 },
    { id: 2, name: 'Sofia Rodriguez', age: 15, school: 'Timpview', eventsAttended: 1 },
    { id: 3, name: 'Isabella Martinez', age: 17, school: 'Orem High', eventsAttended: 5 },
];

const events = [
    { id: 1, name: 'Art & Engineering Workshop', date: '2025-10-15', type: 'Workshop', attendees: 25 },
    { id: 2, name: 'Leadership Summit', date: '2025-11-01', type: 'Seminar', attendees: 40 },
    { id: 3, name: 'Coding for Creatives', date: '2025-12-10', type: 'Workshop', attendees: 15 },
];

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'Dashboard', participants, events });
});

app.get('/participants', (req, res) => {
    res.render('participants', { title: 'Participants', participants });
});

app.get('/events', (req, res) => {
    res.render('events', { title: 'Events', events });
});

app.listen(port, () => {
    console.log(`Ella Rises prototype running at http://localhost:${port}`);
});
