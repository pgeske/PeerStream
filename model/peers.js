var mongoose = require('mongoose');

module.exports = mongoose.model('Peers', {
    username: {type: String},
    ip_address: {type: String},
    port: {type: Number}
});
