var events = require('events');
var util = require('util');

var MAX_LOG_LENGTH = 250;

function ClientConnection(socket) {
  events.EventEmitter.call(this);
  this.socket = socket;
  this._logger = require('./logs').clientLogger;

  this._addr = this.socket.address().address;
  this._logger.info(this._addr, 'New client connection');

  this.socket.setKeepAlive(true);
  this.socket.on('data', this.onData.bind(this));
  this.socket.on('error', this.onError.bind(this));
  this.socket.on('close', this.onClose.bind(this));
}
util.inherits(ClientConnection, events.EventEmitter);

ClientConnection.prototype.onData = function(data) {
  var dataString = data.toString();
  if (dataString.length > MAX_LOG_LENGTH) {
    dataString = dataString.substring(0, MAX_LOG_LENGTH) + ' ...truncated';
  }
  this._logger.info(this._addr, 'onData:', dataString);
};

ClientConnection.prototype.send = function(data) {
  this.socket.write(data);
};

ClientConnection.prototype.onError = function(err) {
  this._logger.error(this._addr, err.toString(), err.stack);
}

ClientConnection.prototype.onClose = function() {
  this._logger.info(this._addr, 'onClose');
  this.emit('close', this);
};

ClientConnection.prototype.destroy = function() {
  this.socket.destroy();
};


module.exports = ClientConnection;
