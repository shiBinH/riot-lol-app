const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const request = require('request');
const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-2',
  endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
})

const docClient = new AWS.DynamoDB.DocumentClient();

const post_data_by_date_handler = (req, res, next) => {
  
  let date = req.params.date
  const new_item = {
    TableName: 'Wheres-the-Jungler',
    Item: {
      'date': date,
      'meta_data': {
        'league': {
          'min': 'p1',
          'max': 'd4'
        },
        'patch': 8.22
      },
      'time_slices': [
        {
          'time_stamp': {
            'min': 5,
            'sec': 41
          },
          'images': {
            'minimap': 'minimap1_5-41.png',
            'scoreboard': 'scoreboard_5-51.png'
          },
          'champions': [
            {
              'id': 12,
              'location': {
                x: 123,
                y: 456
              }
            }  
          ]
        }
      ]
    },
    ReturnValues: 'ALL_OLD'
  }
  
  docClient.put(
    new_item,
    (err, data) => {
      if (err) {
        console.error('Unable to add item. Error:', JSON.stringify(err, null, 4));
      } else {
        console.log('Successfully added item:', JSON.stringify(data, null, 4))
        
      }
    }
  )
  
  res.end();
}

const get_data_by_date_handler = (req, res, next) => {
  
  const query = {
    TableName: 'Wheres-the-Jungler',
    Key: {
      'date': req.params.date//  (new Date()).toDateString()
    }
  }
  
  docClient.get(
    query,
    (err, data) => {
      if (err) {
        console.err('Unalbe to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        console.log('Successfully got item:', JSON.stringify(data, null, 4));
        res.json(data);
      }
    }
  )
}

const get_minimaps_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl);
  res.json({
    status: 'Success!'
  })
}

const get_scoreboards_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl)
  res.json({
    status: 'success!'
  });
}

const get_images_by_date_main_handler = express.Router()
  .get('/minimaps', get_minimaps_by_date_handler)
  .get('/scoreboards', get_scoreboards_by_date_handler);

const get_images_by_date_entry_handler = (req, res, next) => {
  console.log('\nENTRY handler of:', req.originalUrl )
  next();
}

const test_handler = (req, res, next) => {
  if (process.env.TEST) {
    request({
      url: 'https://riot-lol-app-xyrho.c9users.io/Wheres-the-Jungler/images/date/' 
            + req.query.date + '/' 
            + req.query.type + '/?timestamp='
            + req.query.timestamp,
      method: 'GET',
      json: true
      
    },
      (err, response, body) => {
        res.json(body)
      }
    )
  }
  
  else 
    next();
}

router
  //  entry
  .use(bodyParser.json())
  //  get handlers
  .get('/test', test_handler)
  .get('/data/date/:date', get_data_by_date_handler)
  .use(
    '/images/date/:date', 
    get_images_by_date_entry_handler, 
    get_images_by_date_main_handler
  )
  //  post handlers
  .post(
    '/data/add/date/:date', 
    post_data_by_date_handler
  )
  .post(
    '/images/add/date/:date', 
    (req, res, next) => {
      console.log('POST handler of', req.originalUrl);
      console.log('BODY:', req.body);
      res.json(req.body);
    }
  )
    
  
  /*
  
  date:
    /Wheres-the-Jungler/data/by-date/{date}
  
  images:
    /Wheres-the-Jungler/icons/{champion info}
  
    /Wheres-the-Jungler/images/by-date/{date}/minimaps?timestamp=5:41
    /Wheres-the-Jungler/images/by-date/{date}/scoreboards?timestamp=5:41
    
  
  */

module.exports = router;