var jsforce = require('jsforce');
var conn = new jsforce.Connection();
var Creds = require('./../../config/secrets/creds');
module.exports = {
    setupCompanyFlight: (partnerId, accountname, accountId) => {
        Flight__c.create({
            FeedGroup__c: 'company',
            FeedName__c: partnerId,
            Hashtag__c: accountname.replace(/ /g, ''),
            Type__c: 'Flat',
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group company created')})
            .catch(error=>{sails.log.error(error)});
        Flight__c.create({
            FeedGroup__c: 'timeline',
            FeedName__c: partnerId,
            Hashtag__c: null,
            Type__c: 'Flat',
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group timeline created')})
            .catch(error=>{sails.log.error(error)});
        Flight__c.create({
            FeedGroup__c: 'timeline_aggregated',
            FeedName__c: partnerId,
            Hashtag__c: null,
            Type__c: 'Aggregate',
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group timeline aggregated created')})
            .catch(error=>{sails.log.error(error)});
        Flight__c.create({
            FeedGroup__c: 'fyi',
            FeedName__c: partnerId,
            Hashtag__c: null,
            Type__c: 'Notification',
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group fyi created')})
            .catch(error=>{sails.log.error(error)});
        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            conn.sobject('Flight__c').create({
                FeedGroup__c: 'notification',
                FeedName__c: partnerId,
                Hashtag__c: null,
                Type__c: 'Notification',
                OwnerAccount__c: accountId
            }).then(response=>{
                Account.update({originalId: accountId},{FeedNotification__c: response.id});
            }).catch(error=>{sails.log.error(error)});
        });
    },
    setupUserFlight: (group,memberId,memberName,customerId,accountId,cb)=>{
        Flight__c.create({
            FeedGroup__c: group,
            FeedName__c: memberId,
            Hashtag__c: memberName,
            Type__c: 'Flat',
            OwnerContact__c: customerId,
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group created')})
            .catch(error=>{sails.log.error(error)});
        Flight__c.create({
            FeedGroup__c: 'timeline',
            FeedName__c: memberId,
            Hashtag__c: null,
            Type__c: 'Flat',
            OwnerContact__c:customerId,
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group timeline created')})
            .catch(error=>{sails.log.error(error)});
        Flight__c.create({
            FeedGroup__c: 'time_agg',
            FeedName__c: memberId,
            Hashtag__c: null,
            Type__c: 'Aggregate',
            OwnerContact__c:customerId,
            OwnerAccount__c: accountId
        }).then(response=>{ sails.log.info('filght group time_agg created')})
            .catch(error=>{sails.log.error(error)});
        conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
            conn.sobject('Flight__c').create({
                FeedGroup__c: 'notification',
                FeedName__c: memberId,
                Hashtag__c: null,
                Type__c: 'Notification',
                OwnerContact__c: customerId,
                OwnerAccount__c: accountId
            }).then(response=>{
                if(customerId){
                    Contact.update({originalId: customerId},{FeedNotification__c: response.id})
                    cb(response.id)
                }else if(memberId){
                    Account.update({originalId: memberId},{FeedNotification__pc: response.id})
                    cb(response.id)
                }
            })
        });
    },
};