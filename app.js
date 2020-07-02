#!/usr/bin/env node

/**
 * Simple proxy server to get around cross domain issues
 */

const express = require('express');
const request = require('request').defaults({ strictSSL: false }); // get around bad or weird SSL certificate issues
const https = require('https');
const fs = require('fs');
const debug = require('debug')('url-proxy:server');
const normalizePort = require('normalize-port');
const nocache = require('nocache');
const morgan = require('morgan');
const validator = require('validator');

const app = module.exports = express();

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

app.use(cors);
app.use(nocache());
app.use(morgan('combined'));

/**
 * /:url (url must be URL-encoded)
 */

app.get('/favicon.ico', (req, res) => {
  res.sendStatus(404);
});

app.all('/:url', (req, res, next) => {
  let url = req.params.url;
  
  /**
   * Is url really a valid URL?
   * ref. https://github.com/validatorjs/validator.js
   */
   
  let urlOptions = { 
    protocols: ['http', 'https', 'ftp'], 
    require_tld: true, 
    require_protocol: false, 
    require_host: true, 
    require_valid_protocol: true, 
    allow_underscores: false, 
    host_whitelist: false, 
    host_blacklist: false, 
    allow_trailing_dot: false, 
    allow_protocol_relative_urls: false, 
    disallow_auth: false 
  };
  if (!validator.isURL(url, urlOptions)) {
    res.status(400).send("Invalid URL");
  }
  
  /**
   * Short-circuit the final response when limits are violated or the URL-response is malformed
   * ref. https://github.com/request/request#streaming
   */
   
  let lineCount = -1;
  req
    .pipe(request(url))
    .on('response', function(response) {
      //if (!response.headers['content-length']) {
          //res.status(411).send("Content length header required");
      //}
      //let contentLength = parseInt(response.headers['content-length']);
      //let contentLength = request.socket.bytesRead;
      let contentLength = req.socket.bytesRead;
      if (contentLength > byteLimit) {
        res.status(400).send("Went over content byte limit");
      }
      /* Rewrite content header to force it to text */
      response.headers['content-type'] = 'text/plain';
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
