var config = require('./../../config/config')

var Analytics = require('analytics-node');
var shortId = require('shortid');
var analytics = new Analytics(config.segmentConfig.writeKey);

module.exports = {
    identifyTrait: (uid,trait)=>{
        analytics.identify({
            anonymousId: uid,
            traits: trait
        });
    },
    track: (uid,email,event)=>{
        analytics.track({
            anonymousId: uid,
            event: event,
            properties: {
                Email:email
            }
        });
    }
}