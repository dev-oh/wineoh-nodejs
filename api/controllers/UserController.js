var _ = require('lodash');
var jsforce = require('jsforce');
var conn = new jsforce.Connection();
var Creds = require('./../../config/secrets/creds');
module.exports = {
    login: (req, res) => {
        console.log('login called');
        var promise = [];
        var store = {};
        var flag = {};
        Contact.findOne({uid__c: req.user.uid})
            .then(user => {
                if (user.StatusPerson__c === 'UNPROVISIONED' || user.StatusPerson__c === 'DEPROVISIONED' || user.StatusPerson__c === 'SUSPENDED') {
                    console.log('Suspended');
                    return res.ok({message: user.StatusPerson__c},'CONTACT_SUPPORT','FAIL');
                } else if (user.StatusPerson__c === 'PW_EXPIRED' || user.StatusPerson__c === 'PROVISIONED') {
                    return res.ok({message: user.StatusPerson__c},'RESET_PASSWORD','FAIL');
                } else if (user.StatusPerson__c === 'LOCKED_OUT') {
                    return res.ok({message: user.StatusPerson__c},'LOCKED','FAIL');
                } else {
                    if (user.StatusPerson__c === 'STAGED' || user.StatusPerson__c === 'RECOVERY') {
                        Contact.update({uid__c: req.user.uid}, {StatusPerson__c: 'ACTIVE'})
                            .then(updatedContact => {

                            })
                    }
                    console.log("fetching user from firebase");
                    FirebaseService.getUserFromDb(req.user.uid)
                        .then(data => {
                            console.log("fetched");
                            var rtdbUser = data.val();
                            if (!rtdbUser) return res.ok({message: 'No Account Exist'}, "NOT_FOUND", "FAIL");
                            if (rtdbUser.memberId) {
                                res.ok({message: 'Login Successful'}, 'SUCCESS');
                            } else {
                                console.log('connecting to sfdc');
                                conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                    console.log('connected');
                                    promise.push(Account.findOne({Domain__c: rtdbUser.domain}));
                                    promise.push(Contact.findOne({Email: req.user.email}));
                                    promise.push(Lead.findOne({Email: req.user.email}));
                                    promise.push(conn.sobject('Lead').find({Email: req.user.email}));
                                    promise.push(conn.sobject('Contact').find({Email: req.user.email}));
                                    promise.push(conn.sobject('Account').findOne({Domain__c: rtdbUser.domain}));
                                    Promise.all(promise)
                                        .then(_.spread((account, contact, lead, sfdcLead, sfdcContact, sfdcAccount) => {
                                            if (account) {
                                                console.log('postgre account found');
                                                store.accountId = account.Id;
                                            }
                                            if (contact) {
                                                console.log('postgre contact found');
                                                if (contact.StatusPerson__c === 'ACTIVE') {
                                                    // do something
                                                }
                                                store.cotactId = contact.Id;
                                            }
                                            if (lead) flag.duplicateLead = true;
                                            var promiseLvl2 = []
                                            if (sfdcLead.length) {
                                                store.duplicates = _.map(sfdcLead, 'Id');
                                                store.masterId = store.duplicates.shift();
                                                store.Lead = {};
                                                sfdcLead.forEach(element => {
                                                    element = _.pickBy(element, _.identity);
                                                    store.Lead = _.assign(store.Lead, element)
                                                });
                                                store.Lead.Id = store.masterId;
                                                // store.Lead = _.pickBy(store.Lead, _.identity);
                                                store.Lead = FilterService.cleanLead(store.Lead);
                                                promiseLvl2.push(conn.sobject('Lead').update(store.Lead));
                                                promiseLvl2.push(conn.sobject('Lead').del(store.duplicates))
                                            } else {
                                                if (!sfdcContact) return res.ok('There is some problem with your account, please contact support', 'Contact support', 'FAIL');
                                            }
                                            Promise.all(promiseLvl2)
                                                .then(data => {
                                                    if (sfdcContact) {
                                                        store.contactId = sfdcContact.id;
                                                        SegmentService.trackBy(req.user.uid, 'Contact Updated', {contactId: store.contactId});
                                                    }
                                                    if (sfdcAccount) {
                                                        console.log("SFDC Account Found");
                                                        if (sfdcAccount.StatusAccount__c === 'Suspended') {
                                                            SegmentService.trackBy(req.user.uid, 'Account Flagged', {
                                                                Type: 'Suspended Account Login Attempt',
                                                                Email: req.user.email
                                                            });
                                                            GetStreamService.addNotification(req.user.uid, {
                                                                actor: req.user.email,
                                                                verb: 'attempted login',
                                                                object: 'suspended account'
                                                            });
                                                            res.ok('Your Account is Suspended', 'Suspended Account', 'FAIL')
                                                        } else if (sfdcAccount.StatusAccount__c === 'On Hold') {
                                                            SegmentService.trackBy(req.user.uid, 'Account Flagged', {
                                                                Type: 'On Hold Account Login Attempt',
                                                                Email: req.user.email
                                                            });
                                                            GetStreamService.addNotification(req.user.uid, {
                                                                actor: req.user.email,
                                                                verb: 'attempted login',
                                                                object: 'on-hold account'
                                                            });
                                                            res.ok('Your Account is On Hold', 'Account On-Hold', 'FAIL')
                                                            //doSomething
                                                        } else if (sfdcAccount.StatusAccount__c === 'Inactive') {
                                                            SegmentService.trackBy(req.user.uid, 'Contact Added', {
                                                                Type: 'Admin',
                                                                Email: req.user.email
                                                            });
                                                            store.Lead.CRT__c = 'Administrator';
                                                            store.accountActivateFlag = true;
                                                        } else if (sfdcAccount.StatusAccount__c === 'Active') {

                                                        }
                                                    } else {
                                                        store.Lead.CRT__c = 'Administrator';
                                                        store.accountActivateFlag = true;
                                                        // FullContactService.call(req.user.email);
                                                        // store.Lead.convertedStatus = 'Converted';
                                                    }
                                                    FullContactService.call(req.user.email);
                                                    store.Lead.uid__c = req.user.uid;
                                                    conn.sobject('Lead').update(store.Lead)
                                                        .then(updatedLead => {
                                                            JsForceService.convertLead(store.Lead.Id, sfdcAccount ? sfdcAccount.Id : null, (error, response) => {
                                                                if (error) return res(error, "Converting Error", "FAIL");
                                                                console.log("Setting Member Id");
                                                                conn.sobject('Contact').findOne({Email: req.user.email})
                                                                    .then(latestContact => {
                                                                        console.log(latestContact);
                                                                        if (store.accountActivateFlag) {
                                                                            SegmentService.trackBy(req.user.uid, 'Account Activated');
                                                                            GetStreamService.addNotification(req.user.uid, {
                                                                                actor: 'Wine-Oh!',
                                                                                verb: 'welcomes',
                                                                                object: latestContact.PartnerId__c
                                                                            });
                                                                        }
                                                                        FirebaseService.updateUser(req.user.uid, {memberId: latestContact.MemberId__c});
                                                                    })
                                                            });
                                                            return res.ok({message: 'Login Successful'}, 'SUCCESS');
                                                        }).catch(error => {
                                                        res.ok(error)
                                                    })
                                                })
                                            // res.ok(data);

                                        }))
                                })
                            }
                        }).catch(error => {
                        console.log(error);
                        res.ok("No Account Exist", "NOT_FOUND", "FAIL")
                    })
                }
            });
    },
    mlogin: (req, res) => {
        console.log('login called');
        var promise = [];
        var store = {};
        var flag = {};
        console.log("fetching user from firebase");
        FirebaseService.getUserFromDb(req.user.uid)
            .then(data => {
                console.log("fetched");
                var rtdbUser = data.val();
                if (!rtdbUser) return res.ok({message: 'No Account Exist'}, "NOT_FOUND", "FAIL");
                if (rtdbUser.memberId) {
                    res.ok({message: 'Login Successful'}, 'SUCCESS');
                } else {
                    console.log('connecting to sfdc');
                    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                        console.log('connected');
                        promise.push(Account.findOne({Domain__c: rtdbUser.domain}));
                        promise.push(Contact.findOne({Email: req.user.email}));
                        promise.push(Lead.findOne({Email: req.user.email}));
                        promise.push(conn.sobject('Lead').find({Email: req.user.email}));
                        promise.push(conn.sobject('Contact').find({Email: req.user.email}));
                        promise.push(conn.sobject('Account').findOne({Domain__c: rtdbUser.domain}));
                        Promise.all(promise)
                            .then(_.spread((account, contact, lead, sfdcLead, sfdcContact, sfdcAccount) => {
                                if (account) {
                                    console.log('postgre account found');
                                    store.accountId = account.Id;
                                }
                                if (contact) {
                                    console.log('postgre contact found');
                                    if (contact.StatusPerson__c === 'ACTIVE') {
                                        // do something
                                    }
                                    store.cotactId = contact.Id;
                                }
                                if (lead) flag.duplicateLead = true;
                                var promiseLvl2 = []
                                if (sfdcLead.length) {
                                    store.duplicates = _.map(sfdcLead, 'Id');
                                    store.masterId = store.duplicates.shift();
                                    store.Lead = {};
                                    sfdcLead.forEach(element => {
                                        element = _.pickBy(element, _.identity);
                                        store.Lead = _.assign(store.Lead, element)
                                    });
                                    store.Lead.Id = store.masterId;
                                    // store.Lead = _.pickBy(store.Lead, _.identity);
                                    store.Lead = FilterService.cleanLead(store.Lead);
                                    promiseLvl2.push(conn.sobject('Lead').update(store.Lead));
                                    promiseLvl2.push(conn.sobject('Lead').del(store.duplicates))
                                } else {
                                    if (!sfdcContact) return res.ok('There is some problem with your account, please contact support', 'Contact support', 'FAIL');
                                }
                                store.Lead.CRT__c = 'Member';
                                Promise.all(promiseLvl2)
                                    .then(data => {
                                        if (sfdcContact) {
                                            store.contactId = sfdcContact.id;
                                            SegmentService.trackBy(req.user.uid, 'Contact Updated', {contactId: store.contactId});
                                        }
                                        if (sfdcAccount) {
                                            console.log("SFDC Account Found");
                                            if (sfdcAccount.StatusAccount__c === 'Suspended') {
                                                SegmentService.trackBy(req.user.uid, 'Account Flagged', {
                                                    Type: 'Suspended Account Login Attempt',
                                                    Email: req.user.email
                                                });
                                                GetStreamService.addNotification(req.user.uid, {
                                                    actor: req.user.email,
                                                    verb: 'attempted login',
                                                    object: 'suspended account'
                                                });
                                                res.ok('Your Account is Suspended', 'Suspended Account', 'FAIL')
                                            } else if (sfdcAccount.StatusAccount__c === 'On Hold') {
                                                SegmentService.trackBy(req.user.uid, 'Account Flagged', {
                                                    Type: 'On Hold Account Login Attempt',
                                                    Email: req.user.email
                                                });
                                                GetStreamService.addNotification(req.user.uid, {
                                                    actor: req.user.email,
                                                    verb: 'attempted login',
                                                    object: 'on-hold account'
                                                });
                                                res.ok('Your Account is On Hold', 'Account On-Hold', 'FAIL')
                                                //doSomething
                                            } else if (sfdcAccount.StatusAccount__c === 'Inactive') {
                                                SegmentService.trackBy(req.user.uid, 'Contact Added', {
                                                    Type: 'Admin',
                                                    Email: req.user.email
                                                });
                                                store.Lead.CRT__c = 'Member';
                                                store.accountActivateFlag = true;
                                            } else if (sfdcAccount.StatusAccount__c === 'Active') {

                                            }
                                        } else {
                                            store.Lead.CRT__c = 'Member';
                                            store.accountActivateFlag = true;
                                            // FullContactService.call(req.user.email);
                                            // store.Lead.convertedStatus = 'Converted';
                                        }
                                        FullContactService.call(req.user.email);
                                        store.Lead.uid__c = req.user.uid;
                                        conn.sobject('Lead').update(store.Lead)
                                            .then(updatedLead => {
                                                JsForceService.convertLead(store.Lead.Id, sfdcAccount ? sfdcAccount.Id : null, (error, response) => {
                                                    if (error) return res(error, "Converting Error", "FAIL");
                                                    console.log("Setting Member Id");
                                                    conn.sobject('Contact').findOne({Email: req.user.email})
                                                        .then(latestContact => {
                                                            console.log(latestContact);
                                                            if (store.accountActivateFlag) {
                                                                SegmentService.trackBy(req.user.uid, 'Account Activated');
                                                                GetStreamService.addNotification(req.user.uid, {
                                                                    actor: 'Wine-Oh!',
                                                                    verb: 'welcomes',
                                                                    object: latestContact.PartnerId__c
                                                                });
                                                            }
                                                            FirebaseService.updateUser(req.user.uid, {memberId: latestContact.MemberId__c});
                                                        })
                                                });
                                                return res.ok({message: 'Login Successful'}, 'SUCCESS');
                                            }).catch(error => {
                                            res.ok(error)
                                        })
                                    })
                                // res.ok(data);

                            }))
                    })
                }
            }).catch(error => {
            console.log(error);
            res.ok("No Account Exist", "NOT_FOUND", "FAIL")
        })
    },
    profile: (req, res) => {
        Contact.findOne({uid__c: req.user.uid})
            .then(user => {
                res.ok(user)
            }).catch(error => {
            res.ok(error, 'SERVER_ERROR', 'FAIL');
        })
    },
    getTeam: (req, res) => {
        Contact.findOne({uid__c: req.user.uid})
            .then(user => {
                Contact.find({AccountId: user.AccountId})
                    .then(users => {
                        var response = _.groupBy(users, e => {
                            return e.StatusPerson__c
                        });
                        res.ok(response)
                    }).catch(error => {
                    res.ok(error, 'SERVER_ERROR', 'FAIL');
                })
            }).catch(error => {
            res.ok(error, 'SERVER_ERROR', 'FAIL')
        })
    }

};