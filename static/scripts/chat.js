const btnSendMsg  = document.getElementById('btnSendMsg');
const members     = document.getElementById('members');
const messages    = document.getElementById('messages');
const form        = document.getElementById('form');
const memberForm  = document.getElementById('member-form');

const ws = new WebSocket('ws://localhost:8080');
var TOKEN = undefined;
var idChat = getParameter('idChat');

console.log(`got idChat: ${idChat}`);
function getParameter(parameterName) {
    let result = null;
    let tmp = [];
    let items = location.search.substr(1).split("&");
    for (let index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    }
    
    return result;
}

// EVENTS
ws.onopen = (event) => {
    console.log('Connection succeed');
}

ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    handleResponse(response);
    loadAllChatData();
}

ws.onclose = (event) => {
    if (event.wasClean) {
        console.log('close connection');
    }

    console.log(`Code: ${event.code} reason: ${event.reason}`);
    window.location = window.location;
}

ws.onerror = (error) => {
    console.log(`Error ${error.message}`);
}

btnSendMsg.addEventListener('click', (event) => {
    const input = document.getElementById('inputMsg');
    const text = input.value.trim();
    
    if (text != "") {

        const jsonRequest = JSON.stringify({
            "method"  : "sendMessage",
            "token"   : TOKEN,
            "idChat"  : idChat,
            "text"    : text
        })

        ws.send(jsonRequest);
    }

    input.value = '';
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    btnSendMsg.click();
});

memberForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('newUser');
    const login = input.value.trim();

    if (login != "") {

        const jsonRequest = JSON.stringify({
            "method"  : "inviteMember",
            "token"   : TOKEN,
            "idChat"  : idChat,
            "login"   : login
        })

        ws.send(jsonRequest);
    }

    input.value = '';
});

// REQUESTS
function loadAllChatData() {
    const jsonRequestName = JSON.stringify({
        "method" : "getName",
        "token"  : TOKEN,
    });

    ws.send(jsonRequestName);

    const jsonRequestMembers = JSON.stringify({
        "method" : "getChatMembers",
        "token"  : TOKEN,
        "idChat" : idChat
    });

    ws.send(jsonRequestMembers);

    const jsonRequestMessages = JSON.stringify({
        "method" : "getChatMessages",
        "token"  : TOKEN,
        "idChat" : idChat
    });

    ws.send(jsonRequestMessages);

    loadAllChatData = function(){};
};

// RESPONSE HANDLER
function handleResponse(response) {
    const method = response.method;

    switch (method) {
        case 'setToken' :
            TOKEN = response.token;
            break;

        case 'getName' :
            if (response.status == 'ok') {
                const username = document.getElementById('name_username');
                username.innerText = response.username;
            }
            break;

        case 'getChatMembers' :
            if (response.status == 'ok') {

                showChatTopic(response.topic);

                for (let i = 0; i < response.usernameList.length; i++) {
                    const idUser   = response.idUserList[i];
                    const username = response.usernameList[i];
                    const login    = response.loginList[i];
                    showChatMember(idUser, username, login);
                }
            }
            break;

        case 'getChatMessages' :
            if (response.status == 'ok') {
                for (let i = 0; i < response.usernameList.length; i++) {
                    const date     = response.dateList[i];
                    const username = response.usernameList[i];
                    const message  = response.messageList[i];
                    const isMsgBelongsToUser = response.isUserMsgList[i]; 
                    showChatMessage(date, username, message, isMsgBelongsToUser);
                }
            }
            break;

        case 'sendMessage' :
            const date     = response.date;
            const username = response.username;
            const message  = response.message;
            const isMsgBelongsToUser = response.isUserMsg; 
            showChatMessage(date, username, message, isMsgBelongsToUser);
            break;

        case 'inviteMember' :
            if (response.status == 'ok') {
                const idMember = response.idUser;
                const memberName = response.username;
                const memberLogin = response.login;
                showChatMember(idMember, memberName, memberLogin);
            }
            break;

        case 'getProfileInfo' :
            if (response.status == 'ok') {
                const profileInfo = {
                    username    : response.username,
                    age         : response.age,
                    dateOfBirth : response.dateOfBirth,
                    sex         : response.sex,
                    hobbies     : response.hobbies
                }
                
                console.log(profileInfo);
                // MODULE profile.js
                openProfile(profileInfo, response.isInfoBelongsToUser);
            }
            break;
    }
}

function showChatMember(idUser, username, login) {
    const member = document.createElement('li');
    member.className = 'member';
    
    const pUsername = document.createElement('p');
    pUsername.innerHTML = username;
    
    const pLogin = document.createElement('p');
    pLogin.innerHTML = login;
    
    member.appendChild(pUsername);
    member.appendChild(pLogin);

    members.insertBefore(member, memberForm.parentElement);

    // MODULE profile.js
    member.addEventListener('click', (event) => {
        // one of the parameters isn't obligatory
        // (method uses only idUser)
        getProfileInfo(idUser, login);
    });
}

function showChatTopic(topic) {
    document.getElementById('chat-topic').innerHTML = topic;
}

function showChatMessage(date, username, message, isMsgBelongsToUser) {
    const msg = document.createElement('li');
    if (isMsgBelongsToUser) msg.className = 'client-msg';

    const satellite = document.createElement('div');
    satellite.className = 'satellite-msg';

    const p = document.createElement('p');
    p.innerHTML = username;

    const time = document.createElement('time');
    time.innerHTML = formatDate(date);
    time.setAttribute('datetime', date);

    const text = document.createElement('p');
    text.innerHTML = message;

    satellite.appendChild(p);
    satellite.appendChild(time);

    msg.appendChild(satellite);
    msg.appendChild(text);

    messages.appendChild(msg);
    msg.scrollIntoView();
}

// TODO
function formatDate(mysql_timestamp)
{ 
    return new Date(mysql_timestamp)
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '');
}