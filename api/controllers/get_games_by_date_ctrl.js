/**
   * 
   * Endpoint:
   *    wheres-the-jungler/data/dates/:date
   * 
   * Returns an object with property 'items' containing
   * an array of data for the queried date
   * 
   */

const AWS = require('aws-sdk')
const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
   
const GET_GAMES_BY_DATE_CONTROLLER = (req, res, next) => {
  
  
  AWS.config.update({
    region: AWS_REGION,
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


module.exports = GET_GAMES_BY_DATE_CONTROLLER;



