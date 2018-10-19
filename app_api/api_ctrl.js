const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const request = require('request');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});


//  AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= TEST=true nodemon app.js

/**
 * 
 * TODO
 *    1. Specify response code
 *    2. Validate input
 * 
 * 
 * */


const post_games_handler = (req, res, next) => {
  /**
   * 
   * Endpoint:
   *    /wheres-the-jungler/data/dates/:date/games
   * 
   * 
   * */
   
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  const tableName = 'Wheres-the-Jungler';
  const bodyData = JSON.parse(req.body.data);
  
  const query = {
    TableName: tableName,
    Key: {
      'date': req.params.date
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': req.params.date
    },
    FilterExpression: '#d = :targetYear'
  }
  
  docClient.scan(
    query,
    (err, gameData) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        let nextGameId = 1 + (function get_highest_current_game_id(items)  {
          
          let highest_current_game_id = 0;
          for (let i in gameData.Items) {
            highest_current_game_id = Math.max(highest_current_game_id, gameData.Items[i].gameId)
          }
          return highest_current_game_id;
          
        })(gameData.Items);
        
        const NEW_DB_ITEM = {
          TableName: tableName,
          Item: {
            date: req.params.date  //  needs validation
          },
          ReturnValues: 'ALL_OLD'
        }
        //  needs a better way to extract data
        Object.assign(NEW_DB_ITEM.Item, bodyData);
        NEW_DB_ITEM.Item.gameId = nextGameId;
        
        if  (!NEW_DB_ITEM.Item.timeSlices) {
          NEW_DB_ITEM.Item.timeSlices = [];
        }
        
        //  POST data to DynamoDB
        AWS.config.update({
          region: 'us-east-2',
          endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
        })
        
        docClient.put(
          NEW_DB_ITEM,
          (err, oldData) => {
            if (err) {
              console.error('\nUnable to add item. Error:', JSON.stringify(err, null, 4));
            } else {
              console.log('\nSuccessfully added item:', oldData)
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
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  const TABLE_NAME = 'Wheres-the-Jungler';
  const BODY_DATA = JSON.parse(req.body.data);
  
  const query = {
    TableName: TABLE_NAME,
    Key: {
      'date': req.params.date,
      'gameId': parseInt(req.params.gameId)
    },

  }
  
  docClient.get(
    query,
    (err, gameData) => {
      if (err) {
        console.error('\nUnable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        

        const NEW_ITEM = {
          TableName: TABLE_NAME,
          Item: {
            date: req.params.date,
            gameId: parseInt(req.params.gameId),
            timeSlices: []
          },
          ReturnValues: 'ALL_OLD'
        }
        //  Need a better way to extract data
        Object.assign(NEW_ITEM.Item, BODY_DATA);
      
        AWS.config.update({
          region: 'us-east-2',
          endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
        })
        docClient.put(
          NEW_ITEM,
          (err, oldData) => {
            if (err) {
              console.error('\nUnable to add item. Error:', JSON.stringify(err, null, 4));
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

const put_timeslices_handlers = (req, res, next) => {
    /**
     * 
     * Endpoint:
     *    /wheres-the-jungler/data/dates/:date/games/:gameid/timeslices
     * 
     * */
    
    
    /**
     * Update timeslices of specified game and saves
     * the minimap to storage
     * 
     * 1. Validate game exists
     * 2. Update timeslices
     * 3. Save map to S3
     * 
     * */
     
    AWS.config.update({
      region: 'us-east-2',
      endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
    })
  
    const docClient = new AWS.DynamoDB.DocumentClient();
    const tableName = 'Wheres-the-Jungler';
    const TIME_SLICE = JSON.parse(req.body.data);
    
    //  Query dates to compute a unique game id
    const query = {
      TableName: tableName,
      Key: {
        date: req.params.date,
        gameId: parseInt(req.params.gameId)
      }
    }

    docClient.get(
      query,
      (err, gameData) => {
        if (undefined === gameData.Item) {
          res.status(404) 
          res.end('Game Not Found')
          console.log('ERROR: GAME NOT FOUND')
        } else {
      
          const NEW_ITEM = {};
          Object.assign(NEW_ITEM, gameData.Item)
          let timeSlices = NEW_ITEM.timeSlices;
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

          let updated_db = false;
          let updated_storage = false;
          
          //  Save game to database
          const PUT_GAME_REQ_PARAMS = {
            url: 'https://riot-lol-app-xyrho.c9users.io/wheres-the-jungler/data/dates/' + req.params.date + '/games/' + req.params.gameId,
            method: 'PUT',
            json: true,
            body: {
              data: JSON.stringify(NEW_ITEM)
            }
          }
          request(
            PUT_GAME_REQ_PARAMS,
            (err, response, body) => {
              if (err) {
                console.log(err)
              } else {
                console.log('\nPUT->POST SUCCESS:', body)
              }
              updated_db = true;
              if (updated_db && updated_storage) {
                console.log('\nSUCCESSFULLY UPDATED DB:', body)
                res.status(200)
                res.end();
              }
              
            }
          )
          
          //  Same minimap to storage
          const file = req.files[0];
          
          AWS.config.update({region: "REGION", endpoint: undefined});
          const timestamp = TIME_SLICE.timeStamp.min + 'm' + TIME_SLICE.timeStamp.sec + 's';
          const date = req.params.date;
          const gameId = req.params.gameId;
          const MINIMAP_NAME = (function createMinimapName(timestamp, date, gameId) {
            let name = 
              date +
              " game-" + gameId +
              " minimap" +
              " " + timestamp +
              ".png";
            return name;
          })(timestamp, date, gameId)
          
          const S3_UPLOAD_PARAMS = {
            Bucket: 'wheres-the-jungler-minimaps',
            Key: MINIMAP_NAME,
            Body: file.buffer
          }
          
          s3.upload(
            S3_UPLOAD_PARAMS,
            (err, data) => {
              if (err) {
                console.error('\nError:', err)
              } else {
                console.log('\nSuccessfully uploaded file:', data)
              }
              
              updated_storage = true;
              if (updated_db && updated_storage) {
                res.status(200)
                res.end();
              }
            }
          )
          
        }
      }
    )
    
  }

const post_game_by_date_handler = (req, res, next) => {
  /**
   * Endpoint:
   *    /wheres-the-jungler/data/dates/:date/games
   * 
   * Preconditions:
   *    1.  Content-Type header must be set to multipart/form
   *    2.  Data is attached to 'data' property of body as a JSON string
   *    3.  Data must follow the format:
              {
                date: <String>
                metaData: {
                  patch: <Float>,
                  league: {
                    min: <String>
                    max: <String>
                  },
                  champions: {
                    blue: [<String>],
                    red: [<String>]
                  }
                },
                timeSlices: [
                  {
                    timeStamp: {
                      "min": <Integer>
                      "sec": <Float>,
                    },
                    champions: [
                      name: <String>,
                      team: <String>,
                      position: {
                        x: <Float>,
                        y: <Float>
                      }
                    ]
                  }
                ]
              }
   * Postconditions:
   *    Saves the data and associated images
   * 
   * TODO
   *    1.  Validate POST data
   *    2.  Validate uploaded images
   * 
   * */
  
  AWS.config.update({
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })

  const docClient = new AWS.DynamoDB.DocumentClient();
  const tableName = 'Wheres-the-Jungler';
  const bodyData = JSON.parse(req.body.data);
  
  //  Query dates to compute a unique game id
  const query = {
    TableName: tableName,
    Key: {
      'date': req.params.date
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': req.params.date
    },
    FilterExpression: '#d = :targetYear'
  }
  
  docClient.scan(
    query,
    (err, gameData) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        
        let nextGameId = 1 + (function get_highest_current_game_id(items)  {
          
          let highest_current_game_id = 0;
          for (let i in gameData.Items) {
            highest_current_game_id = Math.max(highest_current_game_id, gameData.Items[i].gameId)
          }
          return highest_current_game_id;
          
        })(gameData.Items);
        
        let new_item = {
          TableName: tableName,
          Item: {
            date: req.params.date,  //  needs validation
            gameId: nextGameId
          },
          ReturnValues: 'ALL_OLD'
        }
        
        //  needs a better way to extract data
        Object.assign(new_item.Item, bodyData)
        
        let posted_data = false;
        let posted_images = false;
        
        //  POST data to DynamoDB
        AWS.config.update({
          region: 'us-east-2',
          endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
        })
        docClient.put(
          new_item,
          (err, oldData) => {
            if (err) {
              console.error('Unable to add item. Error:', JSON.stringify(err, null, 4));
            } else {
              console.log('\n', 'Successfully added item:', oldData)
            }
            posted_data = true;
            if (posted_data && posted_images)
              res.end();
          }
        )
        
        //  POST each file to S3 storage
        const files = req.files;
        files.forEach((file, index) => {
          //  Need to validate timestamp
          AWS.config.update({region: "REGION", endpoint: undefined})
          const timestamp = file.fieldname;
          const date = bodyData.date
          const gameId = nextGameId
          const minimapName = (function createMinimapName(timestamp, date, gameId) {
            let name = 
              date +
              " game-" + gameId +
              " minimap" +
              " " + timestamp +
              ".png";
            return name;
          })(timestamp, date, gameId)
          
          const params = {
            Bucket: 'wheres-the-jungler-minimaps',
            Key: minimapName,
            Body: file.buffer
          }
          
          s3.upload(
            params,
            (err, data) => {
              if (err)
                console.error("Error:", err)
              else {
                console.log('\n', 'Success', data)
              }
              posted_images = true;
              
              if (posted_data && posted_images)
                res.end();
            }
          )
         
        })
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
    region: 'us-east-2',
    endpoint: 'https://dynamodb.us-east-2.amazonaws.com'
  })
  
  const docClient = new AWS.DynamoDB.DocumentClient();
  const tableName = 'Wheres-the-Jungler';

  const query = {
    TableName: tableName,
    Key: {
      'date': req.params.date, //  (new Date()).toDateString()
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': req.params.date
    },
    FilterExpression: '#d = :targetYear'
  }
  
  docClient.scan(
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
   *  wheres-the-jungler/images/dates/{date}/games/{gameId}/minimaps?min={int}&sec={int}&format=png
   * 
   * Returns an PNG image pertaining to the supplied parameters
   * 
   * */
  
  AWS.config.update({region: 'REGION', endpoint: undefined});
  
  const BucketName = 'wheres-the-jungler-minimaps';
  
  const params = {
    Bucket: BucketName,
    Key: createKey(req.params.date, req.params.gameId, req.query.min, req.query.sec, req.query.format)
  }
  
  
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

    res.end()
  }
  
  else 
    next();
}

router
  //  entry
  .use(bodyParser.json())
  //  test handlers
  .get('/test', test_handler)
  .post('/test', upload.fields([{name: '1'}, {name: '2'}]), test_handler)
  //  get handlers
  .get('/data/dates', get_dates_handler)
  .get('/data/dates/:date', get_data_by_date_handler)
  .get('/images/dates/:date/games/:gameId/minimaps', get_minimaps_by_date_handler)
  //  POST, PUT handlers
  .put('/data/dates/:date/games/:gameId', upload.any(), put_games_handler)
  .post('/data/dates/:date/games', upload.any(), post_games_handler)
  .put('/data/dates/:date/games/:gameId/timeslices', upload.any(), put_timeslices_handlers)
  //  .post('/data/dates/:date/games', upload.any(), post_game_by_date_handler)

module.exports = router;