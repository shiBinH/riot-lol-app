const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');

const app_server = require('./app_server/server_ctrl.js');
const app_api = require('./app_api/api_ctrl.js');

const PASSPORT = require('passport');
require('./app_api/authorization.js');

app.use(express.static(__dirname + '/app_server/public', { index : false })); //  index option disables serving 'index.html' as default
//  app.use('/', app_server);
app.use('/wheres-the-jungler', app_api);


const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('certificate.pem')
}, app)

app.listen(process.env.PORT, () => {
  console.log('riot-lol-app listening on port ' + process.env.PORT);
})

