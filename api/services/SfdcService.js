var _ = require('lodash');
module.exports = {
    mergeSfdcLeads: (leads,cb)=>{
        if(leads.length == 1) return cb(leads[0],false);
        var duplicates = _.map(leads, 'Id');
        var masterId = duplicates.shift();
        var masterLead = {};
        leads.forEach(element => {
            element = _.pickBy(element, _.identity);
            masterLead = _.assign(masterLead, element)
        });
        masterLead.Id = masterId;
        cb(masterLead,duplicates)
    },
    mergeSfdcLeadsAsync : leads=>{
        return new Promise(resolve => {
            if(leads.length == 1) return cb(leads[0],false);
            var duplicates = _.map(leads, 'Id');
            var masterId = duplicates.shift();
            var masterLead = {};
            leads.forEach(element => {
                element = _.pickBy(element, _.identity);
                masterLead = _.assign(masterLead, element)
            });
            masterLead.Id = masterId;
            var response = {
                masterLead : masterLead,
                duplicates : duplicates
            }
            resolve(response)
        })
    }
};