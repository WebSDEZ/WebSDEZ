const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DataBase      = require('./idataBase');
const db            = new DataBase();

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {

    db.getUserById(id, (user) => {
        done(null, user);
    });
});

passport.use('local-login', new LocalStrategy({ usernameField: 'login' }, function(login, password, done) {
    db.getUserByLogin(login, (user) => {
        if (user) {
            if (login === user.login && password === user.password) {
                return done(null, user);
            }
        }

        return done(null, false); 
    });
}));

passport.use('local-register', new LocalStrategy({ usernameField: 'login' }, function(login, password, done) {

    // check valid of password and login
    if (login == "" || password == "") {
        console.log('invalid login or password');
        return done(null, false);
    }
    else {
        // check if user with such login already exists
        db.isUserExist(login, (isExist) => {
            if (isExist == true) {
                console.log('user already exists');
                return done(null, false);
            }
            else {
                // adding user in database
                db.createUser(login, password, (err) => {
                    if (err) {
                        // some error in database when adding user
                        console.log(`user [${login}] was created`);
                        return done(null, false);
                    }
                    else {
                        // accept registration and do login
                        db.getUserByLogin(login, (user) => {
                            if (user) {
                                if (login === user.login && password === user.password) {
                                    return done(null, user);
                                }
                            }
                    
                            return done(null, false); 
                        });
                    }
                });
            }
        });
    }
}));