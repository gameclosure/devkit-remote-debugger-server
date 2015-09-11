var DebuggerProxy = require('./DebuggerProxy');
var FirefoxAdapter = require('remotedebug-firefox-adaptor');
var logger = require('./logs').mainLogger;

logger.info('Starting up...');

var debuggerProxy = new DebuggerProxy(6000, 6001);

var ffAdapter;
var resetFFAdapter = function() {
  ffAdapter = new FirefoxAdapter();
  ffAdapter.startServer();
};

// When a server connects to the proxy, tell the adapter to start the client connection
debuggerProxy.on('device-connected', function() {
  logger.info('device connected, starting the ffAdapter client');
  ffAdapter.startClient();
});

debuggerProxy.on('endDebugging', function() {
  ffAdapter.destroy().finally(function() {
    resetFFAdapter();
  });
});


// Start things up
resetFFAdapter();
debuggerProxy.start();
