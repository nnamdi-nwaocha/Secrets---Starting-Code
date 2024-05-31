//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
require('dotenv').config() 
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

app.get('/', function(req, res){
    res.render('home');
});

app.get('/login', function(req, res){
    res.render('login');
});

app.get('/register', function(req, res){
    res.render('register');
});

app.get('/secrets', function(req, res){
  if (req.isAuthenticated()){
    res.render('secrets');
  }else {
    res.redirect('/login');
  }
});

app.get('/logout', function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

app.post('/register', function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect('/register');
    }else {
      passport.authenticate('local')(req, res, function(){
        console.log('weird activity')
        res.redirect('/secrets');
      })
    }
  })
});
app.post('/login', function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err) {
      console.log(err);
    }else{
      passport.authenticate('local')(req, res, function(){
        console.log('weird activity')
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});

