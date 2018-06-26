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
        // "originalId": "string",
        Status: 'boolean',
        HasVerifiedComment: 'boolean',
        HasFeedEntity: 'boolean',
        HasLink: 'boolean',
        HasContent:'boolean',
        BestCommentId: 'string',
        InsertedById: 'string',
        RelatedRecordId: 'string',
        IsRichText: 'boolean',
        LinkUrl: 'string',
        Body: 'string',
        Title: 'string',
        "LikeCount__c": "integer",
        "CommentCount__c": "integer",
        LastEditDate: 'datetime',
        LastEditById: "String",
        Revision:'integer',
        "SystemModstamp": "datetime",
        "LastModifiedDate": "datetime",
        "IsDeleted": "boolean",
        "CreatedDate": "datetime",
        "CreatedById": "string",
        Type: "string",
        ParentId: "string",
        "Id": "integer"
    }
};

