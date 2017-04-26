// dependencies
var express = require("express");
var path = require("path");

// local dependencies
var config = require("./core/config.js");
var server = require("./core/server.js");
var routes = require("./core/routes.js");

// set up express
var app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// routes
app.get("/", routes.home);

// start the server
server.start(app, config);
