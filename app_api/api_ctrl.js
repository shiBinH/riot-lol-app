const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const request = require('request');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const post_data_by_date_handler = (req, res, next) => {
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  
  let date = req.params.date
  const new_item = {
    TableName: 'Wheres-the-Jungler',
    Item: {
      date: date,
      meta_data: {
        league: {
          min: 'p1',
          max: 'd4'
        },
        patch: 8.22
      },
      time_slices: [
        {
          time_stamp: {
            min: 5,
            sec: 41
          },
          images: {
            minimap: 'minimap1_5-41.png',
            scoreboard: 'scoreboard_5-51.png'
          },
          champions: [
            {
              id: 12,
              location: {
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
  /**
   * 
   * Update handler to reflect:
   *  /Wheres-the-Jungler/data/date/{date}
   * 
   * 
   */
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();

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
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        console.log('Successfully got item:', JSON.stringify(data, null, 4));
        res.json(data);
      }
    }
  )
}

const get_minimaps_by_date_handler = (req, res, next) => {
  
  AWS.config.update({region: 'REGION', endpoint: undefined})
  const params = {
    Bucket: 'wheres-the-jungler-minimaps',
    Key: req.params.key
  }
  //  Wed_Oct_11_2018_game-1_minimap_5-41.png
  //  /wheres-the-jungler/date/{date}/game/{gameId}/minimaps?timestamp=5:41
  s3.getObject(
    params,
    (err, data) => {
      if (err) {
        console.log("Error", err);
        res.end();
      } else {
        
        console.log('Successfully got minimap');
        res.set('Content-Type', 'image/png')
        res.send(data.Body);
      }
    }
  )
}

const get_scoreboards_by_date_handler = (req, res, next) => {
  AWS.config.update({region: 'REGION', endpoint: undefined})
  const params = {
    Bucket: 'wheres-the-jungler-scoreboards',
    Key: req.params.key
  }
  //  Wed_Oct_11_2018_game-1_scoreboard_5-41.png
  s3.getObject(
    params,
    (err, data) => {
      if (err) {
        console.log("Error", err);
        res.end();
      } else {
        
        console.log('Successfully got scoreboard');
        res.set('Content-Type', 'image/png')
        res.send(data.Body);
      }
    }
  )
}


const test_handler = (req, res, next) => {
  if (process.env.TEST) {
    request({
      /*
      url: 'https://riot-lol-app-xyrho.c9users.io/Wheres-the-Jungler/images/date' + 
            '/' + req.query.date + 
            '/' + req.query.type +
            '?timestamp=' + req.query.timestamp,
         */   
      url: 'https://riot-lol-app-xyrho.c9users.io/Wheres-the-Jungler/data/date/Fri Oct 12 2018/',
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
  //  .get('/images/date/:date/game/:gameId/minimaps', get_minimaps_by_date_handler)
  .get('/images/minimaps/:key', get_minimaps_by_date_handler)
  .get('/images/scoreboards/:key', get_scoreboards_by_date_handler)
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
    /Wheres-the-Jungler/data/date/{date}/game/{game id}
  
  images:
    /Wheres-the-Jungler/icons/{champion info}
  
    /Wheres-the-Jungler/images/date/{date}/game/{game id}/minimaps?timestamp=5:41
    /Wheres-the-Jungler/images/date/{date}/game/{game id}/scoreboards?timestamp=5:41
    
  
  */

module.exports = router;