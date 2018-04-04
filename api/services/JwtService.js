var jwt = require('jsonwebtoken');

module.exports = {
    issue: payload=>{
        return jwt.sign(payload,Secrets.jwtSecret,{expiresIn: 60*60} )
    },
    verify: (token,callback)=>{
        return jwt.verify(token,Secrets.jwtSecret,callback);
    }
}
