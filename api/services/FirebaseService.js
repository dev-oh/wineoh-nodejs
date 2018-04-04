var config = require('./../../config/config').firebaseConfig
require('firebase/auth');
require('firebase/database');

var firebase = require('firebase')
var app = firebase.initializeApp(config)


var admin = require('firebase-admin');
var serviceAccount = require('./../../config/secrets/web-app-a4b10-firebase-adminsdk-thm4u-3866942305.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://web-app-a4b10.firebaseio.com'
});

module.exports = {
    createNewUser: (email, password)=>{
        return new Promise((resolve,reject)=>{
            app.auth().createUserWithEmailAndPassword(email,password)
                .then(response=>{
                    response.sendEmailVerification();
                    return resolve(response);
                }).catch(error=>{
                    return reject(error)
            })
        });
    },
    verifyIdToken: token=>{
        return admin.auth().verifyIdToken(token);
    }
}