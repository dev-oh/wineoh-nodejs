/**
 * Contact.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'Contact',
    meta: {
        schemaName: 'sfdc'
    },
    // identity: 'account',
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        AccountId: 'string',
        FirstName: 'string',
        MiddleName: 'string',
        LastName: 'string',
        Name: 'string',
        RecordTypeId: 'string',
        Phone: 'string',
        MobilePhone: 'string',
        Email: 'string',
        Title: 'string',
        Department: 'string',
        StatusPerson__c: 'string',
        uid__c: 'string',
        IsDeleted: {
            type: 'boolean',
            // defaultsTo: false
        }
    }
};