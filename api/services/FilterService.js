module.exports = {
    cleanLead: lead=>{
        delete lead.LastModifiedDate;
        delete lead.OwnerRole__c;
        delete lead.PhotoUrl;
        delete lead.IsDeleted;
        delete lead.ConvertedDate;
        delete lead.email_bullseye__c;
        delete lead.SystemModstamp;
        delete lead.Name;
        delete lead.CreatedById;
        delete lead.ConvertedOpportunityId;
        delete lead.MasterRecordId;
        delete lead.ConvertedAccountId;
        delete lead.LastViewedDate;
        delete lead.CreatedDate;
        delete lead.LastReferencedDate;
        delete lead.ConvertedContactId;
        delete lead.JigsawContactId;
        delete lead.Address;
        delete lead.SubordinateOneName__c;
        delete lead.Project_Phase__c;
        delete lead.target_name__c;
        delete lead.Summary__c;
        delete lead.Domain__c;
        delete lead.Picture__c;
        delete lead.LastActivityDate;
        delete lead.LastTransferDate;
        delete lead.IsConverted;
        delete lead.OverlordName__c;
        delete lead.AppointmentURL__c;
        delete lead.InfluencerName__c;
        delete lead.LastModifiedById;
        delete lead.OuterName__c;
        delete lead.TargetLinkedin__c;
        delete lead.AccountId__c;
        return lead;
    },
    cleanLeadForPostgres: (lead)=>{
        delete lead.LastModifiedDate;
        delete lead.CreatedDate;
        delete lead.Zendesk__Last_Sync_Date__c
        return lead;
    }
}