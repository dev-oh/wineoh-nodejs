/**
 * Account.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'drinks__c',
    meta: {
        schemaName: 'sfdc'
    },
    // identity: 'account',
    autoPK: false,
    autoCreatedAt: 'CreatedDate',
    autoUpdatedAt: 'LastModifiedDate',
    attributes: {
        Id: "string",
        IsDeleted: "boolean",
        Name: "string",
        CurrencyIsoCode: "string",
        CreatedDate: "datetime",
        CreatedById: "string",
        LastModifiedDate: "datetime",
        LastModifiedById: "string",
        SystemModstamp: "datetime",
        LastActivityDate: "datetime",
        LastViewedDate: "datetime",
        LastReferencedDate: "datetime",
        Member__c: "string",
        Collection__c: "string",
        Wine__c: "string"
    }
};

