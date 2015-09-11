var events = require('events');
var net = require('net');
var util = require('util');

var DebuggerProxyClient = require('./DebuggerProxyClient');

var Server = function(port) {
  events.EventEmitter.call(this);
  this.logger = require('./logs').proxyLogger;
  this.port = port;
  this.clients = [];

  this.server = null;
  this.client = null;

  // Is there a client connection
  this._connected = false;
}
util.inherits(Server, events.EventEmitter);

Server.prototype.start = function() {
  this.logger.info('Starting debugger proxy on port ' + this.port);
  net.createServer(this.onClient.bind(this)).listen(this.port);
}

Server.prototype.onClient = function(socket) {
  this._connected = true;

  this.logger.info('Debugger client connection');
  var client = new DebuggerProxyClient(socket, this.logger);
  this.clients.push(client);

  client.on('serverConnected', this.serverConnected.bind(this));
  client.on('close', this.onClose.bind(this));

  if (this.server !== null) {
    this.client = client;
    this.startDebugging();
  }
}

Server.prototype.serverConnected = function(client) {
  this.logger.info('Upgrading debugger client to server');
  this.server = client;
  this.emit('serverConnected', client);
}

Server.prototype.startDebugging = function() {
  this.logger.info('Starting debugging!');

  this.server.send('connected');
  this.server.socket.pipe(this.client.socket);
  this.client.socket.pipe(this.server.socket);
  this.client.on('close', this.clientDisconnected.bind(this));
  this.server.on('close', this.clientDisconnected.bind(this));
}

Server.prototype.clientDisconnected = function(client) {
  if (!this._connected) {
    return;
  }

  this.logger.info('Client disconnected, stopping debugging');
  for (var i = 0, len = this.clients.length; i < len; i++) {
    this.clients[i].destroy();
  }
  this.server = null;
  this.client = null;

  this._connected = false;
  this.emit('endDebugging');
}

Server.prototype.onClose = function(connection) {
  this.logger.info('Connection ended, cleaning up');
  if (connection === this.server) {
    this.server = null;
  }
  if (connection === this.client) {
    this.client = null;
  };
  connection.socket.destroy();
};


module.exports = Server;
