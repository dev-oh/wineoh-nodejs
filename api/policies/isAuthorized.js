"use strict";

module.exports = (req,res,next)=>{
    if(req.headers && req.headers.authorization){
        FirebaseService.verifyIdToken(req.headers.authorization)
            .then(decodedToken=>{
                req.user = decodedToken;
                next();
            }).catch(error=>{
                sails.log.info(error);
                return res.custom(
                    'Token Exipred or Malfunctioned',
                    'Token Error',
                    'Fail',
                    403
                )
        })
    }else{
        return res.custom("Token Not Found","Missing Token","Fail",401);
    }
}