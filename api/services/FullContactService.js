"use strict";
var jsforce = require('jsforce');
var soap = require('soap');
const url = 'config/secrets/FullContactWebService.wsdl.xml';
var creds = require('./../../config/secrets/creds')
var connection = new jsforce.Connection();
module.exports = {
    call: email => {
        connection.login(creds.salesforceCreds.email, creds.salesforceCreds.password, (error, response) => {
            if (error) return sails.login.error(error);
            const sessionId = connection.accessToken;
            soap.createClient(url, (error, client) => {
                if (error) return sails.log.error(error);
                client.addSoapHeader({
                    SessionHeader: {
                        sessionId: sessionId
                    }
                })
                client.createLead({email: email}, (error, response, body) => {
                    if (error) return sails.log.error(error);
                    sails.log.info(body)
                })
            })
        })
    }
}