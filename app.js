//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({
  secret: 'my bro this is a secret',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const workEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true }, // User's email address
  date: { type: String, required: true }, // Store date as "YYYY-MM-DD"
  dayOfWeek: { type: String, required: true }, // Store the day of the week
  hoursWorked: { type: Number, required: true },
  weeklyGoal: { type: Number, default: 20 }, // Fixed weekly goal (20 hours)
  weeklyProgress: { type: Number, required: true }
});

const WorkEntry = mongoose.model('WorkEntry', workEntrySchema);

app.get('/', function(req, res) {
  res.render('home');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});

app.get('/secrets', async function(req, res) {
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.username; // Assuming 'username' holds the email address
      const username = userId.split("@")[0]; // Extract the part before the "@" symbol
      const userIcon = `./pictures/${username}.jpg`
      const currentDate = new Date();
      const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const weekStartDate = new Date(currentDate);
      weekStartDate.setDate(currentDate.getDate() - currentDay + 1); // Set to Monday

      const entriesThisWeek = await WorkEntry.find({
        userId,
        date: { $gte: weekStartDate.toISOString().slice(0, 10) }, // Entries on or after Monday
      });

      const totalHoursThisWeek = entriesThisWeek.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      const formatedHours = `${totalHoursThisWeek.toString()} hrs`;

      const picksonEntriesThisWeek = await WorkEntry.find({
        userId: "pickson@gmail.com",
        date: { $gte: weekStartDate.toISOString().slice(0, 10) }, // Entries on or after Monday
      });
      
      const benardEntriesThisWeek = await WorkEntry.find({
        userId: "benard@gmail.com",
        date: { $gte: weekStartDate.toISOString().slice(0, 10) }, // Entries on or after Monday
      });
      
      const achenejeEntriesThisWeek = await WorkEntry.find({
        userId: "acheneje@gmail.com",
        date: { $gte: weekStartDate.toISOString().slice(0, 10) }, // Entries on or after Monday
      });
      
      const picksonTotalHoursThisWeek = (picksonEntriesThisWeek || []).reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      const benardTotalHoursThisWeek = (benardEntriesThisWeek || []).reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      const achenejeTotalHoursThisWeek = (achenejeEntriesThisWeek || []).reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      
      const weeklyGoalHours = 20; // Assuming a fixed weekly goal of 20 hours

      // Calculate percentage completion (clamped to a minimum of 0)
      const picksonPercentageCompletion = Math.max(0, (picksonTotalHoursThisWeek / weeklyGoalHours) * 100);
      const benardPercentageCompletion = Math.max(0, (benardTotalHoursThisWeek / weeklyGoalHours) * 100);
      const achenejePercentageCompletion = Math.max(0, (achenejeTotalHoursThisWeek / weeklyGoalHours) * 100);

      // Format percentage completion and total hours
      const picksonFormattedPercentage = `width: ${picksonPercentageCompletion.toFixed(2)}%;`;
      const benardFormattedPercentage = `width: ${benardPercentageCompletion.toFixed(2)}%;`;
      const achenejeFormattedPercentage = `width: ${achenejePercentageCompletion.toFixed(2)}%;`;

      const picksonFormattedHours = `${picksonTotalHoursThisWeek.toString()} hrs`;
      const benardFormattedHours = `${benardTotalHoursThisWeek.toString()} hrs`;
      const achenejeFormattedHours = `${achenejeTotalHoursThisWeek.toString()} hrs`;


      res.render('secrets', {
        picksonPercentageCompletion: picksonFormattedPercentage,
        benardPercentageCompletion: benardFormattedPercentage,
        achenejePercentageCompletion: achenejeFormattedPercentage,
        weeklyTotal: formatedHours, userIconString: userIcon // Use the correct variable here (e.g., picksonFormattedHours)
      });
      
    } catch (error) {
      console.error(error);
      res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/submit', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post('/register', function(req, res) {
  User.register({ username: req.body.username }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function() {
        console.log('weird activity');
        res.redirect('/secrets');
      });
    }
  });
});

app.post('/login', function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function() {
        console.log('weird activity');
        res.redirect('/secrets');
      });
    }
  });
});

app.post('/submit', async (req, res) => {
  try {
    const userId = req.user.username; // Assuming 'username' holds the email address
    const hoursWorked = req.body.hours; // Get the submitted hours from the form

    // Calculate the day of the week and the current week's start date (Monday)
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const weekStartDate = new Date(currentDate);
    weekStartDate.setDate(currentDate.getDate() - currentDay + 1); // Set to Monday

    // Query the database for entries within the current week
    const entriesThisWeek = await WorkEntry.find({
      userId,
      date: { $gte: weekStartDate.toISOString().slice(0, 10) }, // Entries on or after Monday
    });

    // Calculate total hours worked this week
    const totalHoursThisWeek = entriesThisWeek.reduce((sum, entry) => sum + entry.hoursWorked, 0);
    const formatedHours = `${totalHoursThisWeek.toString()} hrs`;

    // Create a new WorkEntry document
    const entry = new WorkEntry({
      userId,
      date: currentDate.toISOString().slice(0, 10), // Format as "YYYY-MM-DD"
      dayOfWeek: daysOfWeek[currentDay],
      hoursWorked,
      weeklyGoal: 20, // Fixed weekly goal (20 hours)
      weeklyProgress: totalHoursThisWeek, // Store the weekly progress
    });

    // Save the entry to the database
    await entry.save();

    // Calculate percentage completion
    const percentageCompletion = (totalHoursThisWeek / entry.weeklyGoal) * 100;
    const formattedPercentage = `width: ${percentageCompletion.toFixed(2)}%;`;

    // res.redirect('/secrets', { percentageCompletion: formattedPercentage, weeklyTotal: formatedHours});
    res.redirect('/secrets');
  } catch (error) {
    console.error(error);
    res.redirect('/submit'); // Handle the error appropriately
  }
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});



