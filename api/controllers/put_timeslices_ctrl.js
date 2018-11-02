const multer = require('multer');
const upload = multer();
const AWS = require('aws-sdk')
const request = require('request');

const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const HOSTNAME = "riot-lol-app-xyrho.c9users.io";

/**
 * 
 * Endpoint:
 *    /wheres-the-jungler/data/dates/:date/games/:gameid/timeslices
 * 
 * */
const PUT_TIMESLICES_CONTROLLER = (req, res, next) => {
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



module.exports = [
  upload.any(),  
  PUT_TIMESLICES_CONTROLLER
]



