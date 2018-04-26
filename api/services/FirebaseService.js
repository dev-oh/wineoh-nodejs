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
    createUser: token=>{
        console.log("Creating User");
        admin.auth().verifyIdToken(token)
            .then(decodedToken=>{
                db.ref('users/' + decodedToken.uid).set({
                    name: decodedToken.name,
                    email: decodedToken.email,
                    picture: decodedToken.picture,
                });
            }).catch(error=>{
            console.log(error)
        })
    },
    updateUser: (uid,data)=>{
        db.ref('users/'+uid).update(data);
    },
    getUser: uid=>{
        return db.ref('users/'+uid).once('value');
    },
    verifyIdToken: token=>{
        return admin.auth().verifyIdToken(token);
    },
    mintCustomToken: uid=>{
        return admin.auth().createCustomToken(uid);
    }
}