//======
// Setup
//======
const fs = require('fs');
const net = require('net');
const exec = require('child_process').exec;
const encryption = require('./encrypt.js');
const EventEmitter = require('events').EventEmitter;

//========
// Globals
//========
// my connection info
var PORT = parseInt(process.argv[2]) || 8081;
var HOST = '127.0.0.1';
// peer table server connection info
var HOST_ADDRESS = '127.0.0.1';
var HOST_PORT = 8080;
var COMMANDS = ['list-peers', 'register'];
// temp
/* var TEST_PEER_ADDRESS = 'http://ec2-52-33-47-32.us-west-2.compute.amazonaws.com/'; */
/* var TEST_PEER_PORT = 8083; */
var TEST_PEER_ADDRESS = '127.0.0.1';
var TEST_PEER_PORT = PORT == 8081 ? 8082 : 8081;
console.log('Me: ', PORT); 
console.log('Peer: ', TEST_PEER_PORT); 

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
        var params = chunk.trim().split(',');
        var command = params[0];
        // peer table commands
        if (command == 'list-peers') {
            this.peerTable.listPeers(function(peers) {
                process.stdout.write(peers + '> ');
            })
        } 
        // requester commands
        else if (command == 'content') {
            this.requester.getContent({ip: TEST_PEER_ADDRESS, port: TEST_PEER_PORT}, function(content) {
                process.stdout.write(content + '> ');
            });
        }
        else if (command == 'stream') {
            this.requester.getStream({ip: TEST_PEER_ADDRESS, port: TEST_PEER_PORT}, params[1]);
            process.stdout.write('\n> ');
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
            var params = request.split('\n')[0].split(','); 
            var command = params[0];
            request = request.split('\n').slice(1).join('\n');
            if (command == 'content') {
                fs.readdir('./shared', function(err, items) {
                    var response = '';
                    items.forEach(function(item) {
                        response += item + '\n';
                    });
                    sock.write(response);
                    sock.destroy();
                });
            }
            else if (command == 'stream') {
                var media = fs.createReadStream('shared/' + params[1]);
                /* media.pipe(sock); */
                media.on('data', function(chunk) {
                    sock.write(chunk);
                })
                /* media.on('end', function () { */
                /*     sock.destroy(); */
                /* }) */
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
    this.socket.write('content\n');
    var content = '';
    var handleData = function(chunk) {
        content += chunk;
    }
    this.socket.on('data', function(chunk) {
        handleData(chunk);
    });
    this.socket.on('end', function hndl() {
        this.removeListener('end', hndl);
        this.removeListener('data', handleData);
        callback(content);
    });
}

Requester.prototype.getStream = function(info, fileName) {
    this.socket.connect(info.port, info.ip);
    this.socket.write('stream,' + fileName + '\n');
    var bufferStream = fs.createWriteStream('buffer/' + fileName);
    var streamStarted = false;
    this.socket.on('data', function(chunk) {
        if (!streamStarted) {
            streamStarted = true;
            var child = exec('open ' + 'buffer/' + fileName + ' -a safari');
        }
        bufferStream.write(chunk);
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
