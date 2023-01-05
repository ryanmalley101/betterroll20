//var userAttributes = getUserProfile();
//console.log(userAttributes);

const UserProfileAttributes = {
    Gender: "gender",
    UserName: "preferred_username",
    Email: "email",
    //EmailVerified: "email_verified",
    FullName: "name"
}

function initUserAttributes() {
    console.log("Getting and assigning user attribute values")
    getUserProfile(function(result) {
        console.log(result);
        if (result == null) {
            console.log('Couldnt get user attributes');
            return;
        }
        for (i = 0; i < result.length; i++) {
            console.log(result[i].getName());
            if(document.getElementById(result[i].getName()) != null) {
                document.getElementById(result[i].getName()).value = result[i].getValue();
            }
        }
    });
}

function sendUserAttributeUpdate() {
    var attributeList = [];
    for (const property in UserProfileAttributes) {
        if(document.getElementById(property) != null) {
            var attribute = {
                Name : property,
                Value : document.getElementById(property).value
            };
            attribute = new AmazonCognitoIdentity.CognitoUserAttribute(attribute);
            attributeList.push(attribute)
        }
    }
    updateUserAttributes(attributeList);
}

window.addEventListener('DOMContentLoaded', event => {
    initUserAttributes();
});