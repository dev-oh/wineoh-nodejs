var config = require('./../../config/config')

var Analytics = require('analytics-node');
var shortId = require('shortid');
var analytics = new Analytics(config.segmentConfig.writeKey);

module.exports = {
    identifyTrait: (uid,trait)=>{
        console.log(uid);
        analytics.identify({
            anonymousId: uid,
            traits: trait
        });
    },
    track: (uid,event,email)=>{
        analytics.track({
            anonymousId: uid,
            event: event,
            properties: {
                Email:email
            }
        });
    },
    trackBy: (uid,event,properties)=>{
        analytics.track({
            anonymousId: uid,
            event: event,
            properties: properties
        });
    }
}