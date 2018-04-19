"use strict";

var jsforce = require('jsforce');
var Creds = require('./../../config/secrets/creds');
module.exports = {
    createLead: (req, res) => {
        var user = {
            LastName: req.body.lastName,
            FirstName: req.body.firstName || '',
            RecordTypeId: req.body.recordTypeId ||  '01228000000SbEwAAK',
            Company: req.body.company,
            Email: req.body.email,
            Website: req.body.domain,
            Status: 'Interest',
            ART__c: req.body.type,
            LeadSource: 'Website'
        };
        var conn = new jsforce.Connection();
        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            if (error) return sails.log.error(error);
            var records = [];
            conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                if (err) {
                    return console.error(err);
                }
                if (result.totalSize) {
                    console.log("Lead Found")
                    result = result.records[0];
                    user.Id = result.Id;
                    console.log(user);
                    conn.sobject("Lead").update(user, function (err, ret) {
                        if (err || !ret.success) {
                            console.log(err.code)
                            return console.error(err, ret);
                        }
                        console.log("Created record id : " + ret.id);
                        SegmentService.identifyTrait(ret.id, user);
                        SegmentService.track(ret.id, "Lead Updated", user.Email);
                        return res.ok(ret);
                    });
                } else {
                    console.log("Lead Not Found")
                    conn.sobject("Lead").create(user, function (err, ret) {
                        if (err || !ret.success) {
                            console.log(err.code)
                            return console.error(err, ret);
                        }
                        console.log("Created record id : " + ret.id);
                        FullContactService.call(user.Email);
                        SegmentService.identifyTrait(ret.id, user);
                        SegmentService.track(ret.id, "Lead Added", user.Email);
                        return res.ok(ret);
                    });
                }
            });
        })
    },
    acceptToS: (req,res)=>{
        var conn = new jsforce.Connection();
        var user = {
            Email: req.body.email,
            TOSAcceptanceDate__c: Date.now(),
            TOSAcceptanceIP__c: req.ip
        }

        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                console.log('Data Selected');
                if (!result.totalSize) return res.ok('User Not Found','NOT_FOUND','FAIL');
                result = result.records[0];
                user.Id = result.Id;
                console.log(user);
                SegmentService.trackBy(user.Id,'TOS Accepted',{Id: user.Id,Email: user.Email});
                conn.sobject("Lead").update(user, function (err, ret) {
                    if(err) return res.ok(err,'ERROR','FAIL');
                    return res.ok(ret)
                });
            });
        });
    }
}