var config = require('./../../config/config').firebaseConfig
require('firebase/auth');
require('firebase/database');

var firebase = require('firebase')
var app = firebase.initializeApp(config)
module.exports = {
    createNewUser: (email, password)=>{
        return new Promise((resolve,reject)=>{
            app.auth().createUserWithEmailAndPassword(email,password)
                .then(response=>{
                    return resolve(response);
                }).catch(error=>{
                    return reject(error)
            })
        });
    }
}