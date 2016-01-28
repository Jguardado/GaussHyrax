var express = require('express');
var db = require('./db.js');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var GitHubStrategy = require('passport-github').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var env = require('node-env-file');




env(__dirname + '/.env' || process.env);

var sendgrid  = require('sendgrid')(process.env.SENDGRIDAPIKEY);
//__:github_:__
var GITHUB_CLIENT_ID = process.env.GITHUBCLIENTID;
var GITHUB_CLIENT_SECRET = process.env.GITHUBCLIENTSECRET;
//__:twitter:__
var TWITTER_CONSUMER_KEY = process.env.TWITTERAPIKEY;
var TWITTER_CONSUMER_SECRET = process.env.TWITTERSECRET;



console.log('\n\n\nHERE IS THE GITHUB CLIENT ID', process.env.GITHUBCLIENTID, '\n\n\n');

var port = process.env.PORT || 3000;

var app = express();

//

app.use(morgan('combined'));
app.use(express.static(__dirname + '/../client'));  //serve files in client
app.use(bodyParser.json());  // parse application/json
app.use(session({ secret: 'SECRET' }));
app.use(passport.initialize());
app.use(session());

//function to configure the standard response handler

var configHandler = function(successCode, failCode, res) {
  return function(err, data) {
    if (err) {
      res.status(failCode).send(err);
    } else {
      res.status(successCode).send(data);
    }
  };
};

/////////////////////////////
/////////Passport////////////
/////////////////////////////
var noobyGlobalVariable;
var noobyTwitterVariable;

passport.serializeUser(function(user, done) {
  console.log('SERIALIZE user: ', user)
  response = user.id || user
  done(null, response);
});

passport.deserializeUser(function(id, done) {
  console.log('deserialize');
  User.findById(id, function(err, user) {
    console.log('deserializing err', err);
    done(err, user);
  });
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'https://prsnl-2.herokuapp.com/auth/github/callback',
},
  function(accessToken, refreshToken, profile, done) {
    db.User.findOne({ userName: profile.username }, function(err, user) {
      if (user) {
        console.log('this is the user', user);
        noobyGlobalVariable = user;
        return done(null, user);
      } else {
        var user = new db.User();
        user.userName = profile.username;
        user.save(function(err, user) {
          if (err) {
            console.log('error in saving');
            return done(null, false);
          } else {
            noobyGlobalVariable = user;
            console.log(user + ' was saved');
            return done(null, user);
          }
        });
      }
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    db.User.find({ twitterId: profile.id }, function (err, user) {
      noobyTwitterVariable = user;
      console.log('TWITTER STRATEGY USER: ', user, '\nERROR: ', err)
      return done(err, user);
    });
  }
));

//////////////////////////////////////////
//CREATE
//////////////////////////////////////////

//save a user to DB
app.post('/api/user', function(req, res, next) {
  db.addUser(req.body, configHandler(201, 400, res));
})

//add new family member to user
.post('/api/family/:userId', function(req, res, next) {
  db.addFamilyMember(req.params, req.body, configHandler(201, 400, res));
  console.log('\n\n\nWE HAVE ADDED A USER\n\n\n');
})

//add new history to user's family member
.post('/api/history/:userId/:familyId', function(req, res, next) {
  db.addHistory(req.params, req.body, configHandler(201, 400, res));
})

//////////////////////////////////////////
//READ
//////////////////////////////////////////
.post('/api/grid',function(req,res,next){
    console.log('\n\n\nREQUEST RECIEVED:', req.body, '\n\n\n');

    var email = req.body.theEmail;
    var message = req.body.theMessage;

    sendgrid.send({
    to:       email,
    from:     'diyelpin@gmail.com',
    subject:  'GOT EM',
    text:     message,
  }, function(err, json) {
    if (err) { return console.error(err); }
      console.log(json);
  });
})

//passport github //
///////////////////
.get('/auth/github',
  passport.authenticate('github'))

.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', scope: ['user:email'] }),
  function(req, res) {
    console.log('before redirecting');

    // Successful authentication, redirect home.
    console.log('data after authentication', noobyGlobalVariable);

    // res.send(noobyGlobalVariable);
    res.redirect('/#/dashboard');
  })
.get('/githubinfo', function(req, res) {
  console.log('githubinfo', noobyGlobalVariable);
  if (noobyGlobalVariable) {
    res.status(200).send(noobyGlobalVariable);
  } else {
    res.status(404).send();
  }
})
//////////////////////
// passport twitter //
//////////////////////

.get('/auth/twitter',
  passport.authenticate('twitter'))

.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login', scope: ['user:email'] }),
  function(req, res) {
    console.log('before redirecting');

    // Successful authentication, redirect home.
    console.log('data after authentication', noobyTwitterVariable);

    // res.send(noobyGlobalVariable);
    res.redirect('/#/dashboard');
  })
.get('/twitterinfo', function(req, res) {
  console.log('twitterinfo', noobyTwitterVariable);
  if (noobyTwitterVariable) {
    res.status(200).send(noobyTwitterVariable);
  } else {
    res.status(404).send();
  }
})



// find a user
.get('/api/user/:userName/:password', function(req, res, next) {
  db.verifyUser(req.params, configHandler(200, 404, res));
})

//get all family info for a user
.get('/api/family/:userId', function(req, res, next) {
  db.getAllFamily(req.params, configHandler(200, 400, res));
})

//get a single family member
.get('/api/family/:userId/:familyId', function(req, res, next) {
  db.getSingleFamilyMember(req.params, configHandler(200, 400, res));
})

//get all actions
.get('/api/actions', function(req, res, next) {
  db.getAllActions(configHandler(200, 400, res));
})

//////////////////////////////////////////
//UPDATE
//////////////////////////////////////////

//update family member
.put('/api/family/:userId/:familyId', function(req, res, next) {
  db.updateFamilyMember(req.params, req.body, configHandler(201, 400, res));
})

//update history member
.put('/api/history/:userId/:familyId/:historyId', function(req, res, next) {
  db.updateHistory(req.params, req.body, configHandler(201, 400, res));
})

//////////////////////////////////////////
//DELETE
//////////////////////////////////////////

//delete family member
.delete('/api/family/:userId/:familyId', function(req, res, next) {
  db.deleteFamilyMember(req.params, configHandler(201, 400, res));

})

//delete history
.delete('/api/history/:userId/:familyId/:historyId', function(req, res, next) {
  db.deleteHistory(req.params, configHandler(201, 400, res));
});

app.listen(port);
console.log('server listening on port ' + port + '...');
