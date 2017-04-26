var path = require('path');
var fs = require('fs');
var yaml = require('js-yaml');

var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, "..", "config.yaml"), "utf8"));

console.log("config.server.port:                    " + config.server.port);
console.log("config.server.https:                   " + config.server.https);
console.log("config.server.ssl.key:                 " + config.server.ssl.key);
console.log("config.server.ssl.cert:                " + config.server.ssl.cert);
console.log("config.server.ssl.ca:                  " + config.server.ssl.ca);
console.log("config.session.secret:                 " + config.session.secret);
console.log("config.session.sessionExpiryInSeconds: " + config.session.sessionExpiryInSeconds);             

module.exports = config;
