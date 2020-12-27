const mysql = require('mysql2');


module.exports = class DataBase {

    constructor() {
        this.sqlConnection = mysql.createConnection({
            host     : '127.0.0.1',
            user     : 'root',
            password : 'admin',
            database : 'SuperDB'
        });
    }

    createUser(login, password, callback) {

        this.sqlConnection.query(
            'INSERT INTO users(username) VALUES(?);',
            [login],
            (err, rows, fields) => {
                if (err) {
                    console.log(err);
                    callback(err);
                }
                else {
                    const idUser = rows.insertId;

                    console.log('createUser: got idUser ' + idUser);

                    this.sqlConnection.query(
                        'INSERT INTO auth(idUser, login, password) VALUES(?, ?, ?);',
                        [idUser, login, password],
                        (err, rows, fields) => {

                            console.log('createUser: insert user ');
                            callback(err);
                        });
                }
            }
        );
    }

    getUserByLogin(login, callback) {
        this.sqlConnection.query(
            'SELECT id, login, password, username, age, sex, dateOfBirth, hobbies FROM users ' +
            'INNER JOIN auth ' +
            'ON users.id = auth.idUser ' +
            'WHERE auth.login = ?;',
            [login],
            (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                if (rows[0]) {
                    const user = {
                        id          : rows[0].id,
                        login       : rows[0].login,
                        password    : rows[0].password,
                        username    : rows[0].username,
                        age         : rows[0].age,
                        sex         : rows[0].sex,
                        dateOfBirth : rows[0].dateOfBirth,
                        hobbies     : rows[0].hobbies
                    }

                    callback(user);
                }
                else {
                    callback(undefined);
                }
            });
    }

    getUserById(id, callback) {
        this.sqlConnection.query(
            'SELECT id, login, password, username, age, sex, dateOfBirth, hobbies FROM users ' +
            'INNER JOIN auth ' +
            'ON users.id = auth.idUser ' +
            'WHERE id = ?;',
            [id],
            (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                if (rows[0]) {

                    const user = {
                        id          : rows[0].idUser,
                        login       : rows[0].login,
                        password    : rows[0].password,
                        username    : rows[0].username,
                        age         : rows[0].age,
                        sex         : rows[0].sex,
                        dateOfBirth : rows[0].dateOfBirth,
                        hobbies     : rows[0].hobbies
                    }

                    callback(user);
                }
                else {
                    callback(undefined);
                }
            });
    }

    setUserById(idUser, profileInfo, callback) {
        this.sqlConnection.query(
            'UPDATE users SET ' + 
            'username = ?, ' + 
            'age = ?, ' + 
            'sex = ?, ' + 
            'dateOfBirth = ?, ' + 
            'hobbies = ? ' + 
            'WHERE id = ?;',
            [profileInfo.username,
            profileInfo.age,
            profileInfo.sex,
            profileInfo.dateOfBirth,
            profileInfo.hobbies,
            idUser],
            (err, rows, fields) => {
                callback(err);
            }
        );
    }

    isUserExist(login, isExist) {
        this.sqlConnection.query(
            'SELECT * FROM auth WHERE login = ?;',
            [login],
            (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }
                else {
                    if (rows[0]) {
                        isExist(true);
                    }
                    else {
                        isExist(false);
                    }
                }
            }
        );
    }

    createChat(login, topic, callback) {

        this.getUserByLogin(login, (user) => {

            if (!user) return callback(undefined);

            this.sqlConnection.query(
                'INSERT INTO chats(topic) VALUES(?);',
                [topic],
                (err, rows, fields) => {
                    if (err) {
                        console.log(err);
                        callback(err);
                    }
                    else {
                        const insertedIdChat = rows.insertId;

                        this.addChatMember(user.id, insertedIdChat, (err) => {
                            if (err) {
                                callback(err);
                            }
                            else {
                                const chat = {
                                    idChat: insertedIdChat,
                                    topic: topic
                                }

                                callback(chat);
                            }
                        })
                    }
                }
            );
        });
    }

    addChatMember(idUser, idChat, callback) {
        this.sqlConnection.query(
            'INSERT INTO chatmembers(idChat, idUser) VALUES(?, ?);',
            [idChat, idUser],
            (err, rows, fields) => {
                callback(err);
            });
    }

    getChatList(login, callback) {

        this.getUserByLogin(login, (user) => {
            if (!user) return callback(undefined);

            this.sqlConnection.query(
                'SELECT idChat, topic FROM chatmembers INNER JOIN chats ON chats.id = chatmembers.idChat WHERE idUser = ?;',
                [user.id],
                (err, rows, fields) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        let idChatList = [];
                        let topicList = [];

                        for (let i = 0; i < rows.length; i++) {
                            idChatList.push(rows[i].idChat);
                            topicList.push(rows[i].topic);
                        }

                        const chatlist = {
                            idChatList: idChatList,
                            topicList: topicList
                        }

                        callback(chatlist);
                    }
                }
            );
        });
    }

    getChatMembers(idChat, callback) {

        const dbreq = "SELECT users.id, login, username, idChat, topic FROM users " +
                      "INNER JOIN chatmembers " +
                      "INNER JOIN chats " +
                      "INNER JOIN auth " +
                      "ON users.id = chatmembers.idUser " + 
                      "AND chatmembers.idChat = chats.id " +
                      "AND auth.idUser = users.id " +
                      "WHERE idChat = ?;"

        this.sqlConnection.query(
            dbreq,
            [idChat],
            (err, rows, fields) => {
                if (err) {
                    callback(err);
                }
                else {
                    if (rows.length <= 0) return callback(undefined);

                    let idUserList      = [];
                    let usernameList    = [];
                    let loginList       = [];
                    let topic           = rows[0].topic;

                    for (let i = 0; i < rows.length; i++) {
                        idUserList.push(rows[i].id);
                        usernameList.push(rows[i].username);
                        loginList.push(rows[i].login);
                    }

                    const chatMembers = {
                        idChat       : idChat,
                        topic        : topic,
                        idUserList   : idUserList,
                        loginList    : loginList,
                        usernameList : usernameList
                    }

                    callback(chatMembers);
                }
            }
        );
    }

    deleteMember(login, idChat, callback) {

        this.getUserByLogin(login, (user) => {
            if (!user) return callback(undefined);

            this.getChatMembers(idChat, (members) => {

                if (!members) return callback(undefined);

                let membersCount = members.idUserList.length;

                if (membersCount > 1) {
                    this.leaveChat(user.id, idChat, (wasDeleted) => {
                        if (wasDeleted) return callback(true);
                        return callback(false);
                    });
                }
                else {
                    this.deleteChat(idChat, (wasDeleted) => {
                        if (wasDeleted) return callback(true);
                        return callback(false);
                    });
                }
            });
        });

    }

    leaveChat(idUser, idChat, callback) {
        this.sqlConnection.query(
            'DELETE FROM chatmembers WHERE idUser = ? AND idChat = ?;',
            [idUser, idChat],
            (err, results) => {  
                if (err) return callback(false);
                if (results.affectedRows > 0) return callback(true);                
            }
        );
    }

    deleteChat(idChat, callback) {
        this.sqlConnection.query(
            'DELETE FROM chats WHERE id = ?;',
            [idChat],
            (err, results) => {  
                if (err) return callback(false);
                if (results.affectedRows > 0) return callback(true);                
            }
        );
    }

    isMemberOfChat(login, idChat, callback) {

        this.getUserByLogin(login, (user) => {
            if (!user) return callback(undefined);

            this.sqlConnection.query(
                'SELECT * FROM chatmembers WHERE idUser = ? AND idChat = ?;',
                [user.id, idChat],
                (err, rows, fields) => {
                    if (err) {
                        return callback(false);
                    }
                    else {
                        if (rows[0]) {
                            callback(true);
                        }
                        else {
                            callback(false);
                        }
                    }
                }
            );
        });
    }

    getChatMessages(idUser, idChat, callback) {

        const dbreq = "SELECT date, idUser, username, text FROM messages " +
                      "INNER JOIN users " +
                      "ON messages.idUser = users.id " +
                      "WHERE idChat = ? " +
                      "ORDER BY date;"

        this.sqlConnection.query(
            dbreq,
            [idChat],
            (err, rows, fields) => {
                if (err) {
                    callback(err);
                }
                else {
                    let isUserMsgList = [];
                    let dateList      = [];
                    let usernameList  = [];
                    let messageList   = [];

                    for (let i = 0; i < rows.length; i++) {
                        // define if a msg belongs to user
                        isUserMsgList[i] = rows[i].idUser == idUser;
                        dateList.push(rows[i].date);
                        usernameList.push(rows[i].username);
                        messageList.push(rows[i].text);
                    }

                    const chatMessages = {
                        isUserMsgList : isUserMsgList,
                        dateList      : dateList,
                        usernameList  : usernameList,
                        messageList   : messageList
                    }

                    callback(chatMessages);
                }
            }
        );
    }

    addMessage(idUser, idChat, date, text, callback) {
        this.sqlConnection.query(
            'INSERT INTO messages(idChat, idUser, date, text) VALUES(?, ?, ?, ?);',
            [idChat, idUser, date, text],
            (err, rows, fields) => {
                if (err) {
                    console.log(err);
                    callback(false);
                }
                else {
                    callback(true)
                }
            });
    }
}