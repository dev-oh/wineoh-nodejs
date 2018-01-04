module.exports = {
    index : (req,res)=>{
        res.ok('Hello World');
    },
    testRun : (req,res)=>{
        res.ok(req.body);
    }
}