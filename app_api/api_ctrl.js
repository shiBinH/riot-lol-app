const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const request = require('request');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const fs = require('fs');


//  AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY TEST=true nodemon app.js

const post_data_by_date_handler = (req, res, next) => {
  /**
   * endpoint:
   *  /wheres-the-jungler/data/add/date/{date}
   * 
   * 
   * 
   * */
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  
  let date = (new Date()).toDateString();
  const new_item = {
    TableName: 'Wheres-the-Jungler',
    Item: {
      date: date,
      gameId: 3,
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
          champions: [
            {
              name: 'Kha\'Zix',
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
   * Endpoint:
   *  wheres-the-jungler/data/date
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
      'date': req.params.date, //  (new Date()).toDateString()
      'gameId': 1
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
  function createKey(date, gameId, min, sec, format) {
    //  need to validate input
    return  date + '_' +
            'game-' + gameId + '_' +
            'minimap_' +
            min + 'm' + sec + 's' +
            '.' + format;
    //  Wed_Oct_11_2018_game-1_minimap_5m41s.png
  }
  
  AWS.config.update({region: 'REGION', endpoint: undefined});
  const params = {
    Bucket: 'wheres-the-jungler-minimaps',
    Key: createKey(req.params.date, req.params.gameId, req.query.min, req.query.sec, req.query.format)
  }
  
  //  /wheres-the-jungler/images/date/{date}/game/{gameId}/minimaps?min=5&sec=41&format=png
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
  /**
   * 
   * Based on get minimaps
   * 
   * 
   *
   **/

}

const get_dates_handler = (req, res, next) => {
  /**
   * Endpoint:
   *  wheres-the-jungler/data/dates
   * 
   * Returns JSON data containing dates for which data
   * is available.
   * 
   * TODO:
   *  Add explanations to code
   * 
   * */
  
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  
  const query = {
    TableName: 'Wheres-the-Jungler',
    ProjectionExpression: '#d',
    ExpressionAttributeNames: {
      '#d': 'date'
    }
    
  }
  
  docClient.scan(
    query,
    (err, data) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        console.log('Successfully got items');
        
        let returnData = {
          dates: extractDates(data)
        }
        
        res.json(returnData);
      }
    }
  )
  
  /*  Helper functions  */
  /**********************/
  function extractDates(awsData) {
    //  Takes DynamoDB returned query and extracts
    //  date strings into an array
    
    let dates = [];
    let dict = {};
    let items = awsData.Items
    for (let i in items) {
      if (!dict[items[i].date]) {
        dict[items[i].date] = true;
        dates.push(items[i].date);
      }
    }
    return dates;
  }
}

const test_handler = (req, res, next) => {
  if (process.env.TEST) {
    
    /*
    
    //  for testing API calls
    request({
      //  url: 'https://riot-lol-app-xyrho.c9users.io/Wheres-the-Jungler/images/date/Wed Oct 11 2018/game/1/minimaps?min=5&sec=41&type=png',
      url: 'https://riot-lol-app-xyrho.c9users.io/wheres-the-jungler/data/add/date/Mon Oct 15 2018',
      method: 'POST',
      json: true
      
    },
      (err, response, body) => {
        res.json(body)
      }
    )
    */
    
    //  for testing image uploading and multer middle ware
    console.log(req.files[1])
    /*
    AWS.config.update({region: 'REGION'});
    const params = {
      Bucket: 'wheres-the-jungler-minimaps',
      Key: req.file.originalname,
      Body: req.file.buffer
    }
    

    s3.upload(
      params,
      (err, data) => {
        if (err)
          console.error("Error:", err);
        else
          console.log('Success', data)
      }
    )
    
    */
    res.end();
  }
  
  else 
    next();
}



router
  //  entry
  .use(bodyParser.json())
  //  test handlers
  .get('/test', test_handler)
  .post('/test', upload.array('first'), test_handler)
  //  get handlers
  .get('/data/dates', get_dates_handler)
  .get('/data/date/:date', get_data_by_date_handler)
  .get('/images/date/:date/games/:gameId/minimaps', get_minimaps_by_date_handler)
  .get('/images/date/:date/games/:gameId/scoreboards', get_scoreboards_by_date_handler)
  //  post handlers
  .post('/data/add/date/:date', post_data_by_date_handler)
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
    GET
      /Wheres-the-Jungler/data/date/{date}/game/{game id}
    POST
      /Wheres-the-Jungler/data/date/{date}/game/{game id}
  images:
    /Wheres-the-Jungler/icons/{champion info}
  
    /Wheres-the-Jungler/images/date/{date}/game/{gameId}/minimaps?min=5&sec=41&format=png
    /Wheres-the-Jungler/images/date/{date}/game/{gameId}/scoreboards?min=5&sec=41&format=png    
  
  */

module.exports = router;