/**
 ** This installs all our extension handlers
 **/

var fs  = require('fs');
var peg = require('pegjs');

require.extensions['.pegjs'] = function (module, filename) {
	module.exports = peg.buildParser(fs.readFileSync(filename, 'utf8'), { cache:true });
}

module.exports = peg;
