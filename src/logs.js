var winston = require('winston');

var loggerContainer = new winston.Container({
  transports: []
});

loggerContainer.add('main', {
  console: {
    label: 'main',
    colorize: true
  }
});

loggerContainer.add('proxy', {
  console: {
    label: 'proxy',
    colorize: true
  }
});

loggerContainer.add('proxyClient', {
  console: {
    label: 'proxyClient',
    colorize: true
  }
});

module.exports = {
  mainLogger: loggerContainer.get('main'),
  proxyLogger: loggerContainer.get('proxy'),
  clientLogger: loggerContainer.get('proxyClient')
}
