var events = require('events');
var util = require('util');

function ClientConnection(socket, logger) {
  events.EventEmitter.call(this);
  this.socket = socket;
  this._logger = require('./logs').clientLogger;

  this.socket.setKeepAlive(true);
  this.socket.on('data', this.onData.bind(this));
  this.socket.on('close', this.onClose.bind(this));
}
util.inherits(ClientConnection, events.EventEmitter);

ClientConnection.prototype.onData = function(data) {
  var dataString = data.toString();
  this._logger.info(this.socket.address().address, 'onData:', dataString);

  if (dataString.replace(/\s+/g, '') === 'SERVER') {
    this.emit('serverConnected', this);
  }
};

ClientConnection.prototype.send = function(data) {
  this.socket.write(data);
};

ClientConnection.prototype.onClose = function() {
  this.emit('close', this);
};

ClientConnection.prototype.destroy = function() {
  this.socket.destroy();
};


module.exports = ClientConnection;
