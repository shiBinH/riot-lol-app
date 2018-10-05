const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');

const app_server = require('./app_server/server_ctrl.js');
const app_api = require('./app_api/api_ctrl.js');

app.use(express.static(__dirname + '/app_server/public'));
app.use('/', app_server);
app.use('/api', app_api);

const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('certificate.pem')
}, app)

app.listen(process.env.PORT, () => {
  console.log('riot-lol-app listening on port ' + process.env.PORT);
})



