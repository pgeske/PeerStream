//======
// Setup
//======
const fs = require('fs');
const net = require('net');
const EventEmitter = require('events').EventEmitter;

//========
// Globals
//========
// my connection info
var PORT = 8081;
var HOST = '127.0.0.1';
// peer table server connection info
var HOST_ADDRESS = '127.0.0.1';
var HOST_PORT = 8080;
var COMMANDS = ['list-peers', 'register'];
// temp
var TEST_PEER_ADDRESS = 'http://ec2-52-33-47-32.us-west-2.compute.amazonaws.com/';
var TEST_PEER_PORT = 8081;

//=======================
// Command Line Interface
//=======================
function CommandInterface(server, requester, peerTable) {
    var self = self;
    this.server = server;
    this.requester = requester;
    this.peerTable = peerTable;
}

CommandInterface.prototype.start = function() {
    process.stdout.write('Welcome to PeerStream.\n> ');
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
        var chunk = process.stdin.read();
        if (!chunk) return;
        var command = chunk.trim();
        // peer table commands
        if (command == 'list-peers') {
            this.peerTable.listPeers(function(peers) {
                process.stdout.write(peers + '> ');
            })
        } 
        // requester commands
        else if (command == 'content') {
            this.requester.getContent(TEST_PEER_ADDRESS, TEST_PEER_PORT);
        }
        else {
            process.stdout.write('> ');
        }
    });
}

//==============
// Peer Services
//==============
function Server(host, port) {
    this.host = host;
    this.port = port;
    this.server = net.createServer();
    this.server.listen(this.port, this.host);
    this.server.on('connection', function(sock) {
        var request = '';
        sock.on('data', function(chunk) {
            request += chunk;
            //\n carriage return
            if (request.indexOf('\n') == -1) return;
            var command = request.split('\n')[0];
            request = request.split('\n').slice(1).join('\n');
            if (command == 'content') {
                fs.readdir('./shared', function(err, items) {
                    var response = '';
                    items.forEach(function(item) {
                        response += item + '\n';
                    });
                    sock.write(respose);
                });
            }
        });
    });
}

//==============
// Peer Requests
//==============
function Requester() {
    this.socket = new net.Socket();
}

Requester.prototype.getContent = function(info, callback) {
    this.socket.connect(info.port, info.ip);
    this.socket.write('content');
    var content = '';
    this.socket.on('data', function hndl(chunk) {
        content += chunk;
        this.on('end', function hndl1() {
            this.removeListener('data', 'hndl');
            this.removeListener('end', 'hndl1');
            callback(content);
        });
    })
}

//===========================
// Peer Table Client Side API
//===========================
function PeerTable(host, port) {
    this.host = host;
    this.port = port;
    this.socket = new net.Socket();
}

//register an entry
PeerTable.prototype.register = function(username, ip, port) {
    var message = 'register,' + username + ',' + ip  + ',' +  port;
    this.socket.write(message);
    this.socket.end();
}

//get all peers
PeerTable.prototype.listPeers = function(callback) {
    this.socket.connect(8080, '127.0.0.1');
    var message = 'list';
    this.socket.write(message);
    this.socket.on('data', function hndl(res) {
        callback(res);
        this.removeListener('data', hndl);
    });
}

//=====
// Main
//=====
var server = new Server(HOST, PORT);
var requester = new Requester();
var peerTable = new PeerTable(HOST_ADDRESS, HOST_PORT);
var commandInterface = new CommandInterface(server, requester, peerTable);
commandInterface.start();
