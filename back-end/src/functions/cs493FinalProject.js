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

const TABLE = 'cs-493-restful-api-main-data';

const testObject = {
  "courses": "test-course",
  "courseInfo": {
      "subjectSection": 5,
      "courseName": "test-course",
      "subjectTitle": "Computer Science",
      "subjectTerm": "Spring",
      "SubjectCredit": 4,
      "Description": "This is a fake course"
  },
  "students": {
      "testStudent1": {
          "name": "test1",
          "id":"25"
          
      },
      "testStudent2": {
          "name": "test2",
          "id":"23"
          
      },
      "testStudent3": {
          "name": "test3",
          "id":"34"
          
      }
  },
  "instructor": {"name": "testProf", "id":"1"},
  "assignments": {
      "testAssignment": {
          "description": "This is a test assignment",
          "dueDate": "06-15-23",
          "name": "Test assignment",
          "submissions": {
              "studentName": {"filename": "test", "submissionTime": "2:34"}
          }
      }
  }
}


 export const handler = async (event) => {
  const request = event['httpMethod'];
  console.log(request);
  let data = await dynamoDb.send(
   new ScanCommand({ TableName: TABLE })
   );
   // data = data.Items;
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  
  if ((typeof data) === 'object') {
    response.statusCode = 200;
    
    var path = JSON.stringify(event['path']);
    path.replace('"','');
    const pathArray = path.split("/");
    // pathArray.pop()
    pathArray.shift();
    pathArray[pathArray.length-1] = pathArray[pathArray.length-1].replace('\"','');
    switch (request) {
      case 'GET':
        response.body = data['Items']
      case 'POST':
        console.log(request);
        response.body = request;
      case 'DELETE':
        console.log(request);
        response.body = request;
      default: 
        response.body = (`Unknown request: ${request}`);
    }
    console.log(pathArray);
  }
}