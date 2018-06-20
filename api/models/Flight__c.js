/**
 * Account.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'Flight__c',
    meta: {
        schemaName: 'sfdc'
    },
    // identity: 'account',
    autoPK: false,
    autoCreatedAt: 'CreatedDate',
    autoUpdatedAt: 'LastModifiedDate',
    attributes: {
        OwnerId: {
            type: 'string',
            defaultsTo: ''
        },
        IsDeleted:{
            type: "boolean",
            defaultsTo: false
        },
        Name: "string",
        CurrencyIsoCode: "string",
        CreatedDate: "datetime",
        CreatedById: "string",
        LastModifiedDate: "datetime",
        LastModifiedById: "string",
        SystemModstamp: "datetime",
        LastViewedDate: "datetime",
        LastReferencedDate: "datetime",
        FeedName__c: "string",
        Type__c: "string",
        FeedGroup__c: "string",
        Hashtag__c: "string",
        OwnerAccount__c: "string",
        OwnerContact__c: "string",
        Id: "integer",
        originalId: "string"
    }
};

