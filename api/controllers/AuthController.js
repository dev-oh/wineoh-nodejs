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
    signIn: (req, res) => {
        FirebaseService.verifyIdToken(req.body.token)
            .then(response => {
                return res.ok(response);
            }).catch(error => {
            return res.ok(error, 'Invalid Token', 'FAIL');
        })
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
                    sails.log.info('contact found');
                    if (contact.StatusPerson__c === 'UNPROVISIONED') {
                        sails.log.info('creating firebase account');
                        FirebaseService.createNewUser(req.body.email, req.body.password)
                            .then(firebaseUser => {
                                sails.log.info('firebase user created');
                                user.uid__c = firebaseUser.uid;
                                sails.log.info('updating sfdc lead');
                                conn.sobject('Lead').update(user, (error, updatedRecord) => {
                                    if (error || !updatedRecord.success)
                                        sails.log.info("Not able")
                                    return res.serverError("Unable To Bind Firebase Id With Account");
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
                            }).catch(error => {
                            if (error.code === 'auth/email-already-in-use') {
                                sails.log.info("user already exist");
                                return res.ok('alreadyExist');
                            }
                            if (error.code === 'auth/weak-password') {
                                sails.log.info("weak password");
                                return res.ok({error: true, message: error.message});
                            }
                            return res.badRequest(error);
                        });
                    } else if (
                        contact.StatusPerson__c === 'STAGED' ||
                        contact.StatusPerson__c === 'RECOVERY' ||
                        contact.StatusPerson__c === 'LOCKED_OUT' ||
                        contact.StatusPerson__c === 'ACTIVE'
                    ) {
                        // logic here
                        res.ok('goSignIn');
                    } else if (
                        contact.StatusPerson__c === 'PROVISIONED' ||
                        contact.StatusPerson__c === 'PW_EXPIRED'
                    ) {
                        res.ok('sendPassword')
                    } else if (
                        contact.StatusPerson__c === 'SUSPENDED' ||
                        contact.StatusPerson__c === 'DEPROVISIONED'
                    ) {
                        res.ok('contactSupport');
                    }
                } else if (lead) {
                    sails.log.info("lead found");
                    sails.log.info('checking if account exist');
                    if (lead.uid__c) {
                        sails.log.info('account already exist');
                        return res.ok('alreadyExist');
                    }
                    sails.log.info('account not exist');
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
                                            if (error || !updatedRecord.success
                                            )
                                                return res.serverError("Unable To Bind Firebase Id With Account");
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
                                    }).catch(error => {
                                    if (error.code === 'auth/email-already-in-use') {
                                        sails.log.info("user already exist");
                                        return res.ok('alreadyExist');
                                    }
                                    if (error.code === 'auth/weak-password') {
                                        sails.log.info("weak password");
                                        return res.ok({error: true, message: error.message});
                                    }
                                    return res.badRequest(error);
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
                                            if (error || !updatedRecord.success
                                            )
                                                return res.serverError("Unable To Bind Firebase Id With Account");
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
                                    }).catch(error => {
                                    if (error.code === 'auth/email-already-in-use') {
                                        sails.log.info("user already exist");
                                        return res.ok('alreadyExist');
                                    }
                                    if (error.code === 'auth/weak-password') {
                                        sails.log.info("weak password");
                                        return res.ok({error: true, message: error.message});
                                    }
                                    console.log('>>>');
                                    console.log(error);
                                    return res.badRequest(error);
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
        console.log(req.body);
        FirebaseService.verifyIdToken(req.body.idToken)
            .then(response => {
                console.log(response);
                if (response.email !== req.body.email) return res.ok('Please authenticate using same email', 'Email mismatch', 'FAIL');
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
                    uid__c: response.uid,
                    // StatisPerson__c : 'STAGED'
            }
                ;
                var uid = shortId.generate();
                var promise = [
                    Contact.findOne({Email: req.body.email}),
                    Lead.findOne({Email: req.body.email})
                ];
                sails.log('finding contact/lead in postgre')
                Promise.all(promise)
                    .then(_.spread((contact, lead) => {
                        if (contact) {
                            sails.log.info('contact found');
                            if (contact.StatusPerson__c === 'UNPROVISIONED') {
                                sails.log.info('creating firebase account');
                                sails.log.info('updating sfdc lead');
                                conn.sobject('Lead').update(user, (error, updatedRecord) => {
                                    if (error || !updatedRecord.success)
                                        sails.log.info("Not able")
                                    return res.serverError("Unable To Bind Firebase Id With Account");
                                    sails.log.info('sfdc lead updated');
                                    console.log({updatedRecord: updatedRecord});
                                    sails.log.info('updating postgre lead');
                                    Lead.update({Email: user.Email}, user).then(updatedLead => {
                                        sails.log.info('postgre lead updated');
                                        res.ok(updatedLead);
                                    });
                                })
                            } else if (
                                contact.StatusPerson__c === 'STAGED' ||
                                contact.StatusPerson__c === 'RECOVERY' ||
                                contact.StatusPerson__c === 'LOCKED_OUT' ||
                                contact.StatusPerson__c === 'ACTIVE'
                            ) {
                                // logic here
                                res.ok('goSignIn');
                            } else if (
                                contact.StatusPerson__c === 'PROVISIONED' ||
                                contact.StatusPerson__c === 'PW_EXPIRED'
                            ) {
                                res.ok('sendPassword')
                            } else if (
                                contact.StatusPerson__c === 'SUSPENDED' ||
                                contact.StatusPerson__c === 'DEPROVISIONED'
                            ) {
                                res.ok('contactSupport');
                            }
                        }
                        else if (lead) {
                            sails.log.info("lead found");
                            sails.log.info('checking if account exist');
                            if (lead.uid__c) {
                                sails.log.info('account already exist');
                                return res.ok('alreadyExist');
                            }
                            sails.log.info('account not exist');
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
                                        Lead.update({Email: user.Email}, user).then(updatedLead => {
                                            sails.log.info('postgre lead updated');
                                            res.ok(updatedLead);
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
                                    if (error) {
                                        console.log(error)
                                        return res.badRequest(error);
                                    }
                                    sails.log.info('data inserted into "Lead"');
                                    user.Id = createdUser.id;
                                    sails.log.info('Calling Segment');
                                    // SegmentService.identifyTrait(uid, user);
                                    // SegmentService.track(uid, user.Email, 'Lead Added');
                                    sails.log.info('Inserting data into PostgreSQL (Lead)');
                                    Lead.create(user).then(createdLead => {
                                        sails.log.info('data inserted into PostgreSQL');
                                        sails.log.info('creating firebase user');
                                        res.ok(createdLead)
                                    }).catch(error => {
                                        sails.log.info("unable to insert lead into postgre");
                                        console.log(error);
                                        res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                    });
                                });
                            })
                        }
                    }))

            }).catch(error => {
            return res.ok('Error occure while trying to authenticate', 'Authentication Error', 'FAIL')
        })
    },
};