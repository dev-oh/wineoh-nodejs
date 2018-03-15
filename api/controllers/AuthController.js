/**
 * Created by Raheel on 1/31/2018.
 */
var _ = require('lodash');
var moment = require('moment');
var salsForceConfig = require('./../../config/config').salesForceConfig;
var segmentConfig = require('./../../config/config').segmentConfig;
var jsforce = require('jsforce');
var shortId = require('shortid');
var conn = new jsforce.Connection();

module.exports = {
    test: (req, res) => {
        res.ok("Works");
    },
    signUp: (req, res) => {
        console.log("Signing Up");
        var user = {
            LastName: req.body.lastName,
            FirstName: req.body.firstName,
            RecordTypeId: '01228000000SbEwAAK',
            Company: req.body.company,
            Email: req.body.email,
            Website: req.body.domain,
            Status: 'Interest',
            ART__c: req.body.type,
            LeadSource: 'Website',
        };
        var uid = shortId.generate();
        var promise = [
            Contact.findOne({Email: req.body.email}),
            Lead.findOne({Email: req.body.email})
        ];
        sails.log('finding contact/lead in postgre')
        Promise.all(promise)
            .then(_.spread((contact, lead) => {
                if (contact) {
                }
                else if (lead) {
                    sails.log.info("lead found");
                    sails.log.info('creating sfdc connection');
                    conn.login(salsForceConfig.username, salsForceConfig.password, function (err, resp) {
                        sails.log.info('sfdc connection established');
                        lead = _.pickBy(lead, _.identity);
                        sails.log.info('selecting data from sfdc');
                        conn.sobject('Lead').find({Email: lead.Email}).execute((error, record) => {
                            if (error) return res.badRequest(error);
                            sails.log.info('data fetched from sfdc');
                            lead.Id = record[0].Id;
                            user.Id = record[0].Id;
                            delete lead.LastModifiedDate;
                            delete lead.Name;
                            delete lead.SystemModstamp;
                            delete lead.CreatedDate;
                            sails.log.info('updating existing record');
                            console.log(lead);
                            conn.sobject('Lead').update(user, (error, updatedRecord) => {
                                if (error) {
                                    sails.log.info('unable to update record');
                                    return res.badRequest(error);
                                }
                                sails.log.info('existing record updated');
                                sails.log.info('Calling Segment');
                                SegmentService.identifyTrait(uid, user);
                                SegmentService.track(uid, user.Email, 'Lead Updated');
                                sails.log.info('creating firebase user');
                                FirebaseService.createNewUser(req.body.email, req.body.password)
                                    .then(firebaseUser => {
                                        sails.log.info('firebase user created');
                                        user.uid__c = firebaseUser.uid;
                                        sails.log.info('updating sfdc lead');
                                        conn.sobject('Lead').update(user, (error, updatedRecord) => {
                                            if (error || !updatedRecord.success) return res.serverError("Unable To Bind Firebase Id With Account");
                                            sails.log.info('sfdc lead updated');
                                            console.log({updatedRecord: updatedRecord});
                                            sails.log.info('updating postgre lead');
                                            Lead.update({Email: user.Email}, user).then(updatedLead => {
                                                sails.log.info('postgre lead updated');
                                                user.StatisPerson__c = 'STAGED';
                                                sails.log.info('Calling Segment');
                                                SegmentService.identifyTrait(uid, user);
                                                SegmentService.track(uid, user.Email, 'Lead Updated');
                                                res.ok(updatedLead);
                                            });

                                        })
                                    });
                            });
                        });
                    });

                }
                else {
                    sails.log.info("no contact or lead");
                    sails.log.info('signing in to sfdc');
                    conn.login(salsForceConfig.username, salsForceConfig.password, function (err, resp) {
                        sails.log.info('signed in to sfdc');
                        sails.log.info('inserting data to "Lead" table');
                        conn.sobject('Lead').create(user, (error, createdUser) => {
                            if (error) return res.badRequest(error);
                            sails.log.info('data inserted into "Lead"');
                            user.Id = createdUser.id;
                            sails.log.info('Calling Segment');
                            SegmentService.identifyTrait(uid, user);
                            SegmentService.track(uid, user.Email, 'Lead Added');
                            sails.log.info('Inserting data into PostgreSQL (Lead)');
                            Lead.create(user).then(createdLead => {
                                sails.log.info('data inserted into PostgreSQL');
                                sails.log.info('creating firebase user');
                                FirebaseService.createNewUser(req.body.email, req.body.password)
                                    .then(firebaseUser => {
                                        sails.log.info('firebase user created');
                                        user.uid__c = firebaseUser.uid;
                                        sails.log.info('updating sfdc lead');
                                        conn.sobject('Lead').update(user, (error, updatedRecord) => {
                                            if (error || !updatedRecord.success) return res.serverError("Unable To Bind Firebase Id With Account");
                                            sails.log.info('sfdc lead updated');
                                            console.log({updatedRecord: updatedRecord});
                                            sails.log.info('updating postgre lead');
                                            Lead.update({Email: user.Email}, user).then(updatedLead => {
                                                sails.log.info('postgre lead updated');
                                                user.StatisPerson__c = 'STAGED';
                                                sails.log.info('Calling Segment');
                                                SegmentService.identifyTrait(uid, user);
                                                SegmentService.track(uid, user.Email, 'Lead Updated');
                                                res.ok(updatedLead);
                                            });

                                        })
                                    })
                            }).catch(error => {
                                sails.log.info("unable to insert lead into postgre");
                                console.log(error);
                                res.badRequest(error);
                            });
                        });
                    })
                }
            }))
    },
    register: (req, res) => {
        const reqBody = req.body;
        console.log(reqBody);
        var promise = [
            Contact.findOne({Email: reqBody.email}),
            Lead.findOne({Email: reqBody.email})
        ];
        Promise.all(promise)
            .then(_.spread((contact, lead) => {
                if (contact) {
                    console.log("Contact Found");
                    if (contact.StatusPerson__c === 'UNPREVISIONED') {
                        FirebaseService.createNewUser(reqBody.email, reqBody.password)
                            .then(createdFirebaseUser => {
                                res.ok({
                                    customMessage: 'Contact Found',
                                    record: contact
                                })
                            });
                    } else if (
                        contact.StatusPerson__c === 'STAGED' ||
                        contact.StatusPerson__c === 'RECOVERY' ||
                        contact.StatusPerson__c === 'LOCKED_OUT' ||
                        contact.StatusPerson__c === 'ACTIVE'
                    ) {
                        // logic here
                    } else if (
                        contact.StatusPerson__c === 'PROVISIONED' ||
                        contact.StatusPerson__c === 'PW_EXPIRED'
                    ) {
                        res.ok({
                            customMessage: 'Sending Password'
                        })
                    } else if (
                        contact.StatusPerson__c === 'SUSPENDED' ||
                        contact.StatusPerson__c === 'DEPROVISIONED'
                    ) {
                        res.ok({
                            customMessage: 'Please Contact Support'
                        })
                    }
                }
                else if (lead) {
                    console.log("Lead Found")
                    FirebaseService.createNewUser(reqBody.email, reqBody.password)
                        .then(createdFirebaseUser => {
                            console.log(createdFirebaseUser.uid);
                            Lead.update({Email: reqBody.email}, {
                                FirstName: reqBody.firstName,
                                LastName: reqBody.lastName,
                                Name: `${reqBody.firstName} ${reqBody.lastName}`,
                                Company: reqBody.company,
                                ART__c: reqBody.type,
                                Website: reqBody.domain,
                                LeadSource: 'Website', //static
                                RecordTypeId: '01228000000SbEwAAK', //static,
                                Status: 'Interest', //static,
                                SystemModstamp: moment().format('YYYY-MM-DD hh:mm:ss'),
                                uid__c: createdFirebaseUser.uid
                            }).then(updatedLead => {
                                updatedLead = updatedLead[0];
                                res.ok({
                                    customMessage: 'Lead Updated',
                                    record: updatedLead
                                })
                            });
                        })

                }
                else {
                    console.log("Nothing Found");
                    conn.login(salsForceConfig.username, salsForceConfig.password, function (err, resp) {
                        if (err) return res.serverError(err);
                        FirebaseService.createNewUser(reqBody.email, reqBody.password)
                            .then(createdFirebaseUser => {
                                var user = {
                                    LastName: reqBody.lastName,
                                    FirstName: reqBody.firstName,
                                    RecordTypeId: '01228000000SbEwAAK',
                                    Company: reqBody.company,
                                    Email: reqBody.email,
                                    Website: reqBody.domain,
                                    Status: 'Interest',
                                    ART__c: reqBody.type,
                                    LeadSource: 'Website',
                                    uid__c: createdFirebaseUser.uid,
                                };
                                conn.sobject('Lead').create(user, (error, createdUser) => {
                                    if (error) {
                                        return res.ok(error)
                                    }
                                    conn.sobject('Lead').find({id: createdUser.id}).execute((error, record) => {
                                        if (error) return res.serverError(error);
                                        console.log('Record Created');
                                        SegmentService.identifyTrait(createdUser.id, record[0]);
                                        delete record[0].CreatedDate;
                                        delete record[0].LastModifiedDate;
                                        Lead.create(record[0]).then(createdLead => {
                                            res.ok({
                                                customMessage: 'Lead Created',
                                                record: createdLead
                                            })
                                        }).catch(error => {
                                            console.log(error);
                                            res.ok(record[0]);
                                        })
                                        // return res.ok(record);
                                    });
                                });
                            });
                    });
                }
            }));
    }
};