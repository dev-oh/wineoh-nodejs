var stream = require('getstream');
var CREDS = require('./../../config/secrets/creds');
var client = stream.connect(CREDS.getstreamCreds.key, CREDS.getstreamCreds.secret, CREDS.getstreamCreds.appId);
module.exports = {
    addActivity: (user,activity)=>{
        user = client.feed('user',user);
        user.addActivity(activity,(err,httpResponse,body)=>{
            if(err) return console.log(err)
            console.log('Activity added');
        });
    },
    addNotification: (user,activity)=>{
        notification  = client.feed('notification',user);
        notification.addActivity(activity,(err,httpResponse,body)=>{
            if(err) return console.log(err)
            console.log('Notification added');
        });
    },
    follow: (masterGroup,masterId,slaveGroup,slaveId)=>{
    	var slave = client.feed(slaveGroup,slaveId);
    	slave.follow(masterGroup,masterId);
    }
}