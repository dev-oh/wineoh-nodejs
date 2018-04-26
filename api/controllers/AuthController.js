/**
 * Created by Raheel on 1/31/2018.
 */
var _ = require('lodash');
var moment = require('moment');
var Creds = require('./../../config/secrets/creds');
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
                if(req.body.type === 'consumer'){
                    req.body.lastName = 'Unknown';
                    var callFullContact = true;
                }
                var user = {
                    LastName: req.body.lastName,
                    FirstName: req.body.firstName || '',
                    RecordTypeId: req.body.recordTypeId ||  '01228000000SbEwAAK',
                    Company: req.body.company,
                    Email: req.body.email,
                    Website: req.body.domain,
                    Status: 'Interest',
                    ART__c: req.body.type,
                    LeadSource: 'Website',
                    uid__c: response.uid,
                    StatusPerson__c : 'STAGED'
                };
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

                                sails.log.info('creating sfdc connection');
                                conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                    sails.log.info('sfdc connection established');
                                    conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                                        if (err) {
                                            console.error(err);
                                            return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                        }
                                        sails.log.info('Updating Fetched Lead');
                                        result = result.records[0];
                                        user.Id = result.Id;
                                        console.log(user);
                                        conn.sobject("Lead").update(user, function (err, ret) {
                                            if (err || !ret.success) {
                                                console.log(err.code)
                                                return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                            }
                                            sails.log.info('Lead Updated');
                                            SegmentService.identifyTrait(ret.id, user);
                                            SegmentService.trackBy(ret.id, "Lead Staged", {Email: user.Email,Id: ret.id});
                                            Lead.update({Email: user.Email}, user).then(updatedLead => {})
                                            return res.ok(ret);
                                        });

                                    });
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
                        }
                        else if (lead) {
                            sails.log.info("lead found");
                            sails.log.info('checking if account exist');
                            if (lead.uid__c) {
                                sails.log.info('account already exist');
                                return res.ok('An account with the given email is already exist','Account Exist','FAIL');
                            }
                            sails.log.info('account not exist');
                            sails.log.info('creating sfdc connection');
                            conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                sails.log.info('sfdc connection established');

                                conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                                    if (err) {
                                        console.error(err);
                                        return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                    }
                                    sails.log.info('Updating Fetched Lead');
                                    result = result.records[0];
                                    user.Id = result.Id;
                                    console.log(user);
                                    conn.sobject("Lead").update(user, function (err, ret) {
                                        if (err || !ret.success) {
                                            console.log(err.code)
                                            return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                        }
                                        sails.log.info('Lead Updated');
                                        SegmentService.identifyTrait(ret.id, user);
                                        SegmentService.trackBy(ret.id, "Lead Staged", {Email: user.Email,Id: ret.id});
                                        Lead.update({Email: user.Email}, user).then(updatedLead => {})
                                        return res.ok(ret);
                                    });

                                });

                            });

                        }
                        else {
                            sails.log.info("no contact or lead");
                            sails.log.info('signing in to sfdc');
                            conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                if (error) return sails.log.error(error);
                                sails.log.info('Fetching Lead From SFDC');
                                conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                                    if (err) {
                                        console.error(err);
                                        return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                    }
                                    sails.log.info('Updating Fetched Lead');
                                    result = result.records[0];
                                    user.Id = result.Id;
                                    console.log(user);
                                    conn.sobject("Lead").update(user, function (err, ret) {
                                        if (err || !ret.success) {
                                            console.log(err.code)
                                            return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                        }
                                        sails.log.info('Lead Updated');
                                        SegmentService.identifyTrait(ret.id, user);
                                        SegmentService.trackBy(ret.id, "Lead Staged", {Email: user.Email,Id: ret.id});
                                        // FirebaseService.createUser(req.body.idToken);
                                        FirebaseService.createUserViaUid(user.uid__c,{name: response.name,email: response.email,domain: user.Website})
                                        Lead.create(user).then(createdLead => {});
                                        return res.ok(ret);
                                    });

                                });
                            })
                        }
                    }))
            }).catch(error => {
            return res.ok(error, 'Authentication Error', 'FAIL')
        })
    },
    passwordLessRegister: (req, res) => {
        console.log(req.body);
        var promise = []
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
        }
        var promises = [
            Contact.findOne({Email: req.body.email}),
            Lead.findOne({Email: req.body.email})
        ];
        var uid = shortId.generate();
        Promise.all(promises)
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
                        return res.ok("An account with given email is already exist", 'Account Exist', 'FAIL');
                    }
                    sails.log.info('account not exist');
                    sails.log.info('creating sfdc connection');
                    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                        sails.log.info('sfdc connection established');
                        conn.query("SELECT Id,uid__c FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                            result = result.records[0];
                            console.log(result)
                            if(result.uid__c) return res.ok("An account with given email is already exist", 'Account Exist', 'FAIL');
                            return res.ok();
                        });
                    });

                }
                else {
                    sails.log.info("no contact or lead");
                    sails.log.info('signing in to sfdc');
                    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                        sails.log.info('signed in to sfdc');
                        conn.query("SELECT Id,uid__c FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                            result = result.records[0];
                            console.log(result)
                            if(result.uid__c) return res.ok("An account with given email is already exist", 'Account Exist', 'FAIL');
                            return res.ok();
                        });
                    })
                }
            }))
    },
    attachUid: (req,res)=>{
        var user = {};
        sails.log.info("Attaching");
        FirebaseService.verifyIdToken(req.body.idToken)
            .then(response => {
                console.log(response)
                conn.login(salsForceConfig.username, salsForceConfig.password, function (err, resp) {
                    sails.log.info('sfdc connection established');
                    sails.log.info('selecting data from sfdc');
                    conn.sobject('Lead').find({Email: response.email}).execute((error, record) => {
                        if (error) return res.badRequest(error);
                        sails.log.info('data fetched from sfdc');
                        console.log(record);
                        user.Id = record[0].Id;
                        console.log("CHK1");
                        user.uid__c= response.uid;
                        user.StatusPerson__c = 'STAGED';
                        console.log('CHK2');
                        sails.log.info('updating existing record');
                        conn.sobject('Lead').update(user, (error, updatedRecord) => {
                            if (error) {
                                sails.log.info('unable to update record');
                                return res.badRequest(error);
                            }
                            sails.log.info('existing record updated');
                            Lead.update({Email: response.email}, user).then(updatedLead => {
                                sails.log.info('postgre lead updated');
                                res.ok(updatedLead);
                            });
                        });
                    });
                });
            })
    },
    mRegister: (req,res)=>{
        FirebaseService.verifyIdToken(req.body.idToken)
            .then(firebaseUser=>{
                var user = {
                    LastName: req.body.lastName || 'Unknown',
                    FirstName: req.body.firstName || '',
                    RecordTypeId: req.body.recordTypeId ||  '01228000000SbEwAAK',
                    Email: req.body.email,
                    Status: 'Interest',
                    uid__c: firebaseUser.uid,
                    StatusPerson__c : 'STAGED'
                };
                if(firebaseUser.email !== user.Email) return res.ok('Please Authenticate With Same Email',"EMAIL_MISMATCH","FAIL");
                Promise.all([
                    Contact.findOne({Email: user.Email}),
                    Lead.find({Email: user.Email})
                ]).then(_.spread((postgreContact,postgreLeads)=>{
                    if(postgreContact) {
                        console.log("Contact Found");
                        if (postgreContact.StatusPerson__c === 'UNPROVISIONED') {
                            conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                conn.sobject('Lead').find({Email: user.Email})
                                    .then(sfdcLeads=>{
                                        Lead.update({Email: user.Email},user);
                                        user.Id = sfdcLeads[0].Id;
                                        conn.sobject('Lead').update(user);
                                        SegmentService.identifyTrait(user.uid__c, user);
                                        SegmentService.track(user.uid__c, 'Lead Updated', user.Email);
                                        FullContactService.call(user.Email);
                                        res.ok('Account Created', 'CREATED');
                                    })
                            });
                            } else if (
                            postgreContact.StatusPerson__c === 'STAGED' ||
                            postgreContact.StatusPerson__c === 'RECOVERY' ||
                            postgreContact.StatusPerson__c === 'LOCKED_OUT' ||
                            postgreContact.StatusPerson__c === 'ACTIVE'
                        ) {
                            // logic here
                            res.ok('User can sign in', 'SIGN_IN');
                        } else if (
                            postgreContact.StatusPerson__c === 'PROVISIONED' ||
                            postgreContact.StatusPerson__c === 'PW_EXPIRED'
                        ) {
                            res.ok('Reset Password', 'RESET_PASSWORD');
                        } else if (
                            postgreContact.StatusPerson__c === 'SUSPENDED' ||
                            postgreContact.StatusPerson__c === 'DEPROVISIONED'
                        ) {
                            res.ok('Please Contact Support', 'CONTACT_SUPPORT');
                        }
                    }else if(postgreLeads.length){
                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                            conn.sobject('Lead').find({Email: user.Email})
                                .then(sfdcLeads=>{
                                    SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, dupIds) => {
                                        var promise_I = [];
                                        if (dupIds) {
                                            promise_I.push(conn.sobject('Lead').update(masterLeadLead));
                                            promise_I.push(conn.sobject('Lead').del(dupIds));
                                        }
                                        Promise.all(promise_I)
                                            .then(data => {
                                                Lead.update({Email: user.Email},user);
                                                user.Id = masterLead.Id;
                                                conn.sobject('Lead').update(user)
                                                    .then(updatedSfdcLead => {
                                                        SegmentService.identifyTrait(user.uid__c, user);
                                                        SegmentService.track(user.uid__c, 'Lead Updated', user.Email);
                                                        FullContactService.call(user.Email);
                                                        res.ok('Account Created', 'CREATED');
                                                    });
                                            })
                                    })
                                });
                        })
                    }else{
                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                            conn.sobject('Lead').create(user)
                                .then(sfdcLead=>{
                                    SegmentService.identifyTrait(user.uid__c,user);
                                    SegmentService.track(user.uid__c,'Lead Added',user.Email);
                                    FullContactService.call(user.Email);
                                    Lead.create(user).catch(error=>{
                                        console.log(error);
                                    });
                                    res.ok('Account Created','CREATED');
                                }).catch(error=>{
                                    console.error(error);
                                    res.ok(error,"SFDC Error","FAIL");
                            })
                        })
                    }
                }));
            }).catch(error=>{
                console.log(error)
                res.ok(error,"Token_Error",'FAIL')
        })
    }

};