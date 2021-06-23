# url-proxy

A simple [Express.js](https://expressjs.com/) application that takes an URL-encoded web address as an argument, performs a GET request for that URL, and writes the response as a UTF8-encoded text response back to the requesting client. 

## Applications

This proxy server can be used in conjunction with a calling web application running on a whitelisted host, which bypasses cross-site restrictions ("CORS") that would otherwise prevent getting text or other files via legitimate web requests.

## Security

We use [HTTPS](https://https.cio.gov/faq/#what-information-does-https-protect) in order to add protection to URL parameters (such as the web address we are interested in requesting, and any authentication data passed along with it).

## Startup

To debug, use `sudo npm run start`. Or use `sudo pm2 start url-proxy.development.json && sudo pm2 save` if you use [PM2](http://pm2.keymetrics.io/) as a process manager, to start the proxy service and have it start up on reboot. Use of `sudo` will be required if ownership and permissions for the SSL certificate and key are restricted, or if the service is run on a tcp port less than 1024.