/**
 * Created by Raheel on 1/31/2018.
 */
var _ = require('lodash');

module.exports = {
    test: (req,res)=>{
        res.ok("Works");
    },

    register: (req,res)=>{
        const incomingData = req.body;
        console.log(incomingData);
        const promis = [
            Contact.findOne({Email: incomingData.email}),
            Lead.findOne({Email: incomingData.email})
        ]
        Promise.all(promis)
        .then(_.spread((contact,lead)=>{
            FirebaseService.createNewUser(incomingData.email, incomingData.password)
                .then(user=>{
                    res.ok({
                        contact:contact,
                        lead:lead,
                        user: user
                    });
                }).catch(error=>{
                    res.badRequest(error)
            })
        }))
    }
};