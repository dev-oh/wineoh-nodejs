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
    register: (req, res) => {
        console.log(req.body);
        FirebaseService.verifyIdToken(req.body.idToken)
            .then(response => {
                console.log(response);
                if (response.email !== req.body.email) return res.ok('Please authenticate using same email', 'Email mismatch', 'FAIL');
                if (req.body.type === 'consumer') {
                    req.body.lastName = 'Unknown';
                    var callFullContact = true;
                }
                var user = {
                    LastName: req.body.lastName,
                    FirstName: req.body.firstName || '',
                    RecordTypeId: req.body.recordTypeId || '01228000000SbEwAAK',
                    Company: req.body.company,
                    Email: req.body.email,
                    Website: req.body.domain,
                    Status: 'Interest',
                    ART__c: req.body.type,
                    LeadSource: 'Website',
                    uid__c: response.uid,
                    StatusPerson__c: 'STAGED'
                };
                var promise = [
                    Contact.findOne({Email: req.body.email}),
                    Lead.findOne({Email: req.body.email})
                ];
                conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                    Promise.all(promise)
                        .then(_.spread((contact, lead) => {
                            if (contact) {
                                sails.log.info('contact found');
                                if (contact.StatusPerson__c === 'UNPROVISIONED') {
                                    sails.log.info('creating sfdc connection');
                                    sails.log.info('sfdc connection established');
                                    conn.query("SELECT Id FROM Contact WHERE Email = '" + user.Email + "'", function (err, result) {
                                        if (err) {
                                            console.error(err);
                                            return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                        }

                                        conn.sobject('Contact').findOne({Email: user.Email})
                                            .then(sfdcContact => {
                                                user.Id = sfdcContact.Id;
                                                conn.sobject('Contact').update(user)
                                                    .then(updatedContact => {
                                                        Contact.update(user);
                                                        FirebaseService.createUserViaUid(user.uid__c, {
                                                            name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                            email: user.Email,
                                                            domain: user.Website
                                                        });
                                                        res.ok({message: 'Created'}, 'CREATED');
                                                    });
                                            }).catch(error => {
                                            console.log(error);
                                            return res.ok('Unable to create account', 'Error', 'FAIL')
                                        });

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
                                            SegmentService.trackBy(ret.id, "Lead Staged", {
                                                Email: user.Email,
                                                Id: ret.id
                                            });
                                            Lead.update({Email: user.Email}, user).then(updatedLead => {
                                            })
                                            return res.ok(ret);
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
                                console.log(lead);
                                if (lead.uid__c) {
                                    sails.log.info('account already exist');
                                    return res.ok('An account with the given email is already exist', 'Account Exist', 'FAIL');
                                }
                                sails.log.info('account not exist');

                                conn.sobject('Lead').find({Email: user.Email})
                                    .then(sfdcLeads => {
                                        SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                            masterLead = FilterService.cleanLead(masterLead);
                                            conn.sobject('Lead').update(masterLead)
                                                .then(updatedLead => {
                                                    if (duplicates) conn.sobject('Lead').del(duplicates);
                                                    user.Id = updatedLead.id;
                                                    conn.sobject('Lead').update(user);
                                                    SegmentService.identifyTrait(user.Id, user);
                                                    SegmentService.trackBy(user.Id, "Lead Staged", {
                                                        Email: user.Email,
                                                        Id: user.Id
                                                    });
                                                    Lead.update({Email: user.Email}, user);
                                                    FirebaseService.createUserViaUid(user.uid__c, {
                                                        name: response.name,
                                                        email: response.email,
                                                        domain: user.Website
                                                    });
                                                    return res.ok({message: 'Created'}, 'CREATED');
                                                })
                                        });
                                    }).catch(error => {
                                    console.log(error);
                                    res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                });
                            }
                            else {
                                sails.log.info("no contact or lead");
                                sails.log.info('Fetching Lead From SFDC');
                                conn.query("SELECT Id FROM Lead WHERE Email = '" + user.Email + "'", function (err, result) {
                                    if (err) {
                                        return res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                    }
                                    console.log('finding lead in sfdc');
                                    conn.sobject('Lead').find({Email: user.Email})
                                        .then(sfdcLeads => {
                                            console.log('fetched');
                                            SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                                masterLead = FilterService.cleanLead(masterLead);
                                                console.log('updating lead after merging');
                                                conn.sobject('Lead').update(masterLead)
                                                    .then(updatedLead => {
                                                        console.log('updated');
                                                        console.log('deleting duplicates');
                                                        if (duplicates) conn.sobject('Lead').del(duplicates);
                                                        user.Id = updatedLead.id;
                                                        console.log('updating lead with latest data');
                                                        conn.sobject('Lead').update(user);
                                                        SegmentService.identifyTrait(user.Id, user);
                                                        SegmentService.trackBy(user.Id, "Lead Staged", {
                                                            Email: user.Email,
                                                            Id: user.Id
                                                        });
                                                        console.log('creating entry in postgre');
                                                        Lead.update({Email: user.Email}, user).then(loclead=>{}).catch(error=>{console.log(error)});
                                                        console.log('entry in firebase database');
                                                        FirebaseService.createUserViaUid(user.uid__c, {
                                                            name: response.name,
                                                            email: response.email,
                                                            domain: user.Website
                                                        });
                                                        console.log('returning Ok Response');
                                                        return res.ok({message: 'Created'}, 'CREATED');
                                                    }).catch(error=>{
                                                        console.log(error);
                                                })
                                            });
                                        }).catch(error => {
                                        console.log(error);
                                        res.ok("An error occur while creating Account", 'Internal Server Error', 'FAIL');
                                    });

                                });
                            }
                        }))
                });

                sails.log('finding contact/lead in postgre');
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
        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            Promise.all(promises)
                .then(_.spread((contact, lead) => {
                    if (contact) {
                        sails.log.info('contact found');
                        if (contact.StatusPerson__c === 'UNPROVISIONED') {
                            sails.log.info('signing in to sfdc');
                            console.log("Finding Contact");
                            conn.sobject('Contact').findOne({Email: user.Email})
                                .then(sfdcContact => {
                                    user.Id = sfdcContact.Id;
                                    FirebaseService.createUserViaEmail(user.Email, (user.LastName ? user.LastName + ' ' : '') + user.LastName)
                                        .then(firebaseUser => {
                                            user.uid__c = firebaseUser.uid;
                                            conn.sobject('Contact').update(user)
                                                .then(updatedContact => {
                                                    Contact.update(user);
                                                    FirebaseService.createUserViaUid(user.uid__c, {
                                                        name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                        email: user.Email,
                                                        domain: user.Website
                                                    });
                                                    return res.ok({message: 'Created'}, 'CREATED');
                                                });
                                        }).catch(error => {
                                        if (error.errorInfo.code === 'auth/email-already-exists'){
                                            conn.sobject('Contact').update(user)
                                                .then(updatedContact => {
                                                    Contact.update(user);
                                                    FirebaseService.createUserViaUid(user.uid__c, {
                                                        name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                        email: user.Email,
                                                        domain: user.Website
                                                    });
                                                    return res.ok({message: 'Created'}, 'CREATED');
                                                });
                                            // return res.ok("An account with given email is already exist", 'Account Exist', 'FAIL');
                                        }else{
                                            return res.ok('Unable to create you account', 'UNKNOWN ERROR', 'FAIL');
                                        }
                                    })
                                }).catch(error => {
                                console.log(error);
                                return res.ok('Unable to create account', 'Error', 'FAIL')
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
                        sails.log.info('signing in to sfdc');
                        console.log("Signed In");
                        console.log("Creating Firebase Account");
                        FirebaseService.createUserViaEmail(user.Email, user.LastName)
                            .then(fbuser => {
                                console.log("Account created");
                                user.uid__c = fbuser.uid;
                                console.log(`uid is ${fbuser.uid}`);
                                console.log('finding sfdc lead using ' + user.Email)
                                conn.sobject('Lead').find({Email: user.Email})
                                    .then(sfdcLeads => {
                                        console.log('leads found');
                                        console.log('executind merging strategy');
                                        SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                            console.log("merging done");
                                            masterLead = FilterService.cleanLead(masterLead);
                                            console.log('updating master lead');
                                            conn.sobject('Lead').update(masterLead)
                                                .then(updatedLead => {
                                                    console.log('master lead updated');
                                                    console.log('[async] deleting duplicates');
                                                    if (duplicates) conn.sobject('Lead').del(duplicates);
                                                    user.Id = updatedLead.id;
                                                    console.log('[Async] updating master lead with current data');
                                                    conn.sobject('Lead').update(user);
                                                    console.log('creating postgre entry');
                                                    Lead.create(user).then(createdLead => {
                                                    });
                                                    console.log('creating entry in firebase database');
                                                    FirebaseService.createUserViaUid(user.uid__c, {
                                                        name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                        email: user.Email,
                                                        domain: user.Website
                                                    });
                                                    res.ok({message: 'Created'}, 'CREATED')
                                                })
                                        });
                                    }).catch(error => {
                                        FirebaseService.deleteUser(fbuser.uid);
                                    console.error(error);
                                    return res.ok(error, 'ERROR', 'FAIL')
                                })
                            }).catch(error => {
                            console.error(error)
                            if (error.errorInfo.code === 'auth/email-already-exists'){
                                FirebaseService.getUser(user.Email)
                                    .then(fbuser=>{
                                        console.log("Account created");
                                        user.uid__c = fbuser.uid;
                                        console.log(`uid is ${fbuser.uid}`);
                                        console.log('finding sfdc lead using ' + user.Email)
                                        conn.sobject('Lead').find({Email: user.Email})
                                            .then(sfdcLeads => {
                                                console.log('leads found');
                                                console.log('executind merging strategy');
                                                SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                                    console.log("merging done");
                                                    masterLead = FilterService.cleanLead(masterLead);
                                                    console.log('updating master lead');
                                                    conn.sobject('Lead').update(masterLead)
                                                        .then(updatedLead => {
                                                            console.log('master lead updated');
                                                            console.log('[async] deleting duplicates');
                                                            if (duplicates) conn.sobject('Lead').del(duplicates);
                                                            user.Id = updatedLead.id;
                                                            console.log('[Async] updating master lead with current data');
                                                            conn.sobject('Lead').update(user);
                                                            console.log('creating postgre entry');
                                                            Lead.create(user).then(createdLead => {
                                                            });
                                                            console.log('creating entry in firebase database');
                                                            FirebaseService.createUserViaUid(user.uid__c, {
                                                                name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                                email: user.Email,
                                                                domain: user.Website
                                                            });
                                                            res.ok({message: 'Created'}, 'CREATED')
                                                        })
                                                });
                                            }).catch(error => {
                                            console.error(error);
                                            return res.ok(error, 'ERROR', 'FAIL')
                                        })
                                    });
                            }else{
                                return res.ok('Unable to create you account', 'UNKNOWN ERROR', 'FAIL');
                            }
                        });
                    }
                    else {
                        sails.log.info("no contact or lead");
                        sails.log.info('signing in to sfdc');
                        console.log("Signed In");
                        console.log("Creating Firebase Account");
                        FirebaseService.createUserViaEmail(user.Email, user.LastName)
                            .then(fbuser => {
                                console.log("Account created");
                                user.uid__c = fbuser.uid;
                                console.log(`uid is ${fbuser.uid}`);
                                console.log('finding sfdc lead using ' + user.Email)
                                conn.sobject('Lead').find({Email: user.Email})
                                    .then(sfdcLeads => {
                                        console.log('leads found');
                                        console.log('executind merging strategy');
                                        SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                            console.log("merging done");
                                            masterLead = FilterService.cleanLead(masterLead);
                                            console.log('updating master lead');
                                            conn.sobject('Lead').update(masterLead)
                                                .then(updatedLead => {
                                                    console.log('master lead updated');
                                                    console.log('[async] deleting duplicates');
                                                    if (duplicates) conn.sobject('Lead').del(duplicates);
                                                    user.Id = updatedLead.id;
                                                    console.log('[Async] updating master lead with current data');
                                                    conn.sobject('Lead').update(user);
                                                    console.log('creating postgre entry');
                                                    Lead.create(user).then(createdLead => {
                                                    });
                                                    console.log('creating entry in firebase database');
                                                    FirebaseService.createUserViaUid(user.uid__c, {
                                                        name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                        email: user.Email,
                                                        domain: user.Website
                                                    });
                                                    res.ok({message: 'Created'}, 'CREATED')
                                                }).catch(error=>{
                                                FirebaseService.deleteUser(fbuser.uid);
                                                    console.log(error)
                                            })
                                        });
                                    }).catch(error => {
                                        FirebaseService.deleteUser(fbuser.uid);
                                    console.error(error);
                                    return res.ok(error, 'ERROR', 'FAIL')
                                })
                            }).catch(error => {
                            console.error(error)
                            if (error.errorInfo.code === 'auth/email-already-exists'){
                                FirebaseService.getUser(user.Email)
                                    .then(fbuser=>{
                                        console.log("Account Fetched");
                                        user.uid__c = fbuser.uid;
                                        console.log(`uid is ${fbuser.uid}`);
                                        console.log('finding sfdc lead using ' + user.Email)
                                        conn.sobject('Lead').find({Email: user.Email})
                                            .then(sfdcLeads => {
                                                console.log('leads found');
                                                console.log('executind merging strategy');
                                                SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, duplicates) => {
                                                    console.log("merging done");
                                                    masterLead = FilterService.cleanLead(masterLead);
                                                    console.log('updating master lead');
                                                    conn.sobject('Lead').update(masterLead)
                                                        .then(updatedLead => {
                                                            console.log('master lead updated');
                                                            console.log('[async] deleting duplicates');
                                                            if (duplicates) conn.sobject('Lead').del(duplicates);
                                                            user.Id = updatedLead.id;
                                                            console.log('[Async] updating master lead with current data');
                                                            conn.sobject('Lead').update(user);
                                                            console.log('creating postgre entry');
                                                            Lead.create(user).then(createdLead => {
                                                            });
                                                            console.log('creating entry in firebase database');
                                                            FirebaseService.createUserViaUid(user.uid__c, {
                                                                name: (user.LastName ? user.LastName + ' ' : '') + user.LastName,
                                                                email: user.Email,
                                                                domain: user.Website
                                                            });
                                                            res.ok({message: 'Created'}, 'CREATED')
                                                        }).catch(error=>{
                                                        FirebaseService.deleteUser(fbuser.uid);
                                                        console.log(error)
                                                    })
                                                });
                                            }).catch(error => {
                                            console.error(error);
                                            return res.ok(error, 'ERROR', 'FAIL')
                                        })
                                    }).catch(error=>{
                                    return res.ok('Unable to create you account', 'UNKNOWN ERROR', 'FAIL');
                                });
                            }else{
                                return res.ok('Unable to create you account', 'UNKNOWN ERROR', 'FAIL');
                            }
                        });
                    }
                }))
        });
    },
    attachUid: (req, res) => {
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
                        user.uid__c = response.uid;
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
    mRegister: (req, res) => {
        FirebaseService.verifyIdToken(req.body.idToken)
            .then(firebaseUser => {
                var user = {
                    LastName: req.body.lastName || 'Unknown',
                    FirstName: req.body.firstName || '',
                    RecordTypeId: req.body.recordTypeId || '01228000000SbEwAAK',
                    Email: req.body.email,
                    Status: 'Interest',
                    uid__c: firebaseUser.uid,
                    StatusPerson__c: 'STAGED'
                };
                if (firebaseUser.email !== user.Email) return res.ok({message:'Please Authenticate With Same Email'}, "EMAIL_MISMATCH", "FAIL");
                Promise.all([
                    Contact.findOne({Email: user.Email}),
                    Lead.find({Email: user.Email})
                ]).then(_.spread((postgreContact, postgreLeads) => {
                    if (postgreContact) {
                        console.log("Contact Found");
                        if (postgreContact.StatusPerson__c === 'UNPROVISIONED') {
                            conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                conn.sobject('Lead').find({Email: user.Email})
                                    .then(sfdcLeads => {
                                        Lead.update({Email: user.Email}, user);
                                        user.Id = sfdcLeads[0].Id;
                                        conn.sobject('Lead').update(user);
                                        SegmentService.identifyTrait(user.uid__c, user);
                                        SegmentService.track(user.uid__c, 'Lead Updated', user.Email);
                                        FullContactService.call(user.Email);
                                        res.ok({message:'Account Created'}, 'CREATED');
                                    })
                            });
                        } else if (
                            postgreContact.StatusPerson__c === 'STAGED' ||
                            postgreContact.StatusPerson__c === 'RECOVERY' ||
                            postgreContact.StatusPerson__c === 'LOCKED_OUT' ||
                            postgreContact.StatusPerson__c === 'ACTIVE'
                        ) {
                            // logic here
                            res.ok({message: 'User can sign in'}, 'SIGN_IN','FAIL');
                        } else if (
                            postgreContact.StatusPerson__c === 'PROVISIONED' ||
                            postgreContact.StatusPerson__c === 'PW_EXPIRED'
                        ) {
                            res.ok({message: 'Reset Password'}, 'RESET_PASSWORD','FAIL);
                        } else if (
                            postgreContact.StatusPerson__c === 'SUSPENDED' ||
                            postgreContact.StatusPerson__c === 'DEPROVISIONED'
                        ) {
                            res.ok({message: 'Please Contact Support'}, 'CONTACT_SUPPORT','FAIL');
                        }
                    } else if (postgreLeads.length) {
                        console.log("lead found");
                        if(postgreLeads[0].uid__c) return res.ok({message: 'Account with the given email is already exist'},'ALREADY_EXIST','FAIL');
                        console.log("connection to sfdc");
                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                            console.log('connected');
                            conn.sobject('Lead').find({Email: user.Email})
                                .then(sfdcLeads => {
                                    SfdcService.mergeSfdcLeads(sfdcLeads, (masterLead, dupIds) => {
                                        var promise_I = [];
                                        if (dupIds) {
                                            promise_I.push(conn.sobject('Lead').update(masterLeadLead));
                                            promise_I.push(conn.sobject('Lead').del(dupIds));
                                        }
                                        Promise.all(promise_I)
                                            .then(data => {
                                                Lead.update({Email: user.Email}, user);
                                                user.Id = masterLead.Id;
                                                conn.sobject('Lead').update(user)
                                                    .then(updatedSfdcLead => {
                                                        SegmentService.identifyTrait(user.uid__c, user);
                                                        SegmentService.track(user.uid__c, 'Lead Updated', user.Email);
                                                        FullContactService.call(user.Email);
                                                        FirebaseService.createUserViaUid(user.uid__c, {
                                                            // name: user.LastName,
                                                            email: user.Email,
                                                            // domain: user.Website
                                                        });
                                                        res.ok({message:'Account Created'}, 'CREATED');
                                                    });
                                            })
                                    })
                                });
                        })
                    } else {
                        console.log("Nothing found");
                        console.log("connecting to sfdc");
                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                            console.log("connected");
                            console.log("creating lead");
                            console.log(user);
                            conn.sobject('Lead').create(user)
                                .then(sfdcLead => {
                                    console.log('created');
                                    SegmentService.identifyTrait(user.uid__c, user);
                                    SegmentService.track(user.uid__c, 'Lead Added', user.Email);
                                    FullContactService.call(user.Email);
                                    FirebaseService.createUserViaUid(user.uid__c, {
                                        // name: user.LastName,
                                        email: user.Email,
                                        // domain: user.Website
                                    });
                                    console.log("creating lead in postgre");
                                    Lead.create(user).then(user=>{
                                      console.log("created on postgre")
                                    }).catch(error => {
                                        console.log(error);
                                        return res.ok(error,'SERVER_ERROR','FAIL');
                                    });
                                    return res.ok({message:'Account Created'}, 'CREATED');
                                }).catch(error => {
                                    console.log('unable to create lead');
                                console.error(error);
                                res.ok(error, "SFDC Error", "FAIL");
                            })
                        })
                    }
                }));
            }).catch(error => {
            console.log(error)
            res.ok(error, "Token_Error", 'FAIL')
        })
    }

};