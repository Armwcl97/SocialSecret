require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//LEVEL 3 OF encryption
// const md5 = require("md5");
//LEVEL 2 OF ENCRYPTION
// const encrypt = require("mongoose-encryption");

// LEVEL 4 OF encryption
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const app = express();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://XXXXXX:XXXXXX@cluster0.xkalq4v.mongodb.net/userBD");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//LEVEL 2 OF ENCRYPTION
// userSchema.plugin(encrypt,{secret:process.env.SECRET_KEY , encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(error, user) {
      return cb(error, user);
    });
  }
));



app.route("/")
  .get(function(req, res) {
    res.render('home');

  })

// app.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile'] }));

app.route("/auth/google")
  .get(
    passport.authenticate("google", {
      scope: ["profile"]
    })
  )

// app.get('/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/secrets');
//   });

app.route("/auth/google/secrets")
  .get(
    passport.authenticate('google', {
      failureRedirect: "/login"
    }),
    function(req, res) {
      // Successful authentication, redirect to secret's page.
      res.redirect("/secrets");
    }
  )



app.route("/login")
  .get(function(req, res) {
    res.render('login');

  })

  .post(function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(error) {
      if (error) {
        console.log(error);
        res.redirect("/login")
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        })
      }


      // const username = req.body.username;
      // const password = req.body.password;
      //LEVEL 3 OF ENCRYPTION
      // const password = md5(req.body.password);

      //LEVEL 4 OF ENCRYPTION
      // User.findOne({email:username},function(error, foundUser){
      //   if (error) {
      //     console.log(error);
      //   } else {
      //     if (foundUser) {
      //       bcrypt.compare(password, foundUser.password, function(error, result) {
      //         if (result === true) {
      //           console.log(result);
      //           res.render("secrets");
      //         } else {
      //           console.log("error, password didnt match");
      //         }
      //       });
      //     }
      //   }
      // });

    });
  })


app.route("/register")
  .get(function(req, res) {
    res.render('register');

  })
  .post(function(req, res) {
    User.register({
      username: req.body.username
    }, req.body.password, function(error, user) {
      if (error) {
        console.log(error);
        res.redirect("/register")
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    });


    //LEVEL 4 OF ENCRYPTION
    //   bcrypt.hash(req.body.password, saltRounds, function(error, hash) {
    //     const newUser = new User({email: req.body.username ,password:hash
    //      });
    //     newUser.save(function(error){
    //       if (!error){
    //         res.render("secrets");
    //       }else{
    //         console.log(error);
    //       }
    //     });
    // });
    // LEVEL 3 OF ENCRYPTION
    // const newUser = new User({email: req.body.username ,password:
    //    // LEVEL 3 OF ENCRYPTION
    //    //md5(req.body.password)
    //
    //  });
    // newUser.save(function(error){
    //   if (!error){
    //     res.render("secrets");
    //   }else{
    //     console.log(error);
    //   }
    // })

  })

app.route("/secrets")
  .get(function(req, res) {
    User.find({"secret": {$ne:null}}, function(error,foundUser){
      if (error) {
        console.log(error);
      } else {
        if (foundUser) {
          res.render("secrets",{usersWithSecrets : foundUser});
        }
      }
    });
  })

  .post(function(req, res) {

  })

app.route("/submit")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.render("/login");
    }
  })
  .post(
    function(req,res){
    const submittedSecret = req.body.secret
    console.log(req.user.id);
    User.findById(req.user.id, function(error,foundUser){
      if (error) {
        console.log(error);
      } else {
        if (foundUser){
          foundUser.secret = submittedSecret
          foundUser.save(function(){
            res.redirect("/secrets")
          });
        }
      }
    });
    })

app.route("/logout")
  .get(function(req, res, next) {
    req.logOut(function(error) {
      if (error) {
        return next(error);
      }
      res.redirect("/");
    });



  })

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
