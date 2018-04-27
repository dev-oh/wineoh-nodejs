var jsforce = require('jsforce');
var conn = new jsforce.Connection();
var Creds = require('./../../config/secrets/creds');
module.exports = {
    convertLead: (id,accountId)=>{
        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            var convertLeadRequest = [{
                convertedStatus: 'Converted',
                leadId: id
            }]
            if(accountId) convertLeadRequest[0].accountId = accountId;
            console.log(convertLeadRequest);
            // return
            conn.soap.convertLead(convertLeadRequest,(error,response)=>{
                if(error) return console.log(error);
                return console.log(response);
            })
        });
    }
};