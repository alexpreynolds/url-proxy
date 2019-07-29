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
const nocache = require('nocache');
const morgan = require('morgan');

/**
 * Listen
 */

let port = normalizePort(process.env.PORT || '9001');
app.set('port', port);

let byteLimit = (process.env.BYTELIMIT || 1024*1024);
// let lineLimit = (process.env.LINELIMIT || 100);

let privateKeyFn = (process.env.SSLPRIVATEKEY || '/etc/ssl/private/altius.org.key');
let certificateFn = (process.env.SSLCERTIFICATE || '/etc/ssl/certs/altius-bundle.crt');
let privateKey = fs.readFileSync(privateKeyFn);
let certificate = fs.readFileSync(certificateFn);

const options = {
  key: privateKey,
  cert: certificate
};

let server = https.createServer(options, app);
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

  let bind = typeof port === 'string'
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
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Response must be text
 */
 
function textonly(req, res, next) {
  res.set('Content-Type', 'text/plain');
  return next();
}

/**
 * Allow CORS
 */

function cors(req, res, next) {
  res.set('Access-Control-Allow-Origin', req.headers.origin);
  res.set('Access-Control-Allow-Methods', req.method);
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.set('Access-Control-Allow-Credentials', true);

  // Respond OK if the method is OPTIONS
  if (req.method === 'OPTIONS') {
    return res.send(200);
  } else {
    return next();
  }
}

/**
 * Response, CORS, cache policy and logging
 */

app.use(textonly);
app.use(cors);
app.use(nocache());
app.use(morgan('combined'));

/**
 * /:url (url must be URL-encoded)
 */

app.all('/:url', (req, res, next) => {
  let url = req.params.url;
  let lineCount = -1;
  /**
   * Short-circuit the final response when limits are violated or the URL-response is malformed
   * ref. https://www.npmjs.com/package/request#streaming
   */
  req
    .pipe(request(url))
    .on('response', function(response) {
      if (!response.headers['content-length']) {
        res.status(411).send("Content length header required");
      }
      let contentLength = parseInt(response.headers['content-length']);
      if (contentLength > byteLimit) {
        res.status(400).send("Went over byte limit");
      }
    })
/*
    .on('data', function(data) {
      lineCount += data.toString('utf8').split(/\r\n|\r|\n/).length;
      if (lineCount > lineLimit) {
        res.status(400).send("Went over line limit");
      }
    })
*/
    .pipe(res);
});