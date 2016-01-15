//======
// Setup
//======
var net = require('net');
var mongoose = require('mongoose');
var database = require('./database.js')
var events = require('events');
var requestEmitter = new events.EventEmitter();

//=======
// Config
//=======
var PORT = 8080;
var HOST = '127.0.0.1';
var Peers = require('./model/peers.js');
mongoose.connect(database.url);


//=======
// Server
//=======
var server = net.createServer();
var peerTable = new PeerTable(Peers);
server.listen(PORT, HOST);
server.on('connection', function(sock) {
    sock.on('data', function(chunk) {
        var command = chunk.toString().split(',')[0];
        if (command == 'list') {
            peerTable.list().on('success', function(peers) {
                var response = '';
                peers.forEach(function(peer) {
                    response += peer.username + '\t' + peer.ip_address + '\t' + peer.port + '\n';
                })
                sock.write(response);
                sock.destroy();
            })
        }
    });
});

//===============
// Peer Table API
//===============
function PeerTable(db) {
    this.database = db;
}

PeerTable.prototype.register = function(info) {
    var peer = new this.database({
        username: info.username, 
        ip_address: info.ip, 
        port: info.port
    })
    peer.save();
}

PeerTable.prototype.list = function() {
    var emitter = new events.EventEmitter();
    this.database.find({}, function(err, peers) {
        emitter.emit('success', peers);
    })
    return emitter;
}

