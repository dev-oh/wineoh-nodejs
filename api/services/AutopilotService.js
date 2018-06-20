var CREDS = require('./../../config/secrets/creds');
var request = require('request');

module.exports = {
    startJourny: (id,type)=>{
        var triggerId = '0002';
        if(type === 'customer') triggerId = '0003';
        request({
            method: 'POST',
            url: 'https://api2.autopilothq.com/v1/trigger/'+triggerId+'/contact/'+id,
            headers: {
                'autopilotapikey': CREDS.autopilotCreds.apiKey
            }}, function (error, response, body) {
            if(error) return sails.log.info('error while starting autopilot journey');
            console.log(body);
            if(response.statusCode === 200) return sails.log.info('started');
            return sails.log.info('autopilot journey startup fail');
        });
    }
};