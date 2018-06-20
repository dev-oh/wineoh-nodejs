/**
 * Lead.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'sync_tracker',
    meta: {
        schemaName: 'sfdc'
    },
    // identity: 'account',
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        id: 'string',
        drink__c: 'string'

    },
};