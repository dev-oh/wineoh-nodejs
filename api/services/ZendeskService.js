var creds = require('./../../config/secrets/creds');
var jwt = require('jwt-simple');
var uuid = require('uuid');
module.exports = {
    getUrl:(email,name)=> {
        var payload = {
            iat: (new Date().getTime() / 1000),
            jti: uuid.v4(),
            email: email,
            name: name
        }
        var token = jwt.encode(payload, creds.zendeskCreds.ssoToken);
        return 'https://wine-oh.zendesk.com/access/jwt?jwt=' + token
    }

}