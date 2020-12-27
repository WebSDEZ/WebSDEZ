const profile      = document.getElementById('popup-fade');
const profileClose = document.getElementById("popup-close");


function getProfileInfo(idUser, login) {
    console.log("YOU CLICKED TO OPEN PROFILE: " + idUser + " " + login);

    if (idUser) {

        if (!TOKEN) throw "unknown token: " + TOKEN;

        const jsonRequest = JSON.stringify({
            "method"  : "getProfileInfo",
            "token"   : TOKEN,
            "idUser"  : idUser
        })

        ws.send(jsonRequest);
    }
}

function openProfile(profileInfo, isInfoBelongsToUser) {
    const username = document.getElementById('username');
    const age      = document.getElementById('age');
    const sex      = document.getElementById('sex_input');
    const birth    = document.getElementById('birth');
    const saveBtn  = document.getElementById('saveProfile');
    const hobbies  = document.getElementById('hobbies');
    
    username.value = profileInfo.username;
    age.value      = profileInfo.age;
    sex.value      = profileInfo.sex;
    birth.value    = formatDate(profileInfo.dateOfBirth).slice(0, 10); // only yy-mm-dd
    hobbies.value  = profileInfo.hobbies;

    if (isInfoBelongsToUser == false) {
        username.setAttribute('disabled', 'disabled');
        age.setAttribute('disabled', 'disabled');
        sex.setAttribute('disabled', 'disabled');
        birth.setAttribute('disabled', 'disabled');
        hobbies.setAttribute('disabled', 'disabled');
        saveBtn.style = "display: none";
        
        // if eventListener still listens to this button, then do
        // the hack:
        let newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    }
    else {
        username.removeAttribute('disabled');
        age.removeAttribute('disabled');
        sex.removeAttribute('disabled');
        birth.removeAttribute('disabled');
        hobbies.removeAttribute('disabled');
        saveBtn.style = "display: block";

        saveBtn.addEventListener('click', (event) => {
            const jsonRequest = JSON.stringify({
                "method"        : "saveProfileInfo",
                "token"         : TOKEN,
                "username"      : username.value,
                "age"           : age.value,
                "sex"           : sex.value,
                "dateOfBirth"   : birth.value,
                "hobbies"       : hobbies.value
            })
    
            ws.send(jsonRequest);
        });
    }
    
    profile.style.display = "flex";
}

profileClose.addEventListener('click', (event) => {
    profile.style.display = "none";
});

window.onclick = function (event) {
    if (event.target == profile) {
        profile.style.display = "none";
    }
}