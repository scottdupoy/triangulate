var https = require('https');
var fs = require('fs');

module.exports.start = function(app, config) {
    if (config.server.https) {
        startHttps(app, config);
    }
    else {
        startHttp(app, config);
    }
}

function startHttp(app, config) {
    console.log("starting http server on port: " + config.server.port);
    app.listen(config.server.port, function() {
        console.log("started http server");
    });
}

function startHttps(app, config) {
    console.log("starting https server on port: " + config.server.port);
    var credentials = {
        key: fs.readFileSync(config.server.ssl.key, "utf8"),
        cert: fs.readFileSync(config.server.ssl.cert, "utf8"),
    };
    // may not have a ca in test so check for it being specified before adding to the credentials
    if ("ca" in config.server.ssl) {
        credentials.ca = fs.readFileSync(config.server.ssl.ca, "utf8");
    }
    var server = https.createServer(credentials, app);

    // start
    server.listen(config.server.port, function() {
        console.log("started https server");
    });
}
