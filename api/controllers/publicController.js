module.exports = {
    index : (req,res)=>{
      res.json({ user: 'dt1243' name:'DevelopTech',email:'info@gmail.com'})

    },
    testRun : (req,res)=>{
        res.ok(req.body);
    }
}
