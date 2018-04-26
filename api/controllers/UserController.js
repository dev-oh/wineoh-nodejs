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
        console.log("fetching user from firebase");
        FirebaseService.getUser(req.user.uid)
            .then(data => {
                var rtdbUser = data.val();
                console.log(rtdbUser);
                console.log("fetched");
                if (rtdbUser.memberId) {
                    res.ok(rtdbUser);
                } else {
                    console.log('connecting to sfdc');
                    conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
                        console.log('connected');
                        promise.push(Account.findOne({Domain__c: rtdbUser.domain}));
                        promise.push(Contact.findOne({Email: req.user.email}));
                        promise.push(Lead.findOne({Email: req.user.email}));
                        promise.push(conn.sobject('Lead').find({Email: req.user.email}));
                        promise.push(conn.sobject('Contact').find({Email: req.user.email}));
                        Promise.all(promise)
                            .then(_.spread((account, contact, lead, sfdcLead,sfdcContact) => {
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
                                }else{
                                    if(!sfdcContact) return res.ok('There is some problem with your account, please contact support','Contact support','FAIL');
                                }
                                Promise.all(promiseLvl2)
                                    .then(data => {
                                        if(sfdcContact){
                                            store.contactId = sfdcContact.id;
                                            SegmentService.trackBy(req.user.uid,'Contact Updated',{contactId: store.contactId});
                                        }
                                        if(account){
                                            if(account.StatusAccount__c === 'Suspended'){
                                                SegmentService.trackBy(req.user.uid,'Account Flagged',{Type: 'Suspended Account Login Attempt',Email: req.user.email});
                                                res.ok('Your Account is Suspended','Suspended Account','FAIL')
                                            }else if(account.StatusAccount__c === 'On Hold'){
                                                SegmentService.trackBy(req.user.uid,'Account Flagged',{Type: 'On Hold Account Login Attempt',Email: req.user.email});
                                                res.ok('Your Account is On Hold','Account On-Hold','FAIL')
                                                //doSomething
                                            }else if(account.StatusAccount__c === 'Inactive'){
                                                SegmentService.trackBy(req.user.uid,'Contact Added',{Type: 'Admin',Email: req.user.email});
                                            }else if(account.StatusAccount__c === 'Active'){

                                            }
                                        }else{
                                            store.Lead.CRT__c = '01228000000TLju';
                                            FullContactService.call(req.user.email);
                                            store.Lead.isConverted = true;
                                        }
                                        conn.sobject('Lead').update(store.Lead)
                                            .then('')
                                        res.ok(store)
                                    })
                                // res.ok(data);

                            }))
                    })
                }
            })
    }
};