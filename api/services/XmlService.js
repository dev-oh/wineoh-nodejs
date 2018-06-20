var builder = require('xmlbuilder');

module.exports = {
    buildForPost: (actor,actorType,verb,object,flight,note,from)=>{
        var build = builder.create('xml')
            .ele('actor',actor).up()
            .ele('actortype',actorType).up()
            .ele('verb',verb).up()
            .ele('object',object).up()
            .ele('flight',flight).up()
            .ele('note',note).up()
            .ele('from',from).up()
            .end({pretty:true});
        return build;

    }
};