var events = require('events');
var util = require('util');
var net = require('net');

var DebuggerProxyClient = require('./DebuggerProxyClient');
var logger = require('./logs').proxyLogger;

var Server = function(clientPort, serverPort) {
  events.EventEmitter.call(this);
  this.clientPort = clientPort;
  this.serverPort = serverPort;

  this.server = null;
  this.client = null;

  // Is there a client connection
  this._connected = false;
};

util.inherits(Server, events.EventEmitter);

Server.prototype.start = function() {
  logger.info('starting debugger proxy');
  logger.info('  listening for phones on client port', this.clientPort);
  logger.info('  waiting for ff-adaptor on server port', this.serverPort);

  net.createServer(this.onDevice.bind(this)).listen(this.clientPort);
  net.createServer(this.onServer.bind(this)).listen(this.serverPort);
};

Server.prototype.onServer = function(socket) {
  logger.info('debug server connected');

  if (this.server) {
    logger.info('cleaning up old server');
    this.server.destroy();
  }

  this.server = new DebuggerProxyClient(socket);
  this._connected = true;

  if (this.client) {
    this.startDebugging();
  }
};

Server.prototype.onDevice = function(socket) {
  logger.info('phone connected');
  this.client = new DebuggerProxyClient(socket);
  this.emit('device-connected');
};

Server.prototype.startDebugging = function() {
  logger.info('Starting debugging!');

  this.server.socket.pipe(this.client.socket);
  this.client.socket.pipe(this.server.socket);
  this.client.on('close', this.clientDisconnected.bind(this));
  this.server.on('close', this.clientDisconnected.bind(this));
};

Server.prototype.clientDisconnected = function(client) {
  if (!this._connected) {
    return;
  }

  logger.info('Client disconnected, stopping debugging');
  this.server = null;
  this.client = null;

  this._connected = false;
  this.emit('endDebugging');
};


module.exports = Server;
