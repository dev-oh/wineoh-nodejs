module.exports = {
    getStarted: (req,res)=>{
        console.log(req.user);
        FirebaseService.mintCustomToken(req.user.uid)
            .then(token=>{
                res.ok({
                    firebaseToken: token,
                    zendeskUrl: ZendeskService.getUrl(req.user.email,req.user.name,req.user.picture)
                })
            });
    }
}