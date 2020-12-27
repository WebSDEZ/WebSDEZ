var chats       = document.getElementById('chats');
const input     = document.getElementById('newChat');
const form      = document.getElementById('form');
const username  = document.getElementById('name_username');
const chatlist  = document.getElementsByClassName('chat');

// Go to chat page for a certain idChat
function goToChatListener(chat) {
    chat.addEventListener('click', () => {
        console.log('go to chat event')
        const idChat = parseInt(chat.firstChild.nextSibling.innerHTML);
        window.location = `/after_auth/chat?idChat=${idChat}`;
    }, false);
}

// Create new chat in page as a simple div block
function newChat(idChat, topic) {
    const div = document.createElement('div');
    div.className = 'chat';

    const deleteDiv = document.createElement('div');
    deleteDiv.className = 'cl-btn-7';
    div.appendChild(deleteDiv);

    const idChatDiv = document.createElement('div');
    idChatDiv.innerHTML = idChat;
    idChatDiv.style = 'display: none';
    div.appendChild(idChatDiv);

    const p = document.createElement('p');
    p.innerHTML = topic;
    div.appendChild(p);

    delBtnListener(deleteDiv);
    goToChatListener(div);
    return div;
}


// REMOVE CHAT from DB
// remove chat from page
function delBtnListener(delBtn) {
    delBtn.addEventListener('click', (event) => {

        console.log('delete event')
        // get idChat somehow
        const idChat = parseInt(delBtn.nextSibling.innerHTML);
        
        // try to remove chat (or leave only) from db
        deleteChatInDB(idChat, (chatDeleteInfo) => {
            if (chatDeleteInfo.status == 'ok') {
                delBtn.parentElement.remove();
            }
        });

        // it disallows events bubbling, and this event
        // won't go to chat-block
        event.stopPropagation();
    }, false);
}

function deleteChatInDB(idChat, callback) {
    // request in json
    let requestBody = JSON.stringify({
        "method": "deleteChat",
        "idChat": idChat
    });
    let request = new XMLHttpRequest();

    // send async request to server
    request.open("POST", "/after_auth", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.addEventListener("load", () => {
        const chatDeleteInfo = JSON.parse(request.responseText);
        callback(chatDeleteInfo);
    });

    request.send(requestBody);
}


function validateTopic(topic) {
    topic = topic.trim();
    if (topic.length > 20) {
        topic = topic.substring(0, 20);
    }

    return topic;
}

// CREATE CHAT in DB
// show chat at page
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const topic = validateTopic(input.value);

    if (topic != "") {
        // try to create a chat in db, get status
        createChatInDB(topic, (chatCreateInfo) => {
            if (chatCreateInfo) {
                // if status == ok, then show chat at page
                if (chatCreateInfo.status == 'ok') {
                    chats.insertBefore(newChat(chatCreateInfo.idChat, topic), form);
                }
            }
        });
    }

    input.value = '';
});

function createChatInDB(topic, callback) {
    // request in json
    let requestBody = JSON.stringify({
        "method": "createChat",
        "topic": topic
    });
    let request = new XMLHttpRequest();

    // send async request to server
    request.open("POST", "/after_auth", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.addEventListener("load", () => {
        const chatCreateInfo = JSON.parse(request.responseText);
        callback(chatCreateInfo);
    });

    request.send(requestBody);
}


// Show chat list at page
function showChatList() {
    getChatListFromDB((chatlistinfo) => {
        if (chatlistinfo.status == 'ok') {
            const idChatList = chatlistinfo.idChatList;
            const topicList = chatlistinfo.topicList;
            
            for (let i = 0; i < topicList.length; i++) {
                chats.insertBefore(newChat(idChatList[i], topicList[i]), form);
            }
        }
    });
}

function getChatListFromDB(callback) {
    // request in json
    let requestBody = JSON.stringify({
        "method": "getChatList"
    });
    let request = new XMLHttpRequest();

    // send async request to server
    request.open("POST", "/after_auth", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.addEventListener("load", () => {
        const chatlistinfo = JSON.parse(request.responseText);
        callback(chatlistinfo);
    });

    request.send(requestBody);
}

function showName() {

    // request in json
    let requestBody = JSON.stringify({
        "method": "getName"
    });
    let request = new XMLHttpRequest();

    // send async request to server
    request.open("POST", "/after_auth", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.addEventListener("load", () => {

        const userinfo = JSON.parse(request.responseText);
        username.innerText = userinfo.username;
    });

    request.send(requestBody);
}

// load page data
showName();
showChatList();