const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const request = require('request');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const JWT = require('jsonwebtoken');
const passport = require('passport');

const HOSTNAME = "riot-lol-app-xyrho.c9users.io";

const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
//  AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= TEST=true nodemon app.js

/**
 * 
 * TODO
 *    1. Specify response code
 *    2. Validate input
 * 
 * 
 * */

/**
 * 
 * 
 * 
 * Endpoint:
 *    /wheres-the-jungler/data/dates/{date}/games
 *    ex:
 *      /wheres-the-jungler/data/dates/Oct 25 2018/games
 * 
 */
const post_games_handler = (req, res, next) => {
  
  const BODY_DATA = JSON.parse(req.body.data);
  const REQ_DATE = req.params.date
  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();

  const DYNAMODB_QUERY_DATES = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      date: REQ_DATE
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': REQ_DATE
    },
    FilterExpression: '#d = :targetYear'
  }
  
  DOC_CLIENT.scan(
    DYNAMODB_QUERY_DATES,
    (err, gameData) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        const NEXT_GAME_ID = 1 + (function get_highest_current_game_id(items)  {
          
          let highestCurrentGameId = 0;
          for (let i in items) {
            highestCurrentGameId = Math.max(highestCurrentGameId, gameData.Items[i].gameId)
          }
          
          return highestCurrentGameId;
          
        })(gameData.Items);
        
        const NEW_DB_ITEM = {
          TableName: AWS_DYNAMODB_TABLE_NAME,
          Item: {
            date: REQ_DATE  //  needs validation
          },
          ReturnValues: 'ALL_OLD'
        }
        //  needs a better way to extract data
        Object.assign(NEW_DB_ITEM.Item, BODY_DATA);
        NEW_DB_ITEM.Item.gameId = NEXT_GAME_ID;
        if  (!NEW_DB_ITEM.Item.timeSlices) {
          NEW_DB_ITEM.Item.timeSlices = [];
        }
        
        //  POST data to DynamoDB
        AWS.config.update({
          region: AWS_REGION,
          endpoint: AWS_DYNAMODB_END_POINT
        })
        DOC_CLIENT.put(
          NEW_DB_ITEM,
          (err, oldData) => {
            if (err) {
              console.error(
                '\nUnable to add item. Error:', 
                JSON.stringify(err, null, 4)
              );
            } else {
              console.log(
                '\nSuccessfully added item:', 
                oldData
              )
            }
            res.end()
          }
        )
        
      }
    }
  )
   
}

const put_games_handler = (req, res, next) => {
  /**
   * Endpoint:
   *    /wheres-the-jungler/data/dates/:date/games/:gameId
   * 
   * 
   * */
  const BODY_DATA = JSON.parse(req.body.data);
  const REQ_DATE = req.params.date;
  const REQ_GAME_ID = parseInt(req.params.gameId);
  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  const docClient = new AWS.DynamoDB.DocumentClient();
  
  const query = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      'date': REQ_DATE,
      'gameId': REQ_GAME_ID
    },
  }
  docClient.get(
    query,
    (err, gameData) => {
      if (err) {
        console.error(
          '\nUnable to get item. Error:', 
          JSON.stringify(err, null, 4)
        );
      } else {
        
        const NEW_ITEM = {
          TableName: AWS_DYNAMODB_TABLE_NAME,
          Item: {
            date: REQ_DATE,
            gameId: REQ_GAME_ID,
            timeSlices: []
          },
          ReturnValues: 'ALL_OLD'
        }
        //  Need a better way to extract data
        Object.assign(NEW_ITEM.Item, BODY_DATA);
      
        AWS.config.update({
          region: AWS_REGION,
          endpoint: AWS_DYNAMODB_TABLE_NAME
        })
        docClient.put(
          NEW_ITEM,
          (err, oldData) => {
            if (err) {
              
              console.error(
                '\nUnable to add item. Error:', 
                JSON.stringify(err, null, 4)
              );
              
            } else {
              
              console.log('\nSuccessfully PUT item:', oldData)
              
            }
            res.end()
          }
        )
        
      }
    }
  )
  
}

