import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand, 
  UpdateCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const jwt = require('jsonwebtoken');
const client = new DynamoDBClient({region: 'us-west-2'});

const dynamoDb = DynamoDBDocumentClient.from(client);

const TABLE = 'cs-493-final-project-main-data';

async function getCourse(course) {
  const params = {
    TableName: TABLE,
    Key: {
      'courses': course
    }
  };
  try {
    const data = await dynamoDb.send(new GetCommand(params));
    return data.Item;
  } catch (error) {
    console.error(error);
  }
}


export const handler = async (event) => {
  let data;
  const request = event['httpMethod'];
  console.log(request);
  var path = JSON.stringify(event['path']);
  path.replace('"','');
  const pathArray = path.split("/");
  // pathArray.pop()
  pathArray.shift();
  pathArray[pathArray.length-1] = pathArray[pathArray.length-1].replace('\"','');
  if (pathArray[0]) {
    console.log("A get is commencing")
    data = await getCourse(pathArray[0]);
  }
  else {
    console.log("A Scan is commencing");
    data = await dynamoDb.send(
      new ScanCommand({ TableName: TABLE })
    );
  }
 
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  
  if ((typeof data) === 'object') {
    response.statusCode = 200;
    switch (request) {
      case 'GET':
        response.body = JSON.stringify(data);
        console.log(response);
        break;
      case 'POST':
        response.body = request;
        break;
      case 'DELETE':
        response.body = request;
        break;
      default: 
        response.body = (`Unknown request: ${request}`);
    }
  }
  return response;
}