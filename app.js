const express      = require('express');
const passport     = require('passport');
const jwt          = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const webSocket    = require('ws');

const JWT_SECRET = "somesecretkey";

const app = express();

app.use(cookieParser());
app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

require('./authHandler');
app.use(passport.initialize());

app.post('/login', (req, res, next) => {
    passport.authenticate('local-login', { session: false }, (err, user) => {
        if (err) { 
            return next(err);
        }

        if (!user) {
            return res.redirect('/auth'); 
        }

        req.logIn(user, { session: false }, (err) => {
            if (err) { 
                return next(err); 
            }

            const payload = { login: user.login, idUser: user.id }
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: 60 * 5 });
            res.cookie('token', token, { httpOnly: true });
            console.log(token);

            res.redirect('/after_auth');
        });

    })(req, res, next);
});

app.post('/register', (req, res, next) => {
    passport.authenticate('local-register', function(err, user) {
        if (err) { 
            return next(err);
        }

        if (!user) {
            return res.redirect('/auth'); 
        }

        req.logIn(user, function(err) {
            if (err) { 
                return next(err); 
            }

            const payload = { login: user.login, idUser: user.id }
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: 60 * 10 });
            res.cookie('token', token, { httpOnly: true });
            console.log(token);

            return res.redirect('/after_auth');
        });

    })(req, res, next);
});


const auth = (req, res, next) => {
    if (!req.cookies['token']) {
        return res.redirect('/auth');
    }

    const token = req.cookies['token'];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            res.clearCookie['token'];
            return res.redirect('/auth');
        }

        next();
    });
}

const userLogin = (req, callback) => {
    if (!req.cookies['token']) {
        callback(undefined);
    }

    const token = req.cookies['token'];
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        console.log(decodedUser);
        callback(decodedUser);
    });
}

const notAuth = (req, res, next) => {
    if (req.cookies['token']) {
        const token = req.cookies['token'];
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) {
                return res.redirect('/after_auth');
            }
        });
    }

    next();
}

app.get('/', (req, res) => {
    res.redirect('/auth');
});

app.get('/auth', notAuth, (req, res) => {
    res.sendFile(__dirname + '/public/authorization.html');
});

app.get('/reg', notAuth, (req, res) => {
    res.sendFile(__dirname + "/public/registration.html");
});

app.get('/after_auth', auth, (req, res) => {
    res.sendFile(__dirname + '/public/chatlist.html');
});

const chatlistHandler = require('./chatlistHandler');
app.post('/after_auth', auth, (req, res) => {
    console.log(req.body);
    if (!req.body) return res.status(400);

    userLogin(req, (user) => {
        chatlistHandler(user.login, req.body, res);
    });
});

const chatHandler = require('./chatHandler');
app.get('/after_auth/chat', auth, (req, res) => {

    if (!req.body) return res.status(400);

    if (req.query.idChat) {

        userLogin(req, (user) => {

            const jsonReq = {
                "method" : "isMemberOfChat",
                "login"  : user.login,
                "idChat" : req.query.idChat
            }

            chatHandler(user, jsonReq, res);
        });
    }
});

app.get('/logout', (req, res) => {

    res.clearCookie('token');
    res.redirect('/auth');
});

const server = app.listen(8080, 'localhost', () => {
    console.log('server started');
});

const wsServer = new webSocket.Server({ server });
wsServer.on('connection', (ws, req) => {

    // trye to get token from client cookie
    if (!req.headers.cookie) {
        ws.close(1000, 'Cant find a token');
        return;
    }

    const token = req.headers.cookie.split('=')[1];
    if (!token) {
        ws.close(1000, 'Cant find a token');
        return;
    }

    // if got a token, then verify client, who wanna to connect
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        
        if (!decodedUser) {
            ws.close(1000, 'not authorized');
            return;
        }

        // send token to client
        const jsonResponse = JSON.stringify({
            "method"  : 'setToken',
            "token"   : token
        })
        ws.send(jsonResponse);

        ws.on('message', (message) => {

            const request = JSON.parse(message);
            if (!request) {
                ws.close(1000, 'not authorized');
                return;
            }

            // verify client who sent json with a token
            jwt.verify(request.token, JWT_SECRET, (err, decodedUser) => {
                
                if (!decodedUser) {
                    ws.close(1000, 'not authorized');
                    return;
                }
                
                // client auth succeed. Handle his request
                // (res is websocket client (ws))
                chatHandler(decodedUser, request, ws);
            });
        });

        ws.on('close', () => {
            console.log('Someone has closed connection');
        });
    });
});