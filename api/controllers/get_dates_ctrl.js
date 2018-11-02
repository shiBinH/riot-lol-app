const AWS = require('aws-sdk');

const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'


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
const get_dates_controller = (req, res, next) => {
  
  
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
  
}

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


module.exports = get_dates_controller;