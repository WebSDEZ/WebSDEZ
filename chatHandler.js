const { JsonWebTokenError } = require('jsonwebtoken');
const DataBase = require('./idataBase');
const db       = new DataBase();

const COLLECT_MILLISECONDS = 1000 * 60;
const usersMap = new Map();

module.exports = (user, req, res) => {
    if (!req || !user || !res)
        return undefined;


    const method = req.method;

    switch (method) {
        case 'isMemberOfChat':
            return isMemberOfChat(user, req, res);

        case 'getName':
            return handleGetName(user, req, res);

        case 'getChatMembers':
            return handleGetChatMembers(user, req, res);

        case 'getChatMessages':
            return handleGetChatMessages(user, req, res);

        case 'sendMessage':
            return handleSendMessage(user, req, res);

        case 'inviteMember':
            return handleInviteMember(user, req, res);

        case 'getProfileInfo':
            return handleGetProfileInfo(user, req, res);
        
        case 'saveProfileInfo':
            return handleSaveProfileInfo(user, req, res);
    }
}

// http
function isMemberOfChat(user, req, res) {
    db.isMemberOfChat(user.login, req.idChat, (isMember) => {

        if (isMember) {
            return res.sendFile(__dirname + '/public/chat.html');
        }

        return res.redirect('/after_auth');
    });
}

// websockets
function handleGetName(user, req, ws) {
    db.getUserByLogin(user.login, (usr) => {

        let jsonResponse = "";

        if (usr && ws.readyState == ws.OPEN) {
            jsonResponse = JSON.stringify({
                "status"   : 'ok',
                "method"   : req.method,
                "username" : usr.username
            });
        }
        else {
            jsonResponse = JSON.stringify({
                "status"   : 'error',
                "method"   : req.method
            });
        }

        ws.send(jsonResponse);
    });
}

function handleGetChatMembers(user, req, ws) {

    TryAddToUserMap(req.idChat, user.idUser, ws);

    db.getChatMembers(req.idChat, (chatMembers) => {

        let jsonResponse = "";

        if (chatMembers && ws.readyState == ws.OPEN) {
            jsonResponse = JSON.stringify({
                "status"       : 'ok',
                "method"       : req.method,
                "idChat"       : chatMembers.idChat,
                "topic"        : chatMembers.topic,
                "idUserList"   : chatMembers.idUserList,
                "usernameList" : chatMembers.usernameList,
                "loginList"    : chatMembers.loginList
            });
        }
        else {
            jsonResponse = JSON.stringify({
                "status"   : 'error',
                "method"   : req.method
            });
        }

        ws.send(jsonResponse);
    });
}

function handleGetChatMessages(user, req, ws) {

    TryAddToUserMap(req.idChat, user.idUser, ws);

    db.getChatMessages(user.idUser, req.idChat, (messages) => {

        let jsonResponse = "";

        if (messages && ws.readyState == ws.OPEN) {
            jsonResponse = JSON.stringify({
                "status"        : 'ok',
                "method"        : req.method,
                "isUserMsgList" : messages.isUserMsgList,
                "dateList"      : messages.dateList,
                "usernameList"  : messages.usernameList,
                "messageList"   : messages.messageList
            });
        }
        else {
            jsonResponse = JSON.stringify({
                "status"   : 'error',
                "method"   : req.method
            });
        }

        ws.send(jsonResponse);
    });
}

function handleSendMessage(user, req, ws) {

    TryAddToUserMap(req.idChat, user.idUser, ws);

    db.getChatMembers(req.idChat, (chatMembers) => {

        const date = new Date()
            .toISOString()
            .replace(/T/, ' ')
            .replace(/\..+/, '');
        
        // send new message to database
        db.addMessage(user.idUser, req.idChat, date, req.text, (wasSent) => {}); 
        
        // send the message to all websockets connected to chat(idChat)
        if (chatMembers && ws.readyState == ws.OPEN) {
            if (usersMap.has(req.idChat)) {

                chatMembers.idUserList.forEach(idUser => {
                    if (usersMap.get(req.idChat).has(idUser)) {
                        usersMap.get(req.idChat).get(idUser).forEach(ws => {
                            // form json and send message
                            if (ws.readyState == ws.OPEN) {
                                const jsonResponse = JSON.stringify({
                                    "method"    : "sendMessage",
                                    "isUserMsg" : user.idUser === idUser ? 1 : 0,
                                    "date"      : date,
                                    "username"  : user.login,                           // <----- SHOULD BE FIXED TO USERNAME
                                    "message"   : req.text
                                });
            
                                ws.send(jsonResponse);
                            }
                            else {
                                // delete websocket from a set
                                usersMap.get(req.idChat).get(idUser).delete(ws);
                                if (usersMap.get(req.idChat).get(idUser).size == 0) {
                                    usersMap.get(req.idChat).delete(idUser);
                                }
                                ws.close();
                            }
                        });
                    }
                });
            }
        }
        else {
            const jsonResponse = JSON.stringify({
                "status"   : 'error',
                "method"   : req.method
            });

            ws.send(jsonResponse);
        }
    });
}

function TryAddToUserMap(idChat, idUser, ws) {
    // if it's a new chat
    if (!usersMap.has(idChat)) {
        const usersInChat = new Map();
        const websocketsOftheUser = new Set();
        websocketsOftheUser.add(ws);
        usersInChat.set(idUser, websocketsOftheUser);
        usersMap.set(idChat, usersInChat);
    }
    // if it's an old chat but a user with new idUser
    else { 
        if (!usersMap.get(idChat).has(idUser)) {
            const websocketsOftheUser = new Set();
            websocketsOftheUser.add(ws);
            usersMap.get(idChat).set(idUser, websocketsOftheUser);
        }
        // if it's an old chat, old user but a new websocket connection
        else {
            usersMap.get(idChat).get(idUser).add(ws);
        }
    }
}

function handleInviteMember(user, req, ws) {

    let jsonResponse = "";

    db.isMemberOfChat(user.login, req.idChat, (isMember) => {

        if (isMember) {
            db.getUserByLogin(req.login, (member) => {

                if (member) {
                    db.isMemberOfChat(member.login, req.idChat, (isMember) => {

                        if (isMember == false) {
                            db.addChatMember(member.id, req.idChat, (err) => {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    jsonResponse = JSON.stringify({
                                        "status"   : 'ok',
                                        "method"   : req.method,
                                        "idUser"   : member.id,
                                        "username" : member.username,
                                        "login"    : member.login
                                    });
                        
                                    ws.send(jsonResponse);
                                }
                            });
                        }
                    });
                }
            });
        }

        jsonResponse = JSON.stringify({
            "status"   : 'error',
            "method"   : req.method
        });

        ws.send(jsonResponse);
    });
}

function handleGetProfileInfo(user, req, ws) {

    db.getUserById(req.idUser, (profileInfo) => {

        let jsonResponse = "";

        if (!profileInfo) {
            jsonResponse = JSON.stringify({
                "status"   : 'error',
                "method"   : req.method
            });
        }
        else {

            jsonResponse = JSON.stringify({
                "status"              : 'ok',
                "method"              : req.method,
                "isInfoBelongsToUser" : user.idUser == req.idUser,
                "username"            : profileInfo.username,
                "age"                 : profileInfo.age,
                "dateOfBirth"         : profileInfo.dateOfBirth,
                "sex"                 : profileInfo.sex,
                "hobbies"             : profileInfo.hobbies
            });
        }
        
        ws.send(jsonResponse);
    });
}

function handleSaveProfileInfo(user, req, ws) {

    if (!req.username) req.username = "";
    if (!req.age) req.age = 0;
    if (!req.sex) req.sex = "";
    if (!req.hobbies) req.hobbies = "";

    db.setUserById(user.idUser, req, (err) => {
        if (err) throw "[ERROR] saveProfileInfo: " + err;
    });
}


// removes closed connections from userMap
function GarbageCollect() {

    for (let idChat of usersMap.keys()) {

        for (let idUser of usersMap.get(idChat).keys()) {

            usersMap.get(idChat).get(idUser).forEach(ws => {
                if (ws.readyState != ws.OPEN) {
                    usersMap.get(idChat).get(idUser).delete(ws);
                    ws.close();
                }
            });

            if (usersMap.get(idChat).get(idUser).size == 0) {
                usersMap.get(idChat).delete(idUser);
            }
        }

        if (usersMap.get(idChat).size == 0) {
            usersMap.delete(idChat);
        }
    }

    console.log('[GC] map was collected: ');
    console.log(usersMap);
}

setInterval(GarbageCollect, COLLECT_MILLISECONDS);