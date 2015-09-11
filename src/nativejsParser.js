var fs = require('fs');

// Read in native.js
var path = '/private/tmp/GemSwappers/build/debug/simulator/native.js';


module.exports = {

  getSrcCache: function(nativejsPath, cb) {
    // Read it in
    fs.readFile(path, 'utf8', function(err, contents) {
      if (err) {
        cb('Failed to read file: ' + err);
        return;
      }

      // Get the src cache
      var pattern = /jsio\.setCache\(({.*})\);/;
      var srcCacheMatch = contents.match(pattern);

      if (!srcCacheMatch) {
        cb('No setCache found');
        return;
      }

      var srcCache;
      try {
        srcCache = JSON.parse(srcCacheMatch[1]);
      } catch (err) {
        cb('Error while parsing srcCache match: ' + err);
        return;
      }

      cb(null, srcCache);
    });
  }

};
