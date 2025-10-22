const express = require('express');
const mongoose = require('mongoose');
const app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://axcr214_db_user:2YYqx2FAD28G3JFt@cluster0.ywmsvbe.mongodb.net/Cluster0';

app.use(session({
    secret: process.env.SESSION_SECRET || '719b95d3e3c196776384fd0fc8f5ed1a55602a960c5a15a1bc0c35164ce15defdae90be123c3aabda2aa9a8dd4550ec3aad98ec8d6002de6e86e9dc82881972b',
    store: MongoStore.create({ mongoUrl: mongoUri }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));


mongoose.connect(mongoUri)

const userSchema = new mongoose.Schema({
    username: { type: String},
    password: { type: String}
});

const goalSchema = new mongoose.Schema({
    goalname: { type: String, required: true },
    goaldescription: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const User = mongoose.model('User', userSchema);
const Goal = mongoose.model('Goal', goalSchema);

app.get('/', (req, res) => {
    res.render('homepage');
});

app.get('/signin', (req, res) => {
    res.render('signin', { errors: [] });
});

app.post('/signin', async (req, res) => {
    const errors = [];
    const { username, password } = req.body;

    if (!username || !password) errors.push('Please fill in the entire form.');
    if (password && password.length < 8) errors.push('Password must be at least 8 characters long.');
    if (errors.length) return res.render('signin', { errors });

        try {
                const existing = await User.findOne({ username });
                if (existing) {
                        errors.push('Username already exists.');
                        return res.render('signin', { errors });
                }

                const user = new User({ username, password });
                await user.save();
                req.session.userId = user._id;
                return res.redirect('/task');
        } catch (err) {
                console.error(err);
                res.status(500).send('Server error');
        }
});

app.get('/login', (req, res) => {
    res.render('login', { errors: [] });
});

app.post('/login', async (req, res) => {
    const errors = [];
    const { username, password } = req.body;

    if (!username || !password) {
        errors.push('Please fill in the full form');
        return res.render('login', { errors });
    }

    try {
        const user = await User.findOne({ username });
        if (user && user.password === password) {
            req.session.userId = user._id;
            return res.redirect('/task');
        } else {
            errors.push('Username or password incorrect');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/task', async (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');
        const goals = await Goal.find({ owner: req.session.userId });
        res.render('tasks', { goals, errors: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/tasks', async (req, res) => {
    const errors = [];
    const { goalname, goaldescription } = req.body;

    if (!goalname || !goaldescription) {
        errors.push('Please provide goal name and description.');
        const goals = await Goal.find({});
        return res.render('tasks', { goals, errors });
    }

    try {
        const newGoal = new Goal({ goalname, goaldescription });
        await newGoal.save();
        const goals = await Goal.find({});
        return res.render('tasks', { goals, errors: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.post('/task', async (req, res) => {
    const errors = [];
    const goalname = req.body.goalname;
    
    const goaldescription = req.body.goaldescription || req.body.goaldiscrption;

    if (!goalname || !goaldescription) {
        errors.push('Please provide goal name and description.');
        const goals = await Goal.find({});
        return res.render('tasks', { goals, errors });
    }

    try {
        if (!req.session.userId) return res.redirect('/login');
        const newGoal = new Goal({ goalname, goaldescription, owner: req.session.userId });
        await newGoal.save();
        const goals = await Goal.find({ owner: req.session.userId });
        return res.render('tasks', { goals, errors: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



app.post('/task/delete', async (req, res) => {
    try {
        const { index, id } = req.body;

        if (!req.session.userId) return res.redirect('/login');

        if (id) {
            await Goal.deleteOne({ _id: id, owner: req.session.userId });
        } else if (index !== undefined) {
            const i = parseInt(index, 10);
            const goals = await Goal.find({ owner: req.session.userId });
            if (Number.isNaN(i) || i < 0 || i >= goals.length) {
                const current = await Goal.find({ owner: req.session.userId });
                return res.render('tasks', { goals: current, errors: ['Invalid task index'] });
            }
            const idToDelete = goals[i]._id;
            await Goal.deleteOne({ _id: idToDelete, owner: req.session.userId });
        } else {
            const current = await Goal.find({ owner: req.session.userId });
            return res.render('tasks', { goals: current, errors: ['No task identifier provided'] });
        }

        const updated = await Goal.find({ owner: req.session.userId });
        return res.render('tasks', { goals: updated, errors: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.listen(3000);