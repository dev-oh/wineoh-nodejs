/**
 * AccountController
 *
 * @description :: Server-side logic for managing Accounts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	index: (req,res)=>{
		Account.find().limit(10)
			.then(data=>{
				return res.ok(data);
			}).catch(error=>{
            return res.serverError(error);
		})
    }
};

