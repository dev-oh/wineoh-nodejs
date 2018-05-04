var config = require('./../../config/config').firebaseConfig;

var firebase = require('firebase')
var app = firebase.initializeApp(config)


var admin = require('firebase-admin');
var serviceAccount = require('./../../config/secrets/web-app-a4b10-firebase-adminsdk-thm4u-3866942305.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://web-app-a4b10.firebaseio.com'
});
var db = admin.database();

module.exports = {
    createUserViaEmail: (email,name)=>{
      return admin.auth().createUser({
          email: email,
          displayName: name
      });
    },
    getUser: (email)=>{
        return admin.auth().getUserByEmail(email);
    },
    createUserViaUid: (uid, data) => {
        console.log("Creating User");
        db.ref('users/' + uid).set(data);
    },
    updateUser: (uid, data) => {
        db.ref('users/' + uid).update(data);
    },
    getUserFromDb: uid => {
        return db.ref('users/' + uid).once('value');
    },
    verifyIdToken: token => {
        return admin.auth().verifyIdToken(token);
    },
    mintCustomToken: uid => {
        return admin.auth().createCustomToken(uid);
    },
    deleteUser: uid=>{
        return admin.auth().deleteUser(uid);
    }
}