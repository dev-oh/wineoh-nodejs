module.exports = {
    schedule: '*/5 * * * * *', //every 5 second
    task: function () {
      sails.log.info("5 Seconds");
    }
};