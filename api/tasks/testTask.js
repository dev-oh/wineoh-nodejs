module.exports = {
    schedule: '*/15 * * * * *', //every 5 second
    task: function () {
      sails.log.info("Test Crone Job");
    }
};