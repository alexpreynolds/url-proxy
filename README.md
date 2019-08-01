# url-proxy

A simple [Express.js](https://expressjs.com/) application that takes an URL-encoded web address as an argument, performs a GET request for that URL, and writes the response as a UTF8-encoded text response back to the requesting client.

We use [HTTPS](https://https.cio.gov/faq/#what-information-does-https-protect) in order to add protection to URL parameters (such as the web address we are interested in requesting, and any authentication data passed along with it).

To limit usage to our purposes, the server limits the response to **100 kilobytes** (or the value of the `BYTELIMIT` environment variable, if defined). 

If the response contains no `content-length` header, we immediately return a 411 error. If the requested file has a content length that is larger than the size limit, we send a 400 response immediately. 

We could also put a limit on the number of lines in the file, but I decided to disable this check. The client (in this case, the calling web application using this proxy service) can put its own limit on the total number of lines used from the response.

To limit troubleshooting problems, we disable caching and also always return UTF8-encoded text.

## Startup

To debug, use `sudo npm run start`. Or use `sudo pm2 start url-proxy.development.json && sudo pm2 save` if you use [PM2](http://pm2.keymetrics.io/) as a process manager, to start the proxy service and have it start up on reboot. Use of `sudo` will be required if ownership and permissions for the SSL certificate and key are restricted.