/**
 * Account.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'Account',
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
        Name : "string",
        LastName : "string",
        FirstName : "string",
        Salutation : "string",
        MiddleName : "string",
        Suffix : "string",
        Type : "string",
        RecordTypeId : "string",
        ParentId : "string",
        BillingStreet : "string",
        BillingCity : "string",
        BillingState : "string",
        BillingPostalCode : "string",
        BillingCountry : "string",
        BillingLatitude : "float",
        BillingLongitude : "float",
        BillingGeocodeAccuracy : "string",
        BillingAddress : "string",
        ShippingStreet : "string",
        ShippingCity : "string",
        ShippingState : "string",
        ShippingPostalCode : "string",
        ShippingCountry : "string",
        ShippingLatitude : "float",
        ShippingLongitude : "float",
        ShippingGeocodeAccuracy : "string",
        ShippingAddress : "string",
        Phone : "string",
        Fax : "string",
        AccountNumber : "string",
        Website : "string",
        PhotoUrl : "string",
        Sic : "string",
        Industry : "string",
        AnnualRevenue : "float",
        NumberOfEmployees : "integer",
        Ownership : "string",
        TickerSymbol : "string",
        Description : "string",
        Rating : "string",
        Site : "string",
        CurrencyIsoCode : "string",
        OwnerId : "string",
        CreatedDate : "datetime",
        CreatedById : "string",
        LastModifiedDate : "datetime",
        LastModifiedById : "string",
        SystemModstamp : "datetime",
        LastActivityDate : "date",
        LastViewedDate : "datetime",
        LastReferencedDate : "datetime",
        PersonContactId : "string",
        IsPersonAccount : "boolean",
        PersonMailingStreet : "string",
        PersonMailingCity : "string",
        PersonMailingState : "string",
        PersonMailingPostalCode : "string",
        PersonMailingCountry : "string",
        PersonMailingLatitude : "float",
        PersonMailingLongitude : "float",
        PersonMailingGeocodeAccuracy : "string",
        PersonMailingAddress : "string",
        PersonOtherStreet : "string",
        PersonOtherCity : "string",
        PersonOtherState : "string",
        PersonOtherPostalCode : "string",
        PersonOtherCountry : "string",
        PersonOtherLatitude : "float",
        PersonOtherLongitude : "float",
        PersonOtherGeocodeAccuracy : "string",
        PersonOtherAddress : "string",
        PersonMobilePhone : "string",
        PersonHomePhone : "string",
        PersonOtherPhone : "string",
        PersonAssistantPhone : "string",
        PersonEmail : "string",
        PersonTitle : "string",
        PersonDepartment : "string",
        PersonAssistantName : "string",
        PersonLeadSource : "string",
        PersonBirthdate : "date",
        PersonHasOptedOutOfEmail : "boolean",
        PersonHasOptedOutOfFax : "boolean",
        PersonDoNotCall : "boolean",
        PersonLastCURequestDate : "datetime",
        PersonLastCUUpdateDate : "datetime",
        PersonEmailBouncedReason : "string",
        PersonEmailBouncedDate : "datetime",
        Jigsaw : "string",
        JigsawCompanyId : "string",
        AccountSource : "string",
        SicDesc : "string",
        IdDir__c : "string",
        ImageURL__c : "string",
        ART__c : "string",
        Domain__c : "string",
        Action__c : "string",
        Domain_Json__c : "string",
        LID__LinkedIn_Company_Id__c : "string",
        FacebookURLCompany__c : "string",
        GooglePlusURLCompany__c : "string",
        instagramURLCompany__c : "string",
        TwitterURLCompany__c : "string",
        YouTubeURLCompany__c : "string",
        LinkedInURLCompany__c : "string",
        County__c : "string",
        StateCode__c : "string",
        AngelListURLCompany__c : "string",
        AngelListUsernameCompany__c : "string",
        AngelListBioCompany__c : "string",
        AngelListFollowersCompany__c : "float",
        InstagramUsernameCompany__c : "string",
        InstagramFollowersCompany__c : "float",
        InstagramBioCompany__c : "string",
        GooglePlusBioCompany__c : "string",
        GooglePlusFollowersCompany__c : "float",
        GooglePlusUsernameCompany__c : "string",
        LinkedInUsernameCompany__c : "string",
        LinkedInBioCompany__c : "string",
        LinkedInFollowersCompany__c : "float",
        PinterestURLCompany__c : "string",
        PinterestFollowersCompany__c : "float",
        PinterestUsernameCompany__c : "string",
        PinterestBioCompany__c : "string",
        TwitterUsernameCompany__c : "string",
        TwitterBioCompany__c : "string",
        TwitterFollowersCompany__c : "float",
        KloutCompany__c : "float",
        YouTubeBioCompany__c : "string",
        YouTube_Followers_A__c : "float",
        YouTubeUsernameCompany__c : "string",
        StatusAccount__c : "string",
        Zendesk__Create_in_Zendesk__c : "boolean",
        Zendesk__Domain_Mapping__c : "string",
        Zendesk__Last_Sync_Date__c : "datetime",
        Zendesk__Last_Sync_Status__c : "string",
        Zendesk__Notes__c : "string",
        Zendesk__Result__c : "string",
        Zendesk__Tags__c : "string",
        Zendesk__Zendesk_Organization_Id__c : "string",
        Zendesk__Zendesk_Organization__c : "string",
        Zendesk__Zendesk_OutofSync__c : "boolean",
        Zendesk__Zendesk_oldTags__c : "string",
        Zendesk__createdUpdatedFlag__c : "boolean",
        PartnerId__c : "string",
        WineSearcherURL__c : "string",
        PhoneTwo__c : "string",
        PhoneThird__c : "string",
        PhoneFourth__c : "string",
        PhoneFIfth__c : "string",
        Founded__c : "string",
        Recommendations__c : "float",
        MemberLocationLive__Latitude__s : "float",
        MemberLocationLive__Longitude__s : "float",
        MemberLocationLive__c : "string",
        MemberLocationSpecified__c : "string",
        PricingAccuracy__c : "float",
        iDGWDB__c : "string",
        FullContactUpdated__c : "datetime",
        FeeTypeFirst__c : "string",
        FeeTypeNth__c : "string",
        FeePercentageFirst__c : "float",
        FeePercentageNth__c : "float",
        FeeAmountFirst__c : "float",
        FeeAmountNth__c : "float",
        IdTemp__c : "string",
        YelpURLPerson__pc : "string",
        YelpNicknamePerson__pc : "string",
        YelpFollowersPerson__pc : "float",
        YelpBioPerson__pc : "string",
        imgurl__pc : "string",
        Salespeople__pc : "string",
        ZendeskId__pc : "string",
        CRT__pc : "string",
        Action__pc : "string",
        AnonymousId__pc : "string",
        Adult__pc : "boolean",
        Primary__pc : "boolean",
        Logins__pc : "float",
        No_Show_CP__pc : "boolean",
        LID__LinkedIn_Company_Id__pc : "string",
        LID__LinkedIn_Member_Token__pc : "string",
        AboutMeURLPerson__pc : "string",
        AboutMeBioPerson__pc : "string",
        AboutMeUsernamePerson__pc : "string",
        AngelListBioPerson__pc : "string",
        AngelListURLPerson__pc : "string",
        AngelListUsernamePerson__pc : "string",
        FacebookURLPerson__pc : "string",
        GitHubURLPerson__pc : "string",
        GitHubUsernamePerson__pc : "string",
        GooglePlusURLPerson__pc : "string",
        GooglePlusUsernamePerson__pc : "string",
        GooglePlusFollowersPerson__pc : "float",
        InstagramBioPerson__pc : "string",
        InstagramURLPerson__pc : "string",
        InstagramUsernamePerson__pc : "string",
        InstagramFollowersPerson__pc : "float",
        LinkedInBioPerson__pc : "string",
        LinkedInURLPerson__pc : "string",
        LinkedInUsernamePerson__pc : "string",
        LinkedInFollowersPerson__pc : "float",
        PinterestURLPerson__pc : "string",
        PinterestUsernamePerson__pc : "string",
        PinterestFollowersPerson__pc : "float",
        QuoraURLPerson__pc : "string",
        QuoraBioPerson__pc : "string",
        QuoraFollowersPerson__pc : "float",
        YouTubeURLPerson__pc : "string",
        YouTubeUsernamePerson__pc : "string",
        YouTubeFollowersPerson__pc : "float",
        TwitterBioPerson__pc : "string",
        TwitterURLPerson__pc : "string",
        TwitterUsernamePerson__pc : "string",
        TwitterFollowersPerson__pc : "float",
        KloutPerson__pc : "float",
        Skype__pc : "string",
        gTalk__pc : "string",
        GravatarURLPerson__pc : "string",
        Outreach__pc : "string",
        Persona__pc : "string",
        County__pc : "string",
        StateCode__pc : "string",
        EmailTwo__pc : "string",
        EmailThree__pc : "string",
        EmailFour__pc : "string",
        AngelListFollowersPerson__pc : "float",
        SequenceIdActive__pc : "string",
        GooglePlusBioPerson__pc : "string",
        LinkedIn_Connected__pc : "boolean",
        PinterestBioPerson__pc : "string",
        YouTubeBioPerson__pc : "string",
        SequenceIdCurrent__pc : "string",
        Passcode__pc : "string",
        Zendesk__Create_in_Zendesk__pc : "boolean",
        Zendesk__Last_Sync_Date__pc : "datetime",
        Zendesk__Last_Sync_Status__pc : "string",
        Zendesk__Result__pc : "string",
        Zendesk__Tags__pc : "string",
        Zendesk__Zendesk_OutofSync__pc : "boolean",
        Zendesk__Zendesk_oldTags__pc : "string",
        Zendesk__isCreatedUpdatedFlag__pc : "boolean",
        Zendesk__notes__pc : "string",
        Zendesk__zendesk_id__pc : "string",
        SequenceNumberCurrent__pc : "float",
        SequencesCountActive__pc : "float",
        MemberId__pc : "string",
        MembershipStart__pc : "date",
        ExtensionDays__pc : "float",
        Extensions__pc : "float",
        CompSum__pc : "float",
        PaidSum__pc : "float",
        EarnSum__pc : "float",
        MembershipEnd__pc : "date",
        EndToToday__pc : "float",
        StatusPerson__pc : "string",
        uid__pc : "string",
        Activated__pc : "datetime",
        statusChanged__pc : "datetime",
        LastLoginPerson__pc : "datetime",
        LastUpdatedPerson__pc : "datetime",
        PasswordChanged__pc : "datetime",
        TransitioningToStatus__pc : "string",
        Login__pc : "string",
        PartnerId__pc : "string",
        StatusPersonCopy__pc : "string",
        FacebookId__pc : "string",
        Timezone__pc : "string",
        Gender__pc : "string",
        StatusMarital__pc : "string",
        AnnualIncome__pc : "string",
        Education__pc : "string",
        StatusEmployment__pc : "string",
        Kids__pc : "boolean",
        StoreOne__pc : "string",
        StoreTwo__pc : "string",
        StoreThree__pc : "string",
        StoreFour__pc : "string",
        StoreFive__pc : "string",
        FullContactUpdated__pc : "datetime",
        TasksCountActive__pc : "float",
        SequenceNameActive__pc : "string",
        SequenceUsernameCurrent__pc : "string",
        SequenceNameCurrent__pc : "string",
        SequenceStatusCurrent__pc : "string",
        SequenceStepTypeCurrent__pc : "string",
        PersonalNote1__pc : "string",
        PersonalNote2__pc : "string",
        PersonNote1__pc : "string",
        PersonNote2__pc : "string",
        OOTO__pc : "boolean",
        SequencingActive__pc : "boolean",
        TaskDueDatetimeActive__pc : "datetime",
        GooglePlusURLCompany__pc : "string",
        Extension__pc : "string",
        PhoneOther__pc : "string",
        Meeting_Type_CP__pc : "string",
        DOB__pc : "date",
        Id : "integer",
    }
};

