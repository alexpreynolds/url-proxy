#!/usr/bin/env node

/**
 * Simple proxy server to get around cross domain issues
 */

const express = require('express');
const app = module.exports = express();
const request = require('request')
const https = require('https');
const fs = require('fs');
const debug = require('debug')('url-proxy:server');
const normalizePort = require('normalize-port');

/**
 * Listen
 */

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '9001');
app.set('port', port);

var privateKey = fs.readFileSync('/etc/ssl/private/altius.org.key');
var certificate = fs.readFileSync('/etc/ssl/certs/altius-bundle.crt');

const options = {
  key: privateKey,
  cert: certificate
};

var server = https.createServer(options, app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Allow CORS
 */

function cors(req, res, next) {
  res.set('Content-Type', 'text/plain');
  res.set('Access-Control-Allow-Origin', req.headers.origin);
  res.set('Access-Control-Allow-Methods', req.method);
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.set('Access-Control-Allow-Credentials', true);

  // Respond OK if the method is OPTIONS
  if(req.method === 'OPTIONS') {
    return res.send(200);
  } else {
    return next();
  }
}

/**
 * CORS
 */

app.use(cors);

/**
 * /:url (url must be URL-encoded)
 */

app.all('/:url', (req, res, next) => {
  var url = req.params.url;
  req.pipe(request(url)).pipe(res);
});