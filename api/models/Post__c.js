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
        "OwnerId": "string",
        "IsDeleted": "boolean",
        "Name": "string",
        "CurrencyIsoCode": "string",
        "RecordTypeId": "string",
        "CreatedDate": "datetime",
        "CreatedById": "string",
        "LastModifiedDate": "datetime",
        "LastModifiedById": "string",
        "SystemModstamp": "datetime",
        "LastViewedDate": "datetime",
        "LastReferencedDate": "datetime",
        "Seller__c": "string",
        "AccountActor__c": "string",
        "transactionId__c": "string",
        "Constant__c": "float",
        "Clearinghouse__c": "string",
        "Collection__c": "string",
        "DateSent__c": "datetime",
        "DatePayment__c": "datetime",
        "DatePending__c": "datetime",
        "DateProcessed__c": "datetime",
        "MetonymName__c": "string",
        "Location__c": "string",
        "Quantity__c": "float",
        "Receipt__c": "string",
        "DateReceived__c": "datetime",
        "StatusBuyValidation__c": "string",
        "Stock__c": "string",
        "ContainerType__c": "string",
        "ValidationId__c": "string",
        "Vintage__c": "string",
        "Wine__c": "string",
        "OfferOne__c": "string",
        "OfferTwo__c": "string",
        "OfferThree__c": "string",
        "TypeBottle__c": "string",
        "TypeGlass__c": "string",
        "Rating__c": "float",
        "VarietalTagMatch__c": "float",
        "WineTagMatch__c": "float",
        "Recommendation__c": "string",
        "WineOther__c": "string",
        "MemberOther__c": "string",
        "Metonym__c": "string",
        "Drink__c": "string",
        "Pairing__c": "string",
        "Customer__c": "string",
        "Pending__c": "boolean",
        "DatePurchase__c": "date",
        "ExtendedPrice__c": "float",
        "SavingsSum__c": "float",
        "CLUB__c": "float",
        "EDLP__c": "float",
        "MSRP__c": "float",
        "SALE__c": "float",
        "PriceType__c": "string",
        "SavingsPercent__c": "float",
        "Buy__c": "string",
        "AmountOz__c": "float",
        "AmountML__c": "float",
        "Description__c": "string",
        "Like__c": "float",
        "Tagging__c": "string",
        "TagId__c": "string",
        "TagName__c": "string",
        "StreamId__c": "string",
        "Verb__c": "string",
        "Producer__c": "string",
        "PriceFormula__c": "float",
        "MasterPostId__c": "string",
        "FeedItemId__c": "string",
        "Body__c": "string",
        "From__c": "string",
        "Flight__c": "string",
        "LikeCount__c": "float",
        "CommentCount__c": "float",
        "Image__c": "string",
        "Share__c": "boolean",
        "LikeFirst__c": "datetime",
        "LikeLast__c": "datetime",
        "CommentFirst__c": "datetime",
        "CommentLast__c": "datetime",
        "StreamDatetime__c": "datetime",
        "StreamSync__c": "boolean",
        "Deadline__c": "datetime",
        "ActorName__c": "string",
        "ContactActor__c": "string",
        "Price__c": "string",
        "OffersTotal__c": "float",
        "Order__c": "float",
        "Activity__c": "string",
        "Summary__c": "string",
        "TagType__c": "string",
        "UPCA__c": "string",
        "Rewards__c": "float",
        "originalId": "string",
        "Id": "integer"
    }
};

