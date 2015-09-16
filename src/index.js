var path = require('path');
var events = require('events');
var util = require('util');

var Promise = require('bluebird');

var DebuggerProxy = require('./DebuggerProxy');
var FirefoxAdapter = require('remotedebug-firefox-adaptor');
var logger = require('./logs').mainLogger;

var nativejsParser = require('./nativejsParser');

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
 * @param  {Object} [opts]
 * @param  {Number} [opts.clientPort] - for the phones
 * @param  {Number} [opts.serverPort] - for the dev tools
 */
RemoteDebuggingServer.prototype.start = function(opts) {
  opts = opts || {};
  this.clientPort = opts.clientPort || 6000;
  this.serverPort = opts.serverPort || 6001;

  logger.info('Starting up...');

  this.debuggerProxy = new DebuggerProxy(this.clientPort, this.serverPort);

  // When a server connects to the proxy, tell the adapter to start the client connection
  this.debuggerProxy.on('device-connected', function() {
    logger.info('Device connected, starting the ffAdapter client');
    this.ffAdapter.startClient();
  }.bind(this));

  this.debuggerProxy.on('endDebugging', function() {
    logger.info('Destroying FirefoxAdapter');
    this.ffAdapter.destroy().finally(function() {
      this._resetFFAdapter();
    }.bind(this));
  }.bind(this));

  // Start things up
  this._resetFFAdapter();
  this.debuggerProxy.start();
};

RemoteDebuggingServer.prototype._resetFFAdapter = function(opts) {
  logger.info('Restarting FirefoxAdapter');
  this.ffAdapter = new FirefoxAdapter({
    client: {
      port: this.serverPort
    },
    server: {
      port: 9223
    }
  });

  forwardEvent('adaptor.ready', this.ffAdapter, this);

  this.ffAdapter.startServer();
};

/**
 * Reset any source caching
 * @return {Promise}
 */
RemoteDebuggingServer.prototype.onRun = function(appDir) {
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

if (require.main == module) {
  new RemoteDebuggingServer().start();
}

