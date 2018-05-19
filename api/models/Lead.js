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
        // Id: 'string',
        IsConverted: {
            type: 'boolean',
            defaultsTo: false
        },
        IsUnreadByOwner: {
            type: 'boolean',
            defaultsTo: true
        },
        No_Show_CP__c: {
            type: 'boolean',
            defaultsTo: false
        },
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


        "IsDeleted": {
            type:"boolean",
            defaultsTo: false
        },
        "MasterRecordId": "string",
        "LastName": "string",
        "FirstName": "string",
        "Salutation": "string",
        "MiddleName": "string",
        "Suffix": "string",
        "Name": "string",
        "RecordTypeId": "string",
        "Title": "string",
        "Company": "string",
        "Street": "string",
        "City": "string",
        "State": "string",
        "PostalCode": "string",
        "Country": "string",
        "Latitude": "float",
        "Longitude": "float",
        "GeocodeAccuracy": "string",
        "Address": "text",
        "Phone": "string",
        "MobilePhone": "string",
        "Email": "string",
        "Website": "string",
        "PhotoUrl": "string",
        "Description": "text",
        "LeadSource": "string",
        "Status": "string",
        "Industry": "string",
        "Rating": "string",
        "CurrencyIsoCode": "string",
        "NumberOfEmployees": "integer",
        "OwnerId": {
            type:"string",
            defaultsTo: ''
        },
        "ConvertedDate": "date",
        "ConvertedAccountId": "string",
        "ConvertedContactId": "string",
        "ConvertedOpportunityId": "string",
        "CreatedDate": "datatime",
        "CreatedById": {
            type: "string",
            defaultsTo: ''
        },
        "LastModifiedDate": "datatime",
        "LastModifiedById": {
            type: "string",
            defaultsTo: '',
        },
        "SystemModstamp": {
            type: "datetime",
            defaultsTo: '2017-11-07 22:01:58'
        },
        "LastActivityDate": "date",
        "LastViewedDate": "datatime",
        "LastReferencedDate": "datatime",
        "Jigsaw": "string",
        "JigsawContactId": "string",
        "EmailBouncedReason": "string",
        "EmailBouncedDate": "datatime",
        "AnnualRevenue__c": "string",
        "Employees__c": "string",
        "PhoneDirect__c": "string",
        "Extension__c": "string",
        "Pause__c": "date",
        "AnonymousId__c": "string",
        "Summary__c": "string",
        "Funded__c": "string",
        "Public__c": "string",
        "Alexa__c": "float",
        "eCom__c": "text",
        "LeadSourceSpecific__c": "string",
        "Meeting_Type_CP__c": "string",
        "Salespeople__c": "string",
        "CRT__c": "string",
        "uid__c": "string",
        "Domain__c": "string",
        "StatusPerson__c": "string",
        "Action__c": "string",
        "AnnualIncome__c": "string",
        "CRM__c": "text",
        "Project__c": "string",
        "Project_Phase__c": "string",
        "Priority__c": "string",
        "OwnerRole__c": "string",
        "Persona__c": "string",
        "Outreach__c": "string",
        "StateCode__c": "string",
        "County__c": "string",
        "Gender__c": "string",
        "gTalk__c": "string",
        "Skype__c": "string",
        "Phase__c": "string",
        "Picture__c": "string",
        "imgurl__c": "string",
        "matchmaker__c": "string",
        "Overload__c": "string",
        "SubordinateOne__c": "string",
        "SubordinateTwo__c": "string",
        "Influencer__c": "string",
        "email_bullseye__c": "string",
        "backdoor__c": "string",
        "Target__c": "string",
        "Bullseye_outer__c": "string",
        "Type__c": "string",
        "target_name__c": "string",
        "OverlordName__c": "string",
        "MyNextDate__c": "datatime",
        "InfluencerName__c": "string",
        "SubordinateOneName__c": "string",
        "OuterName__c": "string",
        "Timezone__c": "string",
        "LID__LinkedIn_Company_Id__c": "string",
        "LID__LinkedIn_Member_Token__c": "string",
        "YouTubeURLPerson__c": "string",
        "AboutMeUsername__c": "string",
        "AboutMeBio__c": "string",
        "AngelListBioPerson__c": "string",
        "AngelListUsernamePerson__c": "string",
        "GitHubUsername__c": "string",
        "GooglePlusUsernameCompany__c": "string",
        "InstagramBioPerson__c": "string",
        "LinkedInBioPerson__c": "string",
        "LinkedInUsernamePerson__c": "string",
        "PinterestUsernamePerson__c": "string",
        "XingUsernamePerson__c": "string",
        "XingBioPerson__c": "string",
        "InstagramFollowersPerson__c": "float",
        "QuoraBioPerson__c": "string",
        "QuoraFollowers__c": "float",
        "YouTubeFollowersPerson__c": "float",
        "YouTubeUsernamePerson__c": "string",
        "TwitterUsernamePerson__c": "string",
        "TwitterBioPerson__c": "string",
        "AngelListFollowersPerson__c": "float",
        "AngelListURLCompany__c": "string",
        "AngelListUsernameCompany__c": "string",
        "AngelListBioCompany__c": "string",
        "AngelListFollowersCompany__c": "float",
        "FacebookURLCompany__c": "string",
        "instagramURLCompany__c": "string",
        "InstagramBioCompany__c": "string",
        "InstagramFollowersCompany__c": "float",
        "GooglePlusBioCompany__c": "string",
        "GooglePlusURLPerson__c": "string",
        "GooglePlusUsernamePerson__c": "string",
        "GooglePlusFollowersPerson__c": "float",
        "GooglePlusBioPerson__c": "string",
        "LinkedInBioCompany__c": "string",
        "LinkedInFollowersCompany__c": "float",
        "LinkedInUsernameCompany__c": "string",
        "PinterestBioPerson__c": "string",
        "PinterestBioCompany__c": "string",
        "PinterestFollowersCompany__c": "float",
        "PinterestURLCompany__c": "string",
        "PinterestUsernameCompany__c": "string",
        "TwitterBioCompany__c": "string",
        "TwitterFollowersCompany__c": "float",
        "TwitterUsernameCompany__c": "string",
        "KloutCompany__c": "float",
        "YouTubeBioPerson__c": "string",
        "YouTubeBioCompany__c": "string",
        "YouTubeFollowersCompany__c": "float",
        "YouTubeUsernameCompany__c": "string",
        "YouTubeURLCompany__c": "string",
        "ART__c": "string",
        "Zendesk__Last_Sync_Date__c": "datatime",
        "Zendesk__Last_Sync_Status__c": "string",
        "Zendesk__Result__c": "string",
        "Zendesk__Tags__c": "text",
        "Zendesk__Zendesk_id__c": "string",
        "Zendesk__Zendesk_oldTags__c": "text",
        "Zendesk__notes__c": "string",
        "Zendesk__organization__c": "string",
        "Id": "integer",
        "AutoPilotContactId__c": "text",
        "Fax": "string",
        "AnnualRevenue": "float",
        "HasOptedOutOfEmail": "boolean",
        "DoNotCall": "boolean",
        "HasOptedOutOfFax": "boolean",
        "Founded__c": "string",
        "YelpNicknamePerson__c": "string",
        "YelpURLPerson__c": "string",
        "YelpBioPerson__c": "string",
        "AboutMeUrl__c": "string",
        "Email2__c": "string",
        "Email3__c": "string",
        "Email4__c": "string",
        "Email5__c": "string",
        "FacebookURLPerson__c": "string",
        "GitHubURLPerson__c": "string",
        "GooglePlusFollowersCompany__c": "float",
        "GooglePlusURLCompany__c": "string",
        "GravatarURLPerson__c": "string",
        "InstagramURLPerson__c": "string",
        "KloutPerson__c": "float",
        "LeadSourceDetail__c": "string",
        "LinkedInFollowersPerson__c": "float",
        "LinkedInURLCompany__c": "string",
        "LinkedInURLPersonal__c": "string",
        "MyNextStep__c": "string",
        "PhoneOther__c": "string",
        "PinterestFollowersPerson__c": "float",
        "PinterestURLPerson__c": "string",
        "QuoraURLPerson__c": "string",
        "TwitterFollowersPerson__c": "float",
        "TwitterURLCompany__c": "string",
        "TwitterURLPerson__c": "string",
        "TwoStringResearch__c": "string",
        "TwoStringStatus__c": "string",
        "XingURLPerson__c": "string",
        "AngelListURLPerson__c": "string",
        "Adult__c": "boolean",
        "SequenceIdActive__c": "string",
        "SequenceIdCurrent__c": "string",
        "SequenceNumberCurrent__c": "float",
        "SequencesCountActive__c": "float",
        "TasksCountActive__c": "float",
        "SequenceNameActive__c": "string",
        "SequenceUsernameCurrent__c": "string",
        "SequenceNameCurrent__c": "string",
        "SequenceStatusCurrent__c": "string",
        "SequenceStepTypeCurrent__c": "string",
        "PersonalNote1__c": "string",
        "PersonalNote2__c": "string",
        "PersonNote1__c": "string",
        "PersonNote2__c": "string",
        "OOTO__c": "boolean",
        "SequencingActive__c": "boolean",
        "TaskDueDatetimeActive__c": "datatime",
        "DOB__c": "date",
        "TOSAcceptanceDate__c": "datatime",
        "QuoraUsername__c": "string",
        "TOSAcceptanceIP__c": "string",
        "ReferralFirstName__c": "string",
        "ReferralLastName__c": "string",
        "ReferralEmail__c": "string",
        "ReferralWine__c": "string",
        "ReferralAdjectiveOne__c": "string",
        "ReferralPlace__c": "string",
        "ReferralPronoun__c": "string",
        "ReferralAdjectiveTwo__c": "string",
        "Actor__c": "string",
        "Wine__c": "string",
        "Location__c": "string"



    },
    beforeCreate: (values,next)=>{
        values.Name = `${values.FirstName} ${values.LastName}`;
        next();
    }
};