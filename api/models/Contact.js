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
    autoCreatedAt: 'CreatedDate',
    autoUpdatedAt: 'LastModifiedDate',
    attributes: {
                IsDeleted : "boolean",
        MasterRecordId : "string",
        AccountId : "string",
        IsPersonAccount : "boolean",
        LastName : "string",
        FirstName : "string",
        Salutation : "string",
        MiddleName : "string",
        Suffix : "string",
        Name : "string",
        RecordTypeId : "string",
        MailingStreet : "string",
        MailingCity : "string",
        MailingState : "string",
        MailingPostalCode : "string",
        MailingCountry : "string",
        MailingLatitude : "float",
        MailingLongitude : "float",
        MailingGeocodeAccuracy : "string",
        MailingAddress : "string",
        Phone : "string",
        Fax : "string",
        MobilePhone : "string",
        ReportsToId : "string",
        Email : "string",
        Title : "string",
        Department : "string",
        CurrencyIsoCode : "string",
        OwnerId : "string",
        CreatedDate : "datetime",
        CreatedById : "string",
        LastModifiedDate : "datetime",
        LastModifiedById : "string",
        SystemModstamp : "datetime",
        LastActivityDate : "date",
        LastCURequestDate : "datetime",
        LastCUUpdateDate : "datetime",
        LastViewedDate : "datetime",
        LastReferencedDate : "datetime",
        EmailBouncedReason : "string",
        EmailBouncedDate : "datetime",
        IsEmailBounced : "boolean",
        PhotoUrl : "string",
        Jigsaw : "string",
        JigsawContactId : "string",
        YelpURLPerson__c : "string",
        YelpNicknamePerson__c : "string",
        YelpFollowersPerson__c : "float",
        YelpBioPerson__c : "string",
        imgurl__c : "string",
        Salespeople__c : "string",
        ZendeskId__c : "string",
        CRT__c : "string",
        AnonymousId__c : "string",
        Meeting_Type_CP__c : "string",
        No_Show_CP__c : "boolean",
        LID__LinkedIn_Company_Id__c : "string",
        LID__LinkedIn_Member_Token__c : "string",
        AboutMeURLPerson__c : "string",
        AboutMeBioPerson__c : "string",
        AboutMeUsernamePerson__c : "string",
        AngelListBioPerson__c : "string",
        AngelListURLPerson__c : "string",
        AngelListUsernamePerson__c : "string",
        FacebookURLPerson__c : "string",
        GitHubURLPerson__c : "string",
        GitHubUsernamePerson__c : "string",
        GooglePlusURLPerson__c : "string",
        GooglePlusUsernamePerson__c : "string",
        GooglePlusFollowersPerson__c : "float",
        InstagramBioPerson__c : "string",
        InstagramURLPerson__c : "string",
        InstagramUsernamePerson__c : "string",
        InstagramFollowersPerson__c : "float",
        LinkedInBioPerson__c : "string",
        LinkedInURLPerson__c : "string",
        LinkedInUsernamePerson__c : "string",
        LinkedInFollowersPerson__c : "float",
        PinterestURLPerson__c : "string",
        PinterestUsernamePerson__c : "string",
        PinterestFollowersPerson__c : "float",
        QuoraURLPerson__c : "string",
        QuoraBioPerson__c : "string",
        QuoraFollowersPerson__c : "float",
        YouTubeURLPerson__c : "string",
        YouTubeUsernamePerson__c : "string",
        YouTubeFollowersPerson__c : "float",
        TwitterBioPerson__c : "string",
        TwitterURLPerson__c : "string",
        TwitterUsernamePerson__c : "string",
        TwitterFollowersPerson__c : "float",
        KloutPerson__c : "float",
        Skype__c : "string",
        gTalk__c : "string",
        GravatarURLPerson__c : "string",
        Outreach__c : "string",
        Persona__c : "string",
        County__c : "string",
        StateCode__c : "string",
        EmailTwo__c : "string",
        EmailThree__c : "string",
        EmailFour__c : "string",
        AngelListFollowersPerson__c : "float",
        GooglePlusBioPerson__c : "string",
        LinkedIn_Connected__c : "boolean",
        PinterestBioPerson__c : "string",
        YouTubeBioPerson__c : "string",
        Passcode__c : "string",
        Zendesk__Create_in_Zendesk__c : "boolean",
        Zendesk__Last_Sync_Date__c : "datetime",
        Zendesk__Last_Sync_Status__c : "string",
        Zendesk__Result__c : "string",
        Zendesk__Tags__c : "string",
        Zendesk__Zendesk_OutofSync__c : "boolean",
        Zendesk__Zendesk_oldTags__c : "string",
        Zendesk__isCreatedUpdatedFlag__c : "boolean",
        Zendesk__notes__c : "string",
        Zendesk__zendesk_id__c : "string",
        MemberId__c : "string",
        MembershipStart__c : "date",
        ExtensionDays__c : "float",
        Extensions__c : "float",
        CompSum__c : "float",
        PaidSum__c : "float",
        EarnSum__c : "float",
        MembershipEnd__c : "date",
        EndToToday__c : "float",
        StatusPerson__c : "string",
        uid__c : "string",
        Activated__c : "datetime",
        statusChanged__c : "datetime",
        LastLoginPerson__c : "datetime",
        LastUpdatedPerson__c : "datetime",
        PasswordChanged__c : "datetime",
        TransitioningToStatus__c : "string",
        Login__c : "string",
        PartnerId__c : "string",
        StatusPersonCopy__c : "string",
        FacebookId__c : "string",
        Timezone__c : "string",
        Gender__c : "string",
        StatusMarital__c : "string",
        AnnualIncome__c : "string",
        Education__c : "string",
        StatusEmployment__c : "string",
        Kids__c : "boolean",
        StoreOne__c : "string",
        StoreTwo__c : "string",
        StoreThree__c : "string",
        StoreFour__c : "string",
        StoreFive__c : "string",
        Onboarding__c: "boolean",
        FullContactUpdated__c : "datetime",
        MemberName__c: 'string',
        Id : "integer"

    }
};