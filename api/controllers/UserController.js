var _ = require('lodash');
var jsforce = require('jsforce');
var conn = new jsforce.Connection();
var Creds = require('./../../config/secrets/creds');
var randomstring = require('randomstring');
var shortid = require('shortid')


module.exports = {
    login: (req, res) => {
        console.log('login called');
        var promise = [];
        var store = {};
        var flag = {};
        Contact.findOne({uid__c: req.user.uid})
            .then(user => {
                if (user) {
                    if (user.StatusPerson__c === 'UNPROVISIONED' || user.StatusPerson__c === 'DEPROVISIONED' || user.StatusPerson__c === 'SUSPENDED') {
                        console.log('Suspended');
                        return res.ok({message: user.StatusPerson__c}, 'CONTACT_SUPPORT', 'FAIL');
                    } else if (user.StatusPerson__c === 'PW_EXPIRED' || user.StatusPerson__c === 'PROVISIONED') {
                        return res.ok({message: user.StatusPerson__c}, 'RESET_PASSWORD', 'FAIL');
                    } else if (user.StatusPerson__c === 'LOCKED_OUT') {
                        return res.ok({message: user.StatusPerson__c}, 'LOCKED', 'FAIL');
                    } else {
                        if (user.StatusPerson__c === 'STAGED' || user.StatusPerson__c === 'RECOVERY') {
                            Contact.update({uid__c: req.user.uid}, {StatusPerson__c: 'ACTIVE'})
                                .then(updatedContact => {

                                })
                        }

                    }
                } else {
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
                if(user){
                    Contact.find({AccountId: user.AccountId})
                        .then(users => {
                            var response = _.groupBy(users, e => {
                                return e.StatusPerson__c
                            });
                            res.ok(response)
                        }).catch(error => {
                        res.ok(error, 'SERVER_ERROR', 'FAIL');
                    })
                }else{
                    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                        conn.sobject('Contact').findOne({uid__c: req.user.uid})
                            .then(user=>{
                                conn.sobject('Contact').find({AccountId: user.AccountId})
                                    .then(users=>{
                                        var response = _.groupBy(users, e => {
                                            return e.StatusPerson__c
                                        });
                                        res.ok(response)
                                    })
                            })
                    });
                }
            }).catch(error => {
            res.ok(error, 'SERVER_ERROR', 'FAIL')
        })
    },



    signin: (req, res) => {
        var store = {};
        var flag = {};
        flag.customer = true;
        sails.log.info('searching realtime database for user');
        FirebaseService.getUserFromDb(req.user.uid)
            .then(data => {
                sails.log.info('search finished');
                var firebaseDBUser = data.val();
                if (!firebaseDBUser) return res.ok({message: 'No Account Exist'}, "NOT_FOUND", "FAIL");
                sails.log.info('checking if member id exist');
                if (firebaseDBUser.memberId) {
                    sails.log.info('member id found');
                    sails.log.info('fetching contact in postgre server');
                    Contact.findOne({uid__c: req.user.uid})
                        .then(postgreContact => {
                            sails.log.info('fetched');
                            if (postgreContact) {
                                sails.log.info('postgres contact exist');
                                if (postgreContact.RecordTypeId === '01228000000TLjuAAG' || postgreContact.RecordTypeId === '01228000000TLjzAAG') {
                                    sails.log.info('customer login');
                                    flag.customer = true;
                                    flag.member = false;
                                    sails.log.info('calling segment track (Customer Login)');
                                    SegmentService.track(req.user.uid, 'Customer Login', req.user.email);
                                    sails.log.info('fetching account from postgres');
                                    Account.findOne({originalId: postgreContact.AccountId})
                                        .then(postgreAccount => {
                                            sails.log.info('account status is ' + postgreAccount.StatusAccount__c);
                                            sails.log.info('contact status is ' + postgreContact.StatusPerson__c);
                                            if (postgreAccount.StatusAccount__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your company\'s account has been temporarily been suspended. Contact Support to re-activate it'}, 'AC_SUSPENDED', 'FAIL');
                                            if (postgreAccount.StatusAccount__c.toUpperCase() === 'ON-HOLD') return res.ok({message: 'Your company\'s account is on hold. Contact Support to re-activate it'}, 'AC_ON-HOLD', 'FAIL');
                                            if (postgreAccount.StatusAccount__c.toUpperCase() === 'INACTIVE') Account.update({originalId: postgreContact.AccountId}, {StatusAccount__c: 'ACTIVE'});
                                            if (postgreContact.StatusPerson__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                            if (postgreContact.StatusPerson__c.toUpperCase() === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                            if (postgreContact.StatusPerson__c.toUpperCase() === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                            if (postgreContact.StatusPerson__c.toUpperCase() === 'RECOVERY') Contact.update({ContactId: store.contactId}, {StatusPerson__c: 'ACTIVE'}); //update required
                                            if (postgreContact.StatusPerson__c.toUpperCase() === 'PW_EXPIRED') {
                                                Contact.update({ContactId: store.contactId}, {StatusPerson__c: 'ACTIVE'});
                                                return res.ok({message: 'Your password has been expired. A password reset email has been sent to your email.'}, 'PW_EXPIRED', 'FAIL');
                                            }
                                            if (postgreContact.Onboarding__c) {
                                                postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                return res.ok(postgreContact, 'SUCCESS');
                                            }
                                            sails.log.info('starting asutopilot journy');
                                            AutopilotService.startJourny(postgreContact.Email, 'customer');
                                            postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                            return res.ok(postgreContact, 'SUCCESS');
                                        })
                                } else {
                                    sails.log.info('user is member');
                                    SegmentService.track(req.user.uid, 'Member Login', req.user.email);
                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                    if (postgreContact.StatusPerson__c === 'RECOVERY') Contact.update({ContactId: store.contactId}, {StatusPerson__c: 'ACTIVE'}); //update reqquired
                                    if (postgreContact.Onboarding__c) {
                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                        return res.ok(postgreContact, 'SUCCESS');
                                    }
                                    sails.log.info('starting asutopilot journy');
                                    AutopilotService.startJourny(postgreContact.Email, 'member');
                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                    return res.ok(postgreContact, 'SUCCESS');
                                }
                            } else {
                                sails.log.info('postgres contact not exist');
                                sails.log.info('connecting to the sfdc server');
                                conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                    if(error) sails.log.info("Unable to connect to sfdc");
                                    else sails.log.info('connected');
                                    conn.sobject('Contact').findOne({uid__c: req.user.uid})
                                        .then(sfdcContact => {
                                            if (sfdcContact.RecordTypeId === '01228000000TLjuAAG' || sfdcContact.RecordTypeId === '01228000000TLjzAAG') {
                                                sails.log.info('customer login');
                                                flag.customer = true;
                                                flag.member = false;
                                                sails.log.info('calling segment track (Customer Login)');
                                                SegmentService.track(req.user.uid, 'Customer Login', req.user.email);
                                                sails.log.info('fetching account from sfdc');
                                                conn.sobject('Account').findOne({Id: sfdcContact.AccountId})
                                                    .then(sfdcAccount => {
                                                        sails.log.info('account status is ' + sfdcAccount.StatusAccount__c.toUpperCase());
                                                        sails.log.info('contact status is ' + sfdcContact.StatusPerson__c);
                                                        if (sfdcAccount.StatusAccount__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your company\'s account has been temporarily been suspended. Contact Support to re-activate it'}, 'AC_SUSPENDED', 'FAIL');
                                                        if (sfdcAccount.StatusAccount__c.toUpperCase() === 'ON-HOLD') return res.ok({message: 'Your company\'s account is on hold. Contact Support to re-activate it.'}, 'AC_ON-HOLD', 'FAIL');
                                                        if (sfdcAccount.StatusAccount__c.toUpperCase() === 'INACTIVE') conn.sobject('Account').update({Id: sfdcAccount.Id,StatusAccount__c: 'ACTIVE'}).then(result=>{});
                                                        if (sfdcContact.StatusPerson__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                        if (sfdcContact.StatusPerson__c.toUpperCase() === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                        if (sfdcContact.StatusPerson__c.toUpperCase() === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                        if (sfdcContact.StatusPerson__c.toUpperCase() === 'RECOVERY') conn.sobject('Contact').update({Id: sfdcContact.Id,StatusPerson__c: 'ACTIVE'});
                                                        if (sfdcContact.StatusPerson__c.toUpperCase() === 'PW_EXPIRED'){
                                                            conn.sobject('Contact').update({Id: sfdcContact.Id,StatusPerson__c: 'RECOVERY'});
                                                            return res.ok({message: 'Your password has been expired. A password reset email has been sent to your email.'}, 'PW_EXPIRED', 'FAIL');
                                                        }
                                                        if (sfdcContact.Onboarding__c) {
                                                            sfdcContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                            return res.ok(sfdcContact, 'SUCCESS');
                                                        }
                                                        sails.log.info('starting asutopilot journy');
                                                        AutopilotService.startJourny(sfdcContact.Email, 'customer');
                                                        sfdcContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                        return res.ok(sfdcContact, 'SUCCESS');
                                                    });
                                            } else {
                                                sails.log.info('user is member');
                                                SegmentService.track(req.user.uid, 'Member Login', req.user.email);
                                                if (sfdcContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                if (sfdcContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                if (sfdcContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                if (sfdcContact.StatusPerson__c === 'RECOVERY') Contact.update({ContactId: store.contactId}, {StatusPerson__c: 'ACTIVE'}); //update reqquired
                                                if (sfdcContact.Onboarding__c) {
                                                    sfdcContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                    return res.ok(sfdcContact, 'SUCCESS');
                                                }
                                                sails.log.info('starting autopilot journey');
                                                AutopilotService.startJourny(sfdcContact.Email, 'member');
                                                postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                return res.ok(sfdcContact, 'SUCCESS');
                                            }
                                        }).catch(error=>{
                                            sails.log.info('unable to find contact');
                                            return res.ok('Unable to fetch data from sfdc','ERROR','FAIL');
                                    });
                                });
                            }
                        }).catch(error => {
                        sails.log.info('unable to fetch contact');
                        return res.ok({message: 'Internal Server Error'}, 'ERROR', 'FAIL')
                    });
                }
                else {
                    //no member id section
                    sails.log.info('no member id exist in firebase db');
                    sails.log.info('fetching postgres lead using email');
                    Lead.find({Email: req.user.email})
                        .then(postgreLead => {
                            if (postgreLead.length) {
                                sails.log.info('lead found');
                                sails.log.info('applying merge mechanism');
                                SfdcService.mergeSfdcLeads(postgreLead, (masterPostgreLead, duplicates) => {
                                    sails.log.info('applied');
                                    sails.log.info('updating master postgres lead');
                                    masterPostgreLead = FilterService.cleanLeadForPostgres(masterPostgreLead);
                                    Lead.update({Id: masterPostgreLead.Id}, masterPostgreLead)
                                        .then(updatadMastarPostgreLead => {
                                            sails.log.info('updated');
                                            sails.log.info('deleting duplicates');
                                            Lead.destroy({Id: duplicates});
                                            sails.log.info('saving postgres lead to store');
                                            store.Lead = updatadMastarPostgreLead;
                                            sails.log.info('fetching sfdc account using domain');
                                            Account.findOne({Domain__c: firebaseDBUser.domain})
                                                .then(postgreAccount => {
                                                    sails.log.info('fetched');
                                                    if (postgreAccount) { // diversion one
                                                        sails.log.info('postgre account found');
                                                        sails.log.info('saving postgres account to store');
                                                        store.Account = postgreAccount;
                                                        flag.postgresAccount = true;
                                                        flag.sfdcAccount = false;
                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your company\'s account has been temporarily been suspended. Contact Support to re-activate it'}, 'AC_SUSPENDED', 'FAIL');
                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'ON-HOLD') return res.ok({message: 'Your company\'s account is on hold. Contact Support to re-activate it'}, 'AC_ON-HOLD', 'FAIL');
                                                        store.Lead.CRT__c = 'Associate'
                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'INACTIVE') {
                                                            sails.log.info('account status is inactive');
                                                            store.Account.StatusPerson__c = 'ACTIVE';
                                                            store.Lead.CRT__c = 'Administrator';
                                                        }
                                                        sails.log.info('fetching postgres contact using email');
                                                        Contact.findOne({Email: req.user.email})
                                                            .then(postgreContact => {
                                                                sails.log.info('fetched');
                                                                if (postgreContact) {
                                                                    store.Contact = postgreContact;
                                                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'PW_EXPIRED'){} store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                    if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                    if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                    if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                    if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                    if (!postgreContact.MemberName__c) {
                                                                        Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                            .then(postgreMemberNameContact => {
                                                                                if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                else {
                                                                                    setMemberIdV2(postgreContact, () => {
                                                                                        if (flag.customer) {
                                                                                            FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvanceTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                });
                                                                                            });
                                                                                        } else {
                                                                                            FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                FeedItem.create({
                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                    Type: 'AdvanceTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                });
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                    }
                                                                    FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                    if (postgreContact.Onboarding__c) {
                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                    }
                                                                    if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                    else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                    return res.ok(postgreContact, 'SUCCESS');
                                                                } else {
                                                                    sails.log.info('no postgres contact found');
                                                                    sails.log.info('calling full contact api');
                                                                    FullContactService.callCb(req.user.email, (error, success) => {
                                                                        if (error) return res.ok({message: 'Unable to call full contact api'}, 'ERROR', 'FAIL');
                                                                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                                                            conn.sobject('Lead').findOne({Email: req.user.email})
                                                                                .then(sfdcLead => {
                                                                                    if (sfdcLead.CRT__c) {
                                                                                        sails.log.info('Clearing company field');
                                                                                        delete sfdcLead.Company;
                                                                                        conn.sobject('Lead').update({
                                                                                            Id: sfdcLead.Id,
                                                                                            Company: ''
                                                                                        });
                                                                                    }
                                                                                    store.Lead = sfdcLead;
                                                                                    conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                        .then(sfdcAccount => {
                                                                                            if (sfdcAccount) {
                                                                                                sails.log.info('sfdc account found');
                                                                                                sails.log.info('saving sfdc account to store');
                                                                                                store.Account = sfdcAccount;
                                                                                                flag.postgresAccount = false;
                                                                                                flag.sfdcAccount = true;
                                                                                            } else {
                                                                                            }
                                                                                            SegmentService.track(req.user.uid, 'Lead Converted', req.user.email);
                                                                                            conn.sobject('FeedItem').create({
                                                                                                Title: 'Lead Converted: PendingReview',
                                                                                                ParentId: store.Lead.Id,
                                                                                                Type: 'AdvancedTextPost',
                                                                                                Status: XmlService.buildForPost(store.Lead.Id, 'Lead', 'Notify', 'Lead', null, 'Lead Advanced', '0012800001a7DInAAE'),
                                                                                                CreatedById: '005280000053XVoAAM'
                                                                                            })
                                                                                            sails.log.info('converting lead');
                                                                                            JsForceService.convertLead(store.Lead.Id, flag.sfdcAccount ? store.Account.Id : null, (error, response) => {
                                                                                                if (error) {
                                                                                                    SegmentService.trackBy(req.user.uid, 'Lead Error', {
                                                                                                        Email: req.user.email,
                                                                                                        Errors: error
                                                                                                    });
                                                                                                    return res(error, "Converting Error", "FAIL");
                                                                                                }
                                                                                                conn.sobject('Contact').findOne({Email: req.user.email})
                                                                                                    .then(sfdcContact => {
                                                                                                        if (sfdcContact) store.Contact = sfdcContact;

                                                                                                        //pending
                                                                                                        if (flag.customer && !store.Account.FeedNotification__c) FlightService.setupCompanyFlight(store.Contact.PartnerId__c, store.Account.Name, store.Account.Id);
                                                                                                        if (!store.Contact.MemberName__c) {
                                                                                                            Contact.findOne({MemberName__c: store.Contact.FirstName + store.Contact.LastName})
                                                                                                                .then(postgreMemberNameContact => {
                                                                                                                    if (!postgreMemberNameContact) Contact.update({originalId: store.Contact.Id}, {MemberName__c: store.Contact.FirstName.replace(/ /g, '') + store.Contact.LastName.replace(/ /g, '')});
                                                                                                                    else {
                                                                                                                        setMemberIdV2(store.Contact, () => {
                                                                                                                            if (flag.customer) {
                                                                                                                                FlightService.setupUserFlight('customer', store.Contact.MemberId__c, store.Contact.MemberName__c, store.Contact.Id, null, (notifyFeedId) => {
                                                                                                                                    SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Customer Added: PendingReview',
                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '005280000053XVoAAM'
                                                                                                                                    });
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Customer Activated: PendingReview',
                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                    });
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Associate Added: PendingReview',
                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, store.Account.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${store.Contact.FirstName} ${store.Contact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                    });
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Customer Welcome Message: PendingReview',
                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                    });
                                                                                                                                });
                                                                                                                            } else {
                                                                                                                                FlightService.setupUserFlight('member', store.Contact.MemberId__pc, store.Contact.MemberName__pc, null, store.Contact.Id, (notifyFeedId) => {
                                                                                                                                    SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Member Added: PendingReview',
                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Member', 'created', 'notify', store.Contact.Id, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '05280000053XVoAAM'
                                                                                                                                    });
                                                                                                                                    FeedItem.create({
                                                                                                                                        Title: 'Member Welcome Message: PendingReview',
                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                        Status: 'PendingReview',
                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, 'Member', 'Notify', 'notify', store.Contact.Id, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                    });
                                                                                                                                });
                                                                                                                            }
                                                                                                                        });
                                                                                                                    }
                                                                                                                });
                                                                                                        }
                                                                                                        FirebaseService.updateUser(req.user.uid, {memberId: store.Contact.MemberId__c});
                                                                                                        if (store.Contact.Onboarding__c) {
                                                                                                            store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                            return res.ok(store.Contact, 'SUCCESS');
                                                                                                        }
                                                                                                        if (store.Contact.CRT__c === 'Member') AutopilotService.startJourny(store.Contact.Email, 'member');
                                                                                                        else AutopilotService.startJourny(store.Contact.Email, 'customer');
                                                                                                        store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                        return res.ok(store.Contact, 'SUCCESS');
                                                                                                    })
                                                                                            });
                                                                                        });
                                                                                });
                                                                        });
                                                                    });
                                                                }
                                                            })
                                                    } else {

                                                        sails.log.info('postgres account not exist');
                                                        sails.log.info('fetching postgres contact using email');
                                                        Contact.findOne({Email: req.user.email})
                                                            .then(postgreContact => {
                                                                sails.log.info('fetched');
                                                                if (postgreContact) {
                                                                    store.Contact = postgreContact;
                                                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                    if (postgreContact.StatusPerson__c === 'PW_EXPIRED') store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                    if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                    if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                    if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                    if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                    if (!postgreContact.MemberName__c) {
                                                                        Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                            .then(postgreMemberNameContact => {
                                                                                if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                else {
                                                                                    setMemberIdV2(postgreContact, () => {
                                                                                        if (flag.customer) {
                                                                                            FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvanceTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                    ParentId: postgreContact.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                });
                                                                                            });
                                                                                        } else {
                                                                                            FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                FeedItem.create({
                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                    Type: 'AdvanceTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                });
                                                                                                FeedItem.create({
                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                    Type: 'AdvancedTextPost',
                                                                                                    Status: 'PendingReview',
                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                });
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                    }
                                                                    FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                    if (postgreContact.Onboarding__c) {
                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                    }
                                                                    if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                    else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                    return res.ok(postgreContact, 'SUCCESS');
                                                                } else {
                                                                    sails.log.info('no postgres contact found');
                                                                    sails.log.info('calling full contact api');
                                                                    FullContactService.callCb(req.user.email, (error, success) => {
                                                                        if (error) return res.ok({message: 'Unable to call full contact api'}, 'ERROR', 'FAIL');
                                                                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                                                            conn.sobject('Lead').findOne({Email: req.user.email})
                                                                                .then(sfdcLead => {
                                                                                    if (sfdcLead.CRT__c === 'Member' && sfdcLead.Company) {
                                                                                        sails.log.info('Clearing company field');
                                                                                        delete sfdcLead.Company;
                                                                                        conn.sobject('Lead').update({
                                                                                            Id: sfdcLead.Id,
                                                                                            Company: ''
                                                                                        });
                                                                                    }
                                                                                    store.Lead = sfdcLead;
                                                                                    conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                        .then(sfdcAccount => {
                                                                                            if (sfdcAccount) {
                                                                                                sails.log.info('sfdc account found');
                                                                                                sails.log.info('saving sfdc account to store');
                                                                                                store.Account = sfdcAccount;
                                                                                                flag.postgresAccount = false;
                                                                                                flag.sfdcAccount = true;
                                                                                            } else {
                                                                                            }
                                                                                            SegmentService.track(req.user.uid, 'Lead Converted', req.user.email);
                                                                                            sails.log.info('creating feed item');
                                                                                            conn.sobject('FeedItem').create({
                                                                                                Title: 'Lead Converted: PendingReview',
                                                                                                ParentId: store.Lead.Id,
                                                                                                Type: 'AdvancedTextPost',
                                                                                                Status: 'PendingReview',
                                                                                                Body: XmlService.buildForPost(store.Lead.Id, 'Lead', 'Notify', 'Lead', null, 'Lead Advanced', '0012800001a7DInAAE'),
                                                                                                CreatedById: '005280000053XVoAAM',
                                                                                                IsRichText: false
                                                                                            }).then(response => {
                                                                                                sails.log.info('post with Lead Converted: PendingReview created');
                                                                                                sails.log.info(response);
                                                                                            }).catch(error => {
                                                                                                sails.log.error(error)
                                                                                            });
                                                                                            sails.log.info('converting lead');
                                                                                            JsForceService.convertLead(store.Lead.Id, store.Account ? store.Account.Id : null, (error, response) => {
                                                                                                if (error) {
                                                                                                    SegmentService.trackBy(req.user.uid, 'Lead Error', {
                                                                                                        Email: req.user.email,
                                                                                                        Errors: error
                                                                                                    });
                                                                                                    return res(error, "Converting Error", "FAIL");
                                                                                                }
                                                                                                sails.log.info('lead converted');
                                                                                                sails.log.info('fetching new lead data from sfdc');
                                                                                                conn.sobject('Contact').findOne({Email: req.user.email})
                                                                                                    .then(sfdcContact => {
                                                                                                        sails.log.info('fetched');
                                                                                                        if (sfdcContact) {
                                                                                                            sails.log.info('setting sfdc contact into store');
                                                                                                            store.Contact = sfdcContact;
                                                                                                            flag.sfdcContact = true;
                                                                                                        }
                                                                                                        conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                                            .then(sfdcAccount => {
                                                                                                                if (sfdcAccount) {
                                                                                                                    sails.log.info('setting sfdc account into store');
                                                                                                                    store.Account = sfdcAccount;
                                                                                                                    flag.sfdcAccount = true;
                                                                                                                }
                                                                                                                if (flag.customer && !store.Account.FeedNotification__c) {
                                                                                                                    sails.log.info('no FeedNotification__c in account');
                                                                                                                    sails.log.info('user is customer and now seting up company flight');
                                                                                                                    FlightService.setupCompanyFlight(store.Contact.PartnerId__c, store.Account.Name, store.Account.Id);
                                                                                                                }
                                                                                                                if (!store.Contact.MemberName__c) {
                                                                                                                    sails.log.info('no MemberName__c in contact');
                                                                                                                    setMemberIdV2(store.Contact, (updatedContact) => {
                                                                                                                        store.Contact = updatedContact;
                                                                                                                        if (flag.customer) {
                                                                                                                            sails.log.info('setting up user flight')
                                                                                                                            FlightService.setupUserFlight('customer', store.Contact.MemberId__c, store.Contact.MemberName__c, store.Contact.Id, null, (notifyFeedId) => {
                                                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                                                    ParentId: store.Contact.Id,
                                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                                                });
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                                                    ParentId: store.Contact.Id,
                                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                                });
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                                                    ParentId: store.Contact.Id,
                                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    Body: XmlService.buildForPost(store.Account.Id, store.Account.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${store.Contact.FirstName} ${store.Contact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                                });
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                                                    ParentId: store.Contact.Id,
                                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                                });
                                                                                                                            });
                                                                                                                        } else {
                                                                                                                            FlightService.setupUserFlight('member', store.Contact.MemberId__pc, store.Contact.MemberName__pc, null, store.Contact.Id, (notifyFeedId) => {
                                                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                                                    ParentId: store.Account.Id,
                                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    body: XmlService.buildForPost(store.Contact.Id, 'Member', 'created', 'notify', store.Contact.Id, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                                                });
                                                                                                                                FeedItem.create({
                                                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                                                    ParentId: store.Account.Id,
                                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                                    Status: 'PendingReview',
                                                                                                                                    Body: XmlService.buildForPost(store.Account.Id, 'Member', 'Notify', 'notify', store.Contact.Id, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                                });
                                                                                                                            });
                                                                                                                        }
                                                                                                                    });
                                                                                                                }
                                                                                                                FirebaseService.updateUser(req.user.uid, {memberId: store.Contact.MemberId__c});
                                                                                                                if (store.Contact.Onboarding__c) {
                                                                                                                    store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                    return res.ok(store.Contact, 'SUCCESS');
                                                                                                                }
                                                                                                                if (store.Contact.CRT__c === 'Member') AutopilotService.startJourny(store.Contact.Email, 'member');
                                                                                                                else AutopilotService.startJourny(store.Contact.Email, 'customer');
                                                                                                                store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                return res.ok(store.Contact, 'SUCCESS');
                                                                                                            });
                                                                                                    });
                                                                                            });
                                                                                        });
                                                                                });
                                                                        });
                                                                    });
                                                                }
                                                            });
                                                    }
                                                });
                                        }).catch(error => {
                                        sails.log.info('unable to update');
                                        res.ok({message: 'Unable to update master postgre lead after merging'}, 'ERROR', 'FAIL')
                                    });
                                })
                            }
                            else {
                                sails.log.info('no postgre lead exist');
                                sails.log.info('connecting to sfdc database');
                                conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                    sails.log.info('connected');
                                    sails.log.info('fetching sfdc lead');
                                    conn.sobject('Lead').find({Email: req.user.email})
                                        .then(sfdcLead => {
                                            if (sfdcLead.length) {
                                                sails.log.info('lead found');
                                                sails.log.info('applying merge mechanism');
                                                SfdcService.mergeSfdcLeads(sfdcLead, (masterPostgreLead, duplicates) => {
                                                    sails.log.info('applied');
                                                    store.Lead = masterPostgreLead;
                                                    masterPostgreLead = FilterService.cleanLead(masterPostgreLead);
                                                    sails.log.info('updating master sfdc lead');
                                                    conn.sobject('Lead').update(masterPostgreLead)
                                                        .then(result => {
                                                            sails.log.info('sfdc lead updated');
                                                            sails.log.info('updated');
                                                            sails.log.info('deleting duplicates');
                                                            conn.sobject('Lead').del(duplicates);
                                                            sails.log.info('saving lead to store');
                                                            sails.log.info('fetching sfdc account using domain');
                                                            Account.findOne({Domain__c: firebaseDBUser.domain})
                                                                .then(postgreAccount => {
                                                                    sails.log.info('fetched');
                                                                    if (postgreAccount) { // diversion one
                                                                        sails.log.info('postgre account found');
                                                                        sails.log.info('saving postgres account to store');
                                                                        store.Account = postgreAccount;
                                                                        flag.postgresAccount = true;
                                                                        flag.sfdcAccount = false;
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your company\'s account has been temporarily been suspended. Contact Support to re-activate it'}, 'AC_SUSPENDED', 'FAIL');
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'ON-HOLD') return res.ok({message: 'Your company\'s account is on hold. Contact Support to re-activate it'}, 'AC_ON-HOLD', 'FAIL');
                                                                        store.Lead.CRT__c = 'Associate';
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'INACTIVE') {
                                                                            sails.log.info('account status is inactive');
                                                                            store.Account.StatusPerson__c = 'ACTIVE';
                                                                            store.Lead.CRT__c = 'Administrator';
                                                                        }
                                                                        sails.log.info('fetching postgres contact using email');
                                                                        Contact.findOne({Email: req.user.email})
                                                                            .then(postgreContact => {
                                                                                sails.log.info('fetched');
                                                                                if (postgreContact) {
                                                                                    store.Contact = postgreContact;
                                                                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'PW_EXPIRED') store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                                    if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                                    if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                                    if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                                    if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                                    if (!postgreContact.MemberName__c) {
                                                                                        Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                                            .then(postgreMemberNameContact => {
                                                                                                if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                                else {
                                                                                                    setMemberIdV2(postgreContact, () => {
                                                                                                        if (flag.customer) {
                                                                                                            FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        } else {
                                                                                                            FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                    }
                                                                                    FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                                    if (postgreContact.Onboarding__c) {
                                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                                    }
                                                                                    if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                                    else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                    return res.ok(postgreContact, 'SUCCESS');
                                                                                } else {
                                                                                    sails.log.info('no postgres contact found');
                                                                                    sails.log.info('calling full contact api');
                                                                                    FullContactService.callCb(req.user.email, (error, success) => {
                                                                                        if (error) return res.ok({message: 'Unable to call full contact api'}, 'ERROR', 'FAIL');
                                                                                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                                                                            conn.sobject('Lead').findOne({Email: req.user.email})
                                                                                                .then(sfdcLead => {
                                                                                                    if (sfdcLead.CRT__c) {
                                                                                                        sails.log.info('Clearing company field');
                                                                                                        delete sfdcLead.Company;
                                                                                                        conn.sobject('Lead').update({
                                                                                                            Id: sfdcLead.Id,
                                                                                                            Company: ''
                                                                                                        });
                                                                                                    }
                                                                                                    store.Lead = sfdcLead;
                                                                                                    conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                                        .then(sfdcAccount => {
                                                                                                            if (sfdcAccount) {
                                                                                                                sails.log.info('sfdc account found');
                                                                                                                sails.log.info('saving sfdc account to store');
                                                                                                                store.Account = sfdcAccount;
                                                                                                                flag.postgresAccount = false;
                                                                                                                flag.sfdcAccount = true;
                                                                                                            } else {
                                                                                                            }
                                                                                                            SegmentService.track(req.user.uid, 'Lead Converted', req.user.email);
                                                                                                            conn.sobject('FeedItem').create({
                                                                                                                Title: 'Lead Converted: PendingReview',
                                                                                                                ParentId: store.Lead.Id,
                                                                                                                Type: 'AdvancedTextPost',
                                                                                                                Status: XmlService.buildForPost(store.Lead.Id, 'Lead', 'Notify', 'Lead', null, 'Lead Advanced', '0012800001a7DInAAE'),
                                                                                                                CreatedById: '005280000053XVoAAM'
                                                                                                            })
                                                                                                            sails.log.info('converting lead');
                                                                                                            JsForceService.convertLead(store.Lead.Id, store.Account ? store.Account.Id : null, (error, response) => {
                                                                                                                if (error) {
                                                                                                                    SegmentService.trackBy(req.user.uid, 'Lead Error', {
                                                                                                                        Email: req.user.email,
                                                                                                                        Errors: error
                                                                                                                    });
                                                                                                                    return res(error, "Converting Error", "FAIL");
                                                                                                                }
                                                                                                                conn.sobject('Contact').findOne({Email: req.user.email})
                                                                                                                    .then(sfdcContact => {
                                                                                                                        if (sfdcContact) store.Contact = sfdcContact;

                                                                                                                        //pending
                                                                                                                        if (flag.customer && !store.Account.FeedNotification__c) FlightService.setupCompanyFlight(store.Contact.PartnerId__c, store.Account.Name, store.Account.Id);
                                                                                                                        if (!store.Contact.MemberName__c) {
                                                                                                                            Contact.findOne({MemberName__c: store.Contact.FirstName + store.Contact.LastName})
                                                                                                                                .then(postgreMemberNameContact => {
                                                                                                                                    if (!postgreMemberNameContact) Contact.update({originalId: store.Contact.Id}, {MemberName__c: store.Contact.FirstName.replace(/ /g, '') + store.Contact.LastName.replace(/ /g, '')});
                                                                                                                                    else {
                                                                                                                                        setMemberIdV2(store.Contact, () => {
                                                                                                                                            if (flag.customer) {
                                                                                                                                                FlightService.setupUserFlight('customer', store.Contact.MemberId__c, store.Contact.MemberName__c, store.Contact.Id, null, (notifyFeedId) => {
                                                                                                                                                    SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Added: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM'
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Activated: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Associate Added: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, store.Account.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${store.Contact.FirstName} ${store.Contact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Welcome Message: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                                    });
                                                                                                                                                });
                                                                                                                                            } else {
                                                                                                                                                FlightService.setupUserFlight('member', store.Contact.MemberId__pc, store.Contact.MemberName__pc, null, store.Contact.Id, (notifyFeedId) => {
                                                                                                                                                    SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Member Added: PendingReview',
                                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Member', 'created', 'notify', store.Contact.Id, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '05280000053XVoAAM'
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Member Welcome Message: PendingReview',
                                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, 'Member', 'Notify', 'notify', store.Contact.Id, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                                    });
                                                                                                                                                });
                                                                                                                                            }
                                                                                                                                        });
                                                                                                                                    }
                                                                                                                                });
                                                                                                                        }
                                                                                                                        FirebaseService.updateUser(req.user.uid, {memberId: store.Contact.MemberId__c});
                                                                                                                        if (store.Contact.Onboarding__c) {
                                                                                                                            store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                            return res.ok(store.Contact, 'SUCCESS');
                                                                                                                        }
                                                                                                                        if (store.Contact.CRT__c === 'Member') AutopilotService.startJourny(store.Contact.Email, 'member');
                                                                                                                        else AutopilotService.startJourny(store.Contact.Email, 'customer');
                                                                                                                        store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                        return res.ok(store.Contact, 'SUCCESS');
                                                                                                                    })
                                                                                                            });
                                                                                                        });
                                                                                                });
                                                                                        });
                                                                                    });
                                                                                }
                                                                            })
                                                                    } else {
                                                                        sails.log.info('postgres account not exist');
                                                                        sails.log.info('fetching postgres contact using email');
                                                                        Contact.findOne({Email: req.user.email})
                                                                            .then(postgreContact => {
                                                                                sails.log.info('fetched');
                                                                                if (postgreContact) {
                                                                                    store.Contact = postgreContact;
                                                                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'PW_EXPIRED') store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                                    if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                                    if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                                    if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                                    if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                                    if (!postgreContact.MemberName__c) {
                                                                                        Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                                            .then(postgreMemberNameContact => {
                                                                                                if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                                else {
                                                                                                    setMemberIdV2(postgreContact, () => {
                                                                                                        if (flag.customer) {
                                                                                                            FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        } else {
                                                                                                            FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                    }
                                                                                    FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                                    if (postgreContact.Onboarding__c) {
                                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                                    }
                                                                                    if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                                    else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                    return res.ok(postgreContact, 'SUCCESS');
                                                                                }
                                                                                else {
                                                                                    sails.log.info('no postgres contact found');
                                                                                    sails.log.info('calling full contact api');
                                                                                    FullContactService.callCb(req.user.email, (error, success) => {
                                                                                        if (error) return res.ok({message: 'Unable to call full contact api'}, 'ERROR', 'FAIL');
                                                                                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                                                                            conn.sobject('Lead').findOne({Email: req.user.email})
                                                                                                .then(sfdcLead => {
                                                                                                    if (sfdcLead.CRT__c === 'Member' && sfdcLead.Company) {
                                                                                                        sails.log.info('Clearing company field');
                                                                                                        delete sfdcLead.Company;
                                                                                                        conn.sobject('Lead').update({
                                                                                                            Id: sfdcLead.Id,
                                                                                                            Company: ''
                                                                                                        });
                                                                                                    }
                                                                                                    store.Lead = sfdcLead;
                                                                                                    conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                                        .then(sfdcAccount => {
                                                                                                            if (sfdcAccount) {
                                                                                                                sails.log.info('sfdc account found');
                                                                                                                sails.log.info('saving sfdc account to store');
                                                                                                                store.Account = sfdcAccount;
                                                                                                                flag.postgresAccount = false;
                                                                                                                flag.sfdcAccount = true;
                                                                                                            } else {
                                                                                                                flag.sfdcAccount = false;
                                                                                                            }
                                                                                                            SegmentService.track(req.user.uid, 'Lead Converted', req.user.email);
                                                                                                            sails.log.info('creating feed item');
                                                                                                            conn.sobject('FeedItem').create({
                                                                                                                Title: 'Lead Converted: PendingReview',
                                                                                                                ParentId: store.Lead.Id,
                                                                                                                Type: 'AdvancedTextPost',
                                                                                                                Status: 'PendingReview',
                                                                                                                Body: XmlService.buildForPost(store.Lead.Id, 'Lead', 'Notify', 'Lead', null, 'Lead Advanced', '0012800001a7DInAAE'),
                                                                                                                CreatedById: '005280000053XVoAAM',
                                                                                                                IsRichText: false
                                                                                                            }).then(response => {
                                                                                                                sails.log.info('post with Lead Converted: PendingReview created');
                                                                                                                sails.log.info(response);
                                                                                                            }).catch(error => {
                                                                                                                sails.log.error(error)
                                                                                                            });
                                                                                                            sails.log.info("updating lead before converting");
                                                                                                            conn.sobject('Lead').update({
                                                                                                                Id: store.Lead.Id,
                                                                                                                CRT__c: flag.sfdcAccount ? "Associate" : "Administrator"
                                                                                                            })
                                                                                                                .then(result => {
                                                                                                                    sails.log.info('converting lead');
                                                                                                                    JsForceService.convertLead(store.Lead.Id, store.Account ? store.Account.Id : null, (error, response) => {
                                                                                                                        if (error) {
                                                                                                                            SegmentService.trackBy(req.user.uid, 'Lead Error', {
                                                                                                                                Email: req.user.email,
                                                                                                                                Errors: error
                                                                                                                            });
                                                                                                                            return res(error, "Converting Error", "FAIL");
                                                                                                                        }
                                                                                                                        sails.log.info('lead converted');
                                                                                                                        sails.log.info('fetching new lead data from sfdc');
                                                                                                                        conn.sobject('Contact').findOne({Email: req.user.email})
                                                                                                                            .then(sfdcContact => {
                                                                                                                                sails.log.info('fetched');
                                                                                                                                if (sfdcContact) {
                                                                                                                                    sails.log.info('setting sfdc contact into store');
                                                                                                                                    store.Contact = sfdcContact;
                                                                                                                                    flag.sfdcContact = true;
                                                                                                                                }
                                                                                                                                conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                                                                    .then(sfdcAccount => {
                                                                                                                                        if (sfdcAccount) {
                                                                                                                                            sails.log.info('setting sfdc account into store');
                                                                                                                                            store.Account = sfdcAccount;
                                                                                                                                            flag.sfdcAccount = true;
                                                                                                                                        }
                                                                                                                                        if (flag.customer && !store.Account.FeedNotification__c) {
                                                                                                                                            sails.log.info('no FeedNotification__c in account')
                                                                                                                                            sails.log.info('user is customer and now seting up company flight');
                                                                                                                                            FlightService.setupCompanyFlight(store.Contact.PartnerId__c, store.Account.Name, store.Account.Id);
                                                                                                                                        }
                                                                                                                                        if (!store.Contact.MemberName__c) {
                                                                                                                                            sails.log.info('no MemberName__c in contact')
                                                                                                                                            setMemberIdV2(store.Contact, (updatedContact) => {
                                                                                                                                                store.Contact = updatedContact;
                                                                                                                                                if (flag.customer) {
                                                                                                                                                    sails.log.info('setting up user flight')
                                                                                                                                                    FlightService.setupUserFlight('customer', store.Contact.MemberId__c, store.Contact.MemberName__c, store.Contact.Id, null, (notifyFeedId) => {
                                                                                                                                                        SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Customer Added: PendingReview',
                                                                                                                                                            ParentId: store.Contact.Id,
                                                                                                                                                            Type: 'AdvanceTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '005280000053XVoAAM'
                                                                                                                                                        });
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Customer Activated: PendingReview',
                                                                                                                                                            ParentId: store.Contact.Id,
                                                                                                                                                            Type: 'AdvancedTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '005280000053XVoAAM',
                                                                                                                                                        });
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Associate Added: PendingReview',
                                                                                                                                                            ParentId: store.Contact.Id,
                                                                                                                                                            Type: 'AdvancedTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            Body: XmlService.buildForPost(store.Account.Id, store.Account.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${store.Contact.FirstName} ${store.Contact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '005280000053XVoAAM',
                                                                                                                                                        });
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Customer Welcome Message: PendingReview',
                                                                                                                                                            ParentId: store.Contact.Id,
                                                                                                                                                            Type: 'AdvancedTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '005280000051o2xAAA',
                                                                                                                                                        });
                                                                                                                                                    });
                                                                                                                                                } else {
                                                                                                                                                    FlightService.setupUserFlight('member', store.Contact.MemberId__pc, store.Contact.MemberName__pc, null, store.Contact.Id, (notifyFeedId) => {
                                                                                                                                                        SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Member Added: PendingReview',
                                                                                                                                                            ParentId: store.Account.Id,
                                                                                                                                                            Type: 'AdvanceTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            body: XmlService.buildForPost(store.Contact.Id, 'Member', 'created', 'notify', store.Contact.Id, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '05280000053XVoAAM'
                                                                                                                                                        });
                                                                                                                                                        FeedItem.create({
                                                                                                                                                            Title: 'Member Welcome Message: PendingReview',
                                                                                                                                                            ParentId: store.Account.Id,
                                                                                                                                                            Type: 'AdvancedTextPost',
                                                                                                                                                            Status: 'PendingReview',
                                                                                                                                                            Body: XmlService.buildForPost(store.Account.Id, 'Member', 'Notify', 'notify', store.Contact.Id, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                            CreatedById: '005280000051o2xAAA',
                                                                                                                                                        });
                                                                                                                                                    });
                                                                                                                                                }
                                                                                                                                            });
                                                                                                                                        }
                                                                                                                                        FirebaseService.updateUser(req.user.uid, {memberId: store.Contact.MemberId__c});
                                                                                                                                        if (store.Contact.Onboarding__c) {
                                                                                                                                            store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                                            return res.ok(store.Contact, 'SUCCESS');
                                                                                                                                        }
                                                                                                                                        if (store.Contact.CRT__c === 'Member') AutopilotService.startJourny(store.Contact.Email, 'member');
                                                                                                                                        else AutopilotService.startJourny(store.Contact.Email, 'customer');
                                                                                                                                        store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                                        return res.ok(store.Contact, 'SUCCESS');
                                                                                                                                    });
                                                                                                                            });
                                                                                                                    });
                                                                                                                });
                                                                                                        });
                                                                                                });
                                                                                        });
                                                                                    });
                                                                                }
                                                                            })
                                                                    }
                                                                }).catch(error=>{
                                                                    return res.ok({message: "Server Errro. Please try again later"})
                                                            })
                                                        }).catch(error => {
                                                        sails.log.info('unable to update');
                                                        res.ok({message: 'Unable to update master postgre lead after merging'}, 'ERROR', 'FAIL');
                                                    });
                                                })
                                            }
                                            else {
                                                sails.log.info('no sfdc lead found');
                                                sails.log.info('fetching contact from postgres');
                                                Contact.findOne({Email: req.user.email})
                                                    .then(postgreContact => {
                                                        if (postgreContact) {
                                                            store.Contact = postgreContact;
                                                            sails.log.info('fetching sfdc account using domain');
                                                            Account.findOne({Domain__c: firebaseDBUser.domain})
                                                                .then(postgreAccount => {
                                                                    sails.log.info('fetched');
                                                                    if (postgreAccount) { // diversion one
                                                                        sails.log.info('postgre account found');
                                                                        sails.log.info('saving postgres account to store');
                                                                        store.Account = postgreAccount;
                                                                        flag.postgresAccount = true;
                                                                        flag.sfdcAccount = false;
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'SUSPENDED') return res.ok({message: 'Your company\'s account has been temporarily been suspended. Contact Support to re-activate it'}, 'AC_SUSPENDED', 'FAIL');
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'ON-HOLD') return res.ok({message: 'Your company\'s account is on hold. Contact Support to re-activate it'}, 'AC_ON-HOLD', 'FAIL');
                                                                        store.Lead.CRT__c = 'Associate'
                                                                        if (postgreAccount.StatusAccount__c.toUpperCase() === 'INACTIVE') {
                                                                            sails.log.info('account status is inactive');
                                                                            store.Account.StatusPerson__c = 'ACTIVE';
                                                                            store.Lead.CRT__c = 'Administrator';
                                                                        }
                                                                        sails.log.info('fetching postgres contact using email');
                                                                        if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                        if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                        if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                        if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                        if (postgreContact.StatusPerson__c === 'PW_EXPIRED') store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                        if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                        if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                        if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                        if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                        if (!postgreContact.MemberName__c) {
                                                                            Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                                .then(postgreMemberNameContact => {
                                                                                    if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                    else {
                                                                                        setMemberIdV2(postgreContact, () => {
                                                                                            if (flag.customer) {
                                                                                                FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                    SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Customer Added: PendingReview',
                                                                                                        ParentId: postgreContact.originalId,
                                                                                                        Type: 'AdvanceTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                        CreatedById: '005280000053XVoAAM'
                                                                                                    });
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Customer Activated: PendingReview',
                                                                                                        ParentId: postgreContact.originalId,
                                                                                                        Type: 'AdvancedTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                    });
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Associate Added: PendingReview',
                                                                                                        ParentId: postgreContact.originalId,
                                                                                                        Type: 'AdvancedTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                    });
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Customer Welcome Message: PendingReview',
                                                                                                        ParentId: postgreContact.originalId,
                                                                                                        Type: 'AdvancedTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                    });
                                                                                                });
                                                                                            } else {
                                                                                                FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                    SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Member Added: PendingReview',
                                                                                                        ParentId: postgreAccount.originalId,
                                                                                                        Type: 'AdvanceTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                        CreatedById: '05280000053XVoAAM'
                                                                                                    });
                                                                                                    FeedItem.create({
                                                                                                        Title: 'Member Welcome Message: PendingReview',
                                                                                                        ParentId: postgreAccount.originalId,
                                                                                                        Type: 'AdvancedTextPost',
                                                                                                        Status: 'PendingReview',
                                                                                                        Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                    });
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                        }
                                                                        FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                        if (postgreContact.Onboarding__c) {
                                                                            postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                            return res.ok(postgreContact, 'SUCCESS');
                                                                        }
                                                                        if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                        else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                    } else {
                                                                        sails.log.info('postgres account not exist');
                                                                        sails.log.info('fetching postgres contact using email');
                                                                        Contact.findOne({Email: req.user.email})
                                                                            .then(postgreContact => {
                                                                                sails.log.info('fetched');
                                                                                if (postgreContact) {
                                                                                    store.Contact = postgreContact;
                                                                                    if (postgreContact.StatusPerson__c === 'LOCKED_OUT') return res.ok({message: 'Your account is locked. Contact Support'}, 'LOCKED_OUT', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'UNPROVISIONED') return res.ok({message: 'Your account isn\'t provisioned. Contact Support'}, 'UNPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'SUSPENDED') return res.ok({message: 'Your account is suspended. Contact Support'}, 'SUSPENDED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'DEPROVISIONED') return res.ok({message: 'Your account has been deprovisioned. Contact Support'}, 'DEPROVISIONED', 'FAIL');
                                                                                    if (postgreContact.StatusPerson__c === 'PW_EXPIRED') store.Contact.StatusPerson__c = 'RECOVERY'; // reset password and then change Status to Recovery // update required
                                                                                    if (postgreContact.StatusPerson__c === 'PROVISIONED') store.Contact.StatusPerson__c = 'ACTIVE'; // reset password and then change Status to ACTIVE // update required
                                                                                    if (postgreContact.StatusPerson__c === 'STAGED') store.Contact.StatusPerson__c = 'PROVISIONED'; //set password and change status to active // update required
                                                                                    if (postgreContact.StatusPerson__c === 'RECOVERY') store.Contact.StatusPerson__c = 'ACTIVE';
                                                                                    if (flag.customer && !postgreAccount.FeedNotification__c) FlightService.setupCompanyFlight(postgreContact.PartnerId__c, postgreAccount.Name, postgreAccount.originalId);
                                                                                    if (!postgreContact.MemberName__c) {
                                                                                        Contact.findOne({MemberName__c: postgreContact.FirstName + postgreContact.LastName})
                                                                                            .then(postgreMemberNameContact => {
                                                                                                if (!postgreMemberNameContact) Contact.update({originalId: postgreContact.originalId}, {MemberName__c: postgreContact.FirstName.replace(/ /g, '') + postgreContact.LastName.replace(/ /g, '')}); //update required
                                                                                                else {
                                                                                                    setMemberIdV2(postgreContact, () => {
                                                                                                        if (flag.customer) {
                                                                                                            FlightService.setupUserFlight('customer', postgreContact.MemberId__c, postgreContact.MemberName__c, postgreContact.originalId, null, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Activated: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Associate Added: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, postgreAccount.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${postgreContact.FirstName} ${postgreContact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000053XVoAAM',
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Customer Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreContact.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreContact.originalId, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        } else {
                                                                                                            FlightService.setupUserFlight('member', postgreContact.MemberId__pc, postgreContact.MemberName__pc, null, postgreContact.originalId, (notifyFeedId) => {
                                                                                                                SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Added: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvanceTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    body: XmlService.buildForPost(postgreContact.originalId, 'Member', 'created', 'notify', postgreContact.originalId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '05280000053XVoAAM'
                                                                                                                });
                                                                                                                FeedItem.create({
                                                                                                                    Title: 'Member Welcome Message: PendingReview',
                                                                                                                    ParentId: postgreAccount.originalId,
                                                                                                                    Type: 'AdvancedTextPost',
                                                                                                                    Status: 'PendingReview',
                                                                                                                    Body: XmlService.buildForPost(postgreAccount.originalId, 'Member', 'Notify', 'notify', postgreContact.originalId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                    CreatedById: '005280000051o2xAAA',
                                                                                                                });
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                    }
                                                                                    FirebaseService.updateUser(req.user.uid, {memberId: postgreContact.MemberId__c});
                                                                                    if (postgreContact.Onboarding__c) {
                                                                                        postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                        return res.ok(postgreContact, 'SUCCESS');
                                                                                    }
                                                                                    if (postgreContact.CRT__c === 'Member') AutopilotService.startJourny(postgreContact.Email, 'member');
                                                                                    else AutopilotService.startJourny(postgreContact.Email, 'customer');
                                                                                    postgreContact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                    return res.ok(postgreContact, 'SUCCESS');
                                                                                } else {
                                                                                    sails.log.info('no postgres contact found');
                                                                                    sails.log.info('calling full contact api');
                                                                                    FullContactService.callCb(req.user.email, (error, success) => {
                                                                                        if (error) return res.ok({message: 'Unable to call full contact api'}, 'ERROR', 'FAIL');
                                                                                        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                                                                                            conn.sobject('Lead').findOne({Email: req.user.email})
                                                                                                .then(sfdcLead => {
                                                                                                    if (sfdcLead.CRT__c) {
                                                                                                        sails.log.info('Clearing company field');
                                                                                                        delete sfdcLead.Company;
                                                                                                        conn.sobject('Lead').update({
                                                                                                            Id: sfdcLead.Id,
                                                                                                            Company: ''
                                                                                                        });
                                                                                                    }
                                                                                                    store.Lead = sfdcLead;
                                                                                                    conn.sobject('Account').findOne({Domain__c: firebaseDBUser.domain})
                                                                                                        .then(sfdcAccount => {
                                                                                                            if (sfdcAccount) {
                                                                                                                sails.log.info('sfdc account found');
                                                                                                                sails.log.info('saving sfdc account to store');
                                                                                                                store.Account = sfdcAccount;
                                                                                                                flag.postgresAccount = true;
                                                                                                                flag.sfdcAccount = false;
                                                                                                            } else {
                                                                                                            }
                                                                                                            SegmentService.track(req.user.uid, 'Lead Converted', req.user.email);
                                                                                                            conn.sobject('FeedItem').create({
                                                                                                                Title: 'Lead Converted: PendingReview',
                                                                                                                ParentId: store.Lead.Id,
                                                                                                                Type: 'AdvancedTextPost',
                                                                                                                Status: XmlService.buildForPost(store.Lead.Id, 'Lead', 'Notify', 'Lead', null, 'Lead Advanced', '0012800001a7DInAAE'),
                                                                                                                CreatedById: '005280000053XVoAAM'
                                                                                                            })
                                                                                                            sails.log.info('converting lead');
                                                                                                            JsForceService.convertLead(store.Lead.Id, store.Account ? store.Account.Id : null, (error, response) => {
                                                                                                                if (error) {
                                                                                                                    SegmentService.trackBy(req.user.uid, 'Lead Error', {
                                                                                                                        Email: req.user.email,
                                                                                                                        Errors: error
                                                                                                                    });
                                                                                                                    return res(error, "Converting Error", "FAIL");
                                                                                                                }
                                                                                                                conn.sobject('Contact').findOne({Email: req.user.email})
                                                                                                                    .then(sfdcContact => {
                                                                                                                        if (sfdcContact) store.Contact = sfdcContact;

                                                                                                                        //pending
                                                                                                                        if (flag.customer && !store.Account.FeedNotification__c) FlightService.setupCompanyFlight(store.Contact.PartnerId__c, store.Account.Name, store.Account.Id);
                                                                                                                        if (!store.Contact.MemberName__c) {
                                                                                                                            Contact.findOne({MemberName__c: store.Contact.FirstName + store.Contact.LastName})
                                                                                                                                .then(postgreMemberNameContact => {
                                                                                                                                    if (!postgreMemberNameContact) Contact.update({originalId: store.Contact.Id}, {MemberName__c: store.Contact.FirstName.replace(/ /g, '') + store.Contact.LastName.replace(/ /g, '')});
                                                                                                                                    else {
                                                                                                                                        setMemberIdV2(store.Contact, () => {
                                                                                                                                            if (flag.customer) {
                                                                                                                                                FlightService.setupUserFlight('customer', store.Contact.MemberId__c, store.Contact.MemberName__c, store.Contact.Id, null, (notifyFeedId) => {
                                                                                                                                                    SegmentService.track(req.user.uid, 'Customer Added', req.user.email);
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Added: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'created', 'notify', notifyFeedId, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM'
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Activated: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Account Activated', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Associate Added: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, store.Account.Name, 'Notify', 'notify', notifyFeedId, `Associate Added: ${store.Contact.FirstName} ${store.Contact.LastName} `, '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000053XVoAAM',
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Customer Welcome Message: PendingReview',
                                                                                                                                                        ParentId: store.Contact.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Contact.Id, 'Customer', 'Notify', 'notify', notifyFeedId, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                                    });
                                                                                                                                                });
                                                                                                                                            } else {
                                                                                                                                                FlightService.setupUserFlight('member', store.Contact.MemberId__pc, store.Contact.MemberName__pc, null, store.Contact.Id, (notifyFeedId) => {
                                                                                                                                                    SegmentService.track(req.user.uid, 'Member Added', req.user.email);
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Member Added: PendingReview',
                                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                                        Type: 'AdvanceTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        body: XmlService.buildForPost(store.Contact.Id, 'Member', 'created', 'notify', store.Contact.Id, 'Account Created', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '05280000053XVoAAM'
                                                                                                                                                    });
                                                                                                                                                    FeedItem.create({
                                                                                                                                                        Title: 'Member Welcome Message: PendingReview',
                                                                                                                                                        ParentId: store.Account.Id,
                                                                                                                                                        Type: 'AdvancedTextPost',
                                                                                                                                                        Status: 'PendingReview',
                                                                                                                                                        Body: XmlService.buildForPost(store.Account.Id, 'Member', 'Notify', 'notify', store.Contact.Id, 'Welcome to Wine-Oh!', '0012800001a7DInAAE'),
                                                                                                                                                        CreatedById: '005280000051o2xAAA',
                                                                                                                                                    });
                                                                                                                                                });
                                                                                                                                            }
                                                                                                                                        });
                                                                                                                                    }
                                                                                                                                });
                                                                                                                        }
                                                                                                                        FirebaseService.updateUser(req.user.uid, {memberId: store.Contact.MemberId__c});
                                                                                                                        store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                        if (store.Contact.Onboarding__c) return res.ok(store.Contact, 'SUCCESS');
                                                                                                                        if (store.Contact.CRT__c === 'Member') AutopilotService.startJourny(store.Contact.Email, 'member');
                                                                                                                        else AutopilotService.startJourny(store.Contact.Email, 'customer');
                                                                                                                        store.Contact.zendeskUrl = ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture);
                                                                                                                        return res.ok(store.Contact, 'SUCCESS');
                                                                                                                    })
                                                                                                            });
                                                                                                        });
                                                                                                });
                                                                                        });
                                                                                    });
                                                                                }
                                                                            })
                                                                    }
                                                                })
                                                        } else {
                                                            sails.log.info('account not exist in any db');
                                                            return res.ok({message: 'No Account Exist'}, "NOT_FOUND", "FAIL");
                                                        }
                                                    })
                                            }
                                        })
                                });
                            }
                        }).catch(error => {
                        sails.log.info('fetching fails');
                        res.ok({
                            message: 'Something went wrong, please try again later',
                            error: error
                        }, 'ERROR', 'FAIL');
                    })
                }
            });
    }
};

setMemberName = (contact, cb) => {
    var newMemberName = contact.FirstName + contact.LastName + randomstring.generate(4);
    Contact.findOne({MemberName__c: newMemberName})
        .then(postgreContactByMemberName => {
            if (!postgreContactByMemberName) {
                return Contact.update({ContactId: store.contactId}, {MemberName__c: newMemberName});
                cb();
            }
            else setMemberName(contact);
        })
};
setMemberIdV2 = (contact, cb) => {
    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
        var username = (contact.FirstName + contact.LastName).replace(/ /g,'') + shortid.generate();
        conn.sobject('Contact').update({Id: contact.Id, MemberName__c: username})
            .then(response => {
                contact.MemberName__c = username;
                cb(contact)
            })
    });
};