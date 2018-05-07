var stream = require('getstream');
var client = stream.connect('7aqzuqp68fjs', '5haxgn84yud2frugn2c569h9t9xd3x82q9s9wuarfw8qv4gqkkyxf82s43s5a5wx', '36596');
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
    }
}