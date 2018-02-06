/**
 * Lead.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'Lead',
    meta: {
        schemaName: 'sfdc'
    },
    // identity: 'account',
    autoPK: false,
    autoCreatedAt: 'CreatedDate',
    autoUpdatedAt: 'LastModifiedDate',
    attributes: {
        MasterRecordId: 'string',
        FirstName: 'string',
        MiddleName: 'string',
        LastName: 'string',
        Name: 'string',
        RecordTypeId: 'string',
        Phone: 'string',
        MobilePhone: 'string',
        Email: 'string',
        Title: 'string',
        Company: 'string',
        Street: 'string',
        City: 'string',
        State: 'string',
        PostalCode: 'string',
        Country: 'string',
        Address: 'string',
        Website: 'string',
        Description: 'string',
        ART__c: 'string',
        Address: 'string',
        IsDeleted: {
             type: 'boolean',
             defaultsTo: false
        },
        Status: 'string',
        OwnerId: 'string',
        IsConverted: {
            type: 'boolean',
            defaultsTo: false
        },
        CreatedById: 'string',
        IsUnreadByOwner: {
            type: 'boolean',
            defaultsTo: false
        },
        LastModifiedById: 'string',
        No_Show_CP__c: {
            type: 'boolean',
            defaultsTo: false
        },
        SystemModstamp: 'datetime',
        Zendesk__Create_in_Zendesk__c: {
            type: 'boolean',
            defaultsTo: false
        },
        Zendesk__isCreatedUpdatedFlag__c:  {
            type: 'boolean',
            defaultsTo: false
        },
        Zendesk__Zendesk_OutofSync__c:  {
            type: 'boolean',
            defaultsTo: false
        },
    }
};