require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path'); // Add this at the top with other requires
const bcrypt = require('bcrypt'); // Add this line
const session = require('express-session'); // Add this line

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY); // <-- ADD THIS LINE

const app = express();
const PORT = 3000;

// Session middleware should come BEFORE any route that uses req.session
app.use(session({
    secret: 'your-secret-key', // use a strong secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using HTTPS
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('components'));
app.use('/src', express.static('src')); // Add this line
app.use('/components', express.static(path.join(__dirname, 'components')));

// Serve Start.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'Start.html'));
});

app.post('/signup', async (req, res) => {
    const { email, password, 'confirm-password': confirmPassword } = req.body;

    // Check if password and confirm-password match
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the 'users' table
    const { data, error } = await supabase
        .from('users')
        .insert([{ email, password: hashedPassword }]);

    if (error) {
        console.error('Error inserting user:', error);
        return res.status(500).send('Error signing up');
    }

    // Save email to session
    req.session.userEmail = email;

    console.log('User signed up:', data);
    res.redirect('/components/StudentInfo.html');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Get user by email
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) {
        console.error('Login failed:', error);
        return res.status(401).send('Invalid email or password');
    }

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).send('Invalid email or password');
    }

    // Save email to session
    req.session.userEmail = email;

    console.log('User logged in:', user);
    res.redirect('/components/temp_homepage.html');
});

app.get('/api/user-email', (req, res) => {
    const email = req.session.userEmail || null;
    res.json({ email });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});