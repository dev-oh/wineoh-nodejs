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
        FirebaseService.createNewUser(incomingData.email, incomingData.password)
            .then(user=>{
                res.ok({
                    user: user
                });
            }).catch(error=>{
                // console.log(error);
            res.badRequest(error.message)
        })
    }
};