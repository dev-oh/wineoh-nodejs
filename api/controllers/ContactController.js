/**
 * ContactController
 *
 * @description :: Server-side logic for managing Contacts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
    test : (req,res)=>{
        res.ok(req.user);
    }
};

