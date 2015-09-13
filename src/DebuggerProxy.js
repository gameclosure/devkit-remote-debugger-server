var events = require('events');
var util = require('util');
var net = require('net');

var DebuggerProxyClient = require('./DebuggerProxyClient');

var Server = function(clientPort, serverPort) {
  events.EventEmitter.call(this);
  this.logger = require('./logs').proxyLogger;
  this.clientPort = clientPort;
  this.serverPort = serverPort;
  this.servers = [];

  this.server = null;
  this.client = null;

  // Is there a client connection
  this._connected = false;
};

util.inherits(Server, events.EventEmitter);

Server.prototype.start = function() {
  this.logger.info('starting debugger proxy');
  this.logger.info('  listening for phones on client port', this.clientPort);
  this.logger.info('  waiting for ff-adaptor on server port', this.serverPort);

  net.createServer(this.onDevice.bind(this)).listen(this.clientPort);
  net.createServer(this.onServer.bind(this)).listen(this.serverPort);
};

Server.prototype.onServer = function(socket) {
  this._connected = true;

  this.logger.info('debug server connected');
  this.server = new DebuggerProxyClient(socket);
  this.servers.push(this.server);

  if (this.client) {
    this.startDebugging();
  }
};

Server.prototype.onDevice = function(socket) {
  this.logger.info('phone connected');
  this.client = new DebuggerProxyClient(socket);
  this.emit('device-connected');
};

Server.prototype.startDebugging = function() {
  this.logger.info('Starting debugging!');

  this.server.socket.pipe(this.client.socket);
  this.client.socket.pipe(this.server.socket);
  this.client.on('close', this.clientDisconnected.bind(this));
  this.server.on('close', this.clientDisconnected.bind(this));
};

Server.prototype.clientDisconnected = function(client) {
  if (!this._connected) {
    return;
  }

  this.logger.info('Client disconnected, stopping debugging');
  for (var i = 0, len = this.servers.length; i < len; i++) {
    this.servers[i].destroy();
  }
  this.server = null;
  this.client = null;

  this._connected = false;
  this.emit('endDebugging');
};


module.exports = Server;
