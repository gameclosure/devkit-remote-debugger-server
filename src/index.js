var path = require('path');
var events = require('events');
var util = require('util');

var Promise = require('bluebird');

var FirefoxAdaptor = require('remotedebug-firefox-adaptor');
var logger = require('./logs').mainLogger;

var nativejsParser = require('./nativejsParser');

var MAX_LOG_LENGTH = 250;

function forwardEvent(event, src, target) {
  src.on(event, target.emit.bind(target, event));
}

var RemoteDebuggingServer = function() {
  this.debuggerProxy = null;
  this.ffAdapter = null;
};
util.inherits(RemoteDebuggingServer, events.EventEmitter);

/**
 * @method start
 */
RemoteDebuggingServer.prototype.start = function() {
  logger.info('Starting up...');
  // Start things up
  this._resetFFAdaptor();
};

RemoteDebuggingServer.prototype.onClientConnection = function(websocket) {
  logger.info('phone connected, starting the ffAdaptor client');

  if (this.websocket) {
    logger.info('  closing existing websocket connection');
    this.websocket.close();
  }

  this.websocket = websocket;

  // Log messages both ways
  this.websocket.on('message', this._logTraffic.bind(this, true));
  var originalWrite = this.websocket.send;
  this.websocket.send = function() {
    this._logTraffic(false, arguments[0]);
    return originalWrite.apply(this.websocket, arguments);
  }.bind(this);

  // Start the adaptor, use this new websocket
  this.ffAdapter.startClient({
    websocket: websocket
  });

  // clean things up
  this.websocket.on('close', this._resetFFAdaptor.bind(this));
};

RemoteDebuggingServer.prototype._logTraffic = function(fromPhone, data) {
  var dataString = data.toString();
  if (dataString.length > MAX_LOG_LENGTH) {
    dataString = dataString.substring(0, MAX_LOG_LENGTH) + ' ...truncated';
  }
  logger.info(fromPhone ? 'phone >>' : 'phone <<', dataString);
};

RemoteDebuggingServer.prototype._resetFFAdaptor = function(opts) {
  logger.info('Restarting FirefoxAdaptor');

  var tasks = [];

  if (this.websocket) {
    tasks.push(this.websocket.close());
    this.websocket = null;
  }
  if (this.ffAdapter) {
    tasks.push(this.ffAdapter.destroy());
    this.ffAdapter = null;
  }

  return Promise.all(tasks)
    .then(function() {
      this.ffAdapter = new FirefoxAdaptor({
        client: {
          port: this.serverPort
        },
        server: {
          port: 9223
        }
      });

      // This is fired when there is something for the adapter to connect to
      forwardEvent('adaptor.ready', this.ffAdapter, this);

      // This is fired now to let things know that the adaptor is fresh
      this.emit('adaptor.reset');
      this.ffAdapter.startServer();
    }.bind(this));
};

/**
 * Reset any source caching
 * @return {Promise}
 */
RemoteDebuggingServer.prototype.onRun = function(appDir) {
  logger.info('onRun resetting source cache: ' + appDir);
  // Clear the existing sourceCache
  var sourceCache = this.ffAdapter.client.client.sourceCache;
  sourceCache.reset();

  // Load the new native.js
  var nativejsPath = path.join(appDir, 'native.js');
  return Promise.promisify(nativejsParser.getSrcCache)(nativejsPath)
    .then(function(srcCache) {
      // Populate the sourceCache
      for (var srcUrl in srcCache) {
        sourceCache.set(srcUrl, srcCache[srcUrl].src);
      }
    });
};


module.exports = RemoteDebuggingServer;

process.on('uncaughtException', function (e) {
  console.log("uncaught exception!");
  console.error(e.stack);
});
