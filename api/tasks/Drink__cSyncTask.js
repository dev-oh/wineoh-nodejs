var jsforce = require('jsforce');
var conn = new jsforce.Connection();
var Creds = require('./../../config/secrets/creds');
var moment = require('moment');
var _ = require('lodash');

module.exports = {
    // schedule: '*/15 * * * * *', //every 5 second
    // task: function () {
    //     sails.log.info("Sync Cron Job");
    //     Syncer.findOne({id: 1})
    //         .then(syncTracker => {
    //             console.log({pickedDate: syncTracker.drink__c});
    //             var date = new Date(syncTracker.drink__c);
    //             console.log('connecting to sfdc');
    //             conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
    //                 if (!error) {
    //                     console.log('connected');
    //                     console.log('selecting data')
    //                     conn.query("SELECT Id,LastModifiedDate from drinks__c where LastModifiedDate>" + date.toISOString(), (error, result) => {
    //                         console.log('selected');
    //                         if (!error) {
    //                             var timestamp = new Date("YYYY-MM-DDTHH:mm:ss.SSSZ");
    //                             var updates = _.map(result.records, 'Id');
    //                             console.log({
    //                                 last_sync: syncTracker.drink__c,
    //                                 next_sync: timestamp,
    //                                 updates: result.records
    //                             })
    //                         } else {
    //                             console.error(error);
    //                         }
    //                     });
    //                 } else {
    //                     console.error(error);
    //                 }
    //             });
    //
    //             // var synctime = moment(syncTracker.drink__c);
    //             // console.log(`last synced on ${syncTracker.drink__c} === ${synctime.toISOString()}`);
    //             // sails.log.info('connection to sfdc');
    //             // conn.login(Creds.salesforceCreds.email, Creds.salesforceCreds.password, (error, info) => {
    //             //     sails.log.info('connected');
    //             //     sails.log.info('searching sfdc for new updates');
    //             //     conn.query("SELECT Id,LastModifiedDate from drinks__c where LastModifiedDate>" + synctime.toISOString(), (error, result) => {
    //             //         if (error) console.log(error);
    //             //         else {
    //             //             var updates = _.map(result.records, 'Id');
    //             //             var timeStamp = new Date();
    //             // Syncer.update({id: '1'},{drink__c: timeStamp.toISOString()})
    //             //     .then(data=>{console.log(data)})
    //             //     .catch(error=>{console.log(error)});
    //             // updates.forEach(Id=>{
    //             //     conn.sobject('drinks__c').findOne({Id: Id})
    //             //         .then(sfdcRecord=>{
    //             //             Drinks__c.findOne({Id:Id})
    //             //                 .then(postgreRecord=>{
    //             //                     if(postgreRecord){
    //             //                         Drinks__c.update({Id:Id},sfdcRecord);
    //             //                     }else{
    //             //                         Drinks__c.create(sfdcRecord)
    //             //                     }
    //             //                 })
    //             //         })
    //             // });
    //             //             console.log({
    //             //                 recordToCreateOrUpdate: updates,
    //             //                 newTimeStamp : timeStamp
    //             //             })
    //             //         }
    //             //     })
    //             //
    //             // });
    //
    //
    //         })
    // }
};