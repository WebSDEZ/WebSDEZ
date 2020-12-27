const DataBase = require('./idataBase');
const db       = new DataBase();

module.exports = (login, req, res) => {
    if (!req || !login || !res)
        return undefined;

    const method = req.method;

    switch (method) {
        case 'getName':
            return handleGetName(login, req, res);

        case 'getChatList':
            return handleGetChatList(login, req, res);

        case 'createChat':
            return handleCreateChat(login, req, res);

        case 'deleteChat':
            return handleDeleteChat(login, req, res);
    }
}

function handleGetName(login, req, res) {
    db.getUserByLogin(login, (user) => {
        if (user) {
            const jsonResponse = {
                "username" : user.username
            }

            return res.json(jsonResponse);
        }
        
        return res.status(500);
    });
}

function handleGetChatList(login, req, res) {
    db.getChatList(login, (chatlist) => {

        if (chatlist) {
            const jsonResponse = {
                "status"     : "ok",
                "idChatList" : chatlist.idChatList,
                "topicList"  : chatlist.topicList
            }

            return res.json(jsonResponse);
        }

        return res.status(500);
    });
}

function handleCreateChat(login, req, res) {
    db.createChat(login, req.topic, (chat) => {
        if (chat) {
            const jsonResponse = {
                "status"    : "ok",
                "idChat"    : chat.idChat,
                "topic"     : req.topic
            }

            return res.json(jsonResponse);
        }

        return res.status(500);
    });
}

function handleDeleteChat(login, req, res) {
    db.deleteMember(login, req.idChat, (wasDeleted) => {
        if (wasDeleted) {
            const jsonResponse = {
                "status"    : "ok",
            }

            return res.json(jsonResponse);
        }

        return res.status(500);
    });
}