/**
 * 
 * Endpoint:
 *    /wheres-the-jungler/data/dates/:date/games/:gameid/timeslices
 * 
 * */
const put_timeslices_handlers = (req, res, next) => {
  /**
   * Update timeslices of specified game and saves
   * the minimap to storage
   * 
   * 1. Validate game exists
   * 2. Update timeslices
   * 3. Save map to S3
   * 
   * */
  const REQ_DATE = req.params.date;
  const REQ_GAME_ID = parseInt(req.params.gameId);
  const TIME_SLICE = JSON.parse(req.body.data);

  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })

  const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();
  
  
  //  Query dates to compute a unique game id
  const REQ_DATE_QUERY = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      date: REQ_DATE,
      gameId: REQ_GAME_ID
    }
  }

  DOC_CLIENT.get(
    REQ_DATE_QUERY,
    (err, gameData) => {
      if (undefined === gameData.Item) {
        res.status(404) 
        res.end('Game Not Found')
        console.log('ERROR: GAME NOT FOUND')
      } else {
    
        
        const NEW_GAME_DATA = {};
        Object.assign(NEW_GAME_DATA, gameData.Item)
        let timeSlices = NEW_GAME_DATA.timeSlices;
        timeSlices = (function update_timeSlices(timeSlices, timeSlice) {
          let found = false;
          let target = timeSlice.timeStamp;
          for (let i in timeSlices) {
            let timeStamp = timeSlices[i].timeStamp;
            if (timeStamp.min === target.min && timeStamp.max === target.max) {
              timeSlices[i] = timeSlice;
              found = true;
              break;
            }
          }
          
          if (!found) {
            timeSlices.push(timeSlice);
          }
          
        })(timeSlices, TIME_SLICE);
        
        //  Save game to database
        const PUT_GAME_REQ_URL = 
          'https://' + HOSTNAME + req.baseUrl +
          '/data/dates/' + REQ_DATE +
          '/games/' + REQ_GAME_ID;
        const PUT_GAME_REQ_METHOD = 'PUT';
        const PUT_GAME_REQ_PARAMS = {
          url: PUT_GAME_REQ_URL,
          method: PUT_GAME_REQ_METHOD,
          json: true,
          body: {
            data: JSON.stringify(NEW_GAME_DATA)
          }
        }
        
        let updated_database = false;
        let updated_storage = false;
        request(
          PUT_GAME_REQ_PARAMS,
          (err, response, body) => {
            if (err) {
              console.log(err)
            } else {
              console.log('\nPUT->POST SUCCESS:', body)
            }
            updated_database = true;
            if (updated_database && updated_storage) {
              console.log('\nSUCCESSFULLY UPDATED DB:', body)
              res.status(200)
              res.end();
            }
            
          }
        )
        
        //  Same minimap to storage
        const BUCKET_NAME = 'wheres-the-jungler-minimaps';
        const MINIMAP_FILE = req.files[0];
        const TIME_STAMP = TIME_SLICE.timeStamp.min + 'm' + TIME_SLICE.timeStamp.sec + 's';
        const MINIMAP_NAME = (function createMinimapName(timestamp, date, gameId) {
          let name = 
            date +
            " game-" + gameId +
            " minimap" +
            " " + timestamp +
            ".png";
          return name;
        })(TIME_STAMP, REQ_DATE, REQ_GAME_ID)
        const S3_UPLOAD_PARAMS = {
          Bucket: BUCKET_NAME,
          Key: MINIMAP_NAME,
          Body: MINIMAP_FILE.buffer
        }
        
        AWS.config.update({region: "REGION", endpoint: undefined});
        s3.upload(
          S3_UPLOAD_PARAMS,
          (err, data) => {
            if (err) {
              console.error('\nError:', err)
            } else {
              console.log('\nSuccessfully uploaded file:', data)
            }
            
            updated_storage = true;
            if (updated_database && updated_storage) {
              res.status(200)
              res.end();
            }
          }
        )
        
      }
    }
  )
  
}

const get_data_by_date_handler = (req, res, next) => {
  /**
   * 
   * Endpoint:
   *    wheres-the-jungler/data/dates/:date
   * 
   * Returns an object with property 'items' containing
   * an array of data for the queried date
   * 
   */
  
  AWS.config.update({
    region: AWS_DYNAMODB_TABLE_NAME,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  
  const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();
  const REQ_DATE = req.params.date;

  const query = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      'date': REQ_DATE, //  (new Date()).toDateString()
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': REQ_DATE
    },
    FilterExpression: '#d = :targetYear'
  }
  
  DOC_CLIENT.scan(
    query,
    (err, data) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        console.log('Successfully got item:', JSON.stringify(data, null, 4));
        let returnData = {
          items: data.Items
        }
        res.json(returnData);
      }
    }
  )
}

const get_minimaps_by_date_handler = (req, res, next) => {
  /**
   * 
   * Endpoint:
   *  wheres-the-jungler/images/dates/{date}/games/{gameId}/minimaps?min={int}&sec={int}
   * 
   * Returns an PNG image pertaining to the supplied parameters
   * 
   * */
  
  AWS.config.update({region: 'REGION', endpoint: undefined});
  
  const BUCKET_NAME = 'wheres-the-jungler-minimaps';
  const REQ_DATE = req.params.date;
  const REQ_GAME_ID = req.params.gameId;
  const GET_OBJECT_PARAMS = {
    Bucket: BUCKET_NAME,
    Key: createKey(REQ_DATE, REQ_GAME_ID, req.query.min, req.query.sec)
  }
  
  
  s3.getObject(
    GET_OBJECT_PARAMS,
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
  
  
  /*  HELPER FUNCTIONS  */
  /**********************/
  function createKey(date, gameId, min, sec, format) {
    //  need to validate input
    return  date +
            ' game-' + gameId +
            ' minimap' +
            ' ' + min + 'm' + sec + 's' +
            '.png'
    //  Wed_Oct_11_2018_game-1_minimap_5m41s.png
  }
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
  
  const DATES_QUERY = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    ProjectionExpression: '#d',
    ExpressionAttributeNames: {
      '#d': 'date'
    }
    
  }
  
  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();
  
  DOC_CLIENT.scan(
    DATES_QUERY,
    (err, data) => {
      if (err) {
        console.error(
          'Unable to get item. Error:', 
          JSON.stringify(err, null, 4)
        );
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


const TEST_HANDLER = express.Router()
  //  generate token
  .get(
    '/issue_token',
    (req, res, next) => {
      let token = JWT.sign(
      {
        exp: (Date.now() / 1000) + 60,
        data: {
          user: 'SHI BIN',
          age: 25
        }
      },
      "SHI BIN HUANG"
    )
    
    
    res
      .status(200)
      .send(token);
    }
  )
  
  //  use token
  .get(
    '/use_token',
    passport.authorize('bearer', {session: false}),
    (req, res, next) => {
      console.log(req.account);
      res.end();
    }
  )
  
  //  get token
  .post(
    '/get_token',
    passport.authorize('local'),
    (req, res, next) => {
      res.redirect('issue_token')
    }

    
  )
  
  .get('/', (req, res, next) => {
    console.log(req.hostname, req.baseUrl, req.originalUrl)
    res.end();
  })
  



//  routes
router
  
  //  entry
  .use(bodyParser.json())
  //  test routes
  .use('/test', multer().any(), TEST_HANDLER)

  //  get handlers
  .get('/data/dates', get_dates_handler)
  .get('/data/dates/:date', get_data_by_date_handler)
  .get('/images/dates/:date/games/:gameId/minimaps', get_minimaps_by_date_handler)
  //  POST, PUT handlers
  .put('/data/dates/:date/games/:gameId', upload.any(), put_games_handler)
  .post('/data/dates/:date/games', upload.any(), post_games_handler)
  .put('/data/dates/:date/games/:gameId/timeslices', upload.any(), put_timeslices_handlers)


module.exports = router;