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

const TABLEData = 'cs-493-final-project-main-data';

async function updateCourseInfo(courseName, courseInfoData) {
  const params = {
    TableName: TABLEData,
    Key: { courses: courseName },
    UpdateExpression: 'SET courseInfo = :courseInfoData',
    ExpressionAttributeValues: {
      ':courseInfoData': courseInfoData
    }
  };
  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Successfully updated course info for course: ${courseName}`);
  } catch (err) {
    console.error(`Error updating course: ${err}`);
  }
}

async function updateAssignment(courseName, assignmentName, assignmentData) {
  const params = {
    TableName: TABLEData,
    Key: { courses: courseName },
    UpdateExpression: 'SET assignments.#assignmentName = :assignmentData',
    ExpressionAttributeNames: {
      '#assignmentName': assignmentName
    },
    ExpressionAttributeValues: {
      ':assignmentData': assignmentData
    }
  };
  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Successfully updated assignment: ${assignmentName}`);
  } catch (err) {
    console.error(`Error updating assignment: ${err}`);
  }
}

async function addAssignment(courseName, assignmentName, assignmentData) {
  const params = {
    TableName: TABLEData,
    Key: { courses: courseName },
    UpdateExpression: 'SET assignments.#assignmentName = :assignmentData',
    ExpressionAttributeNames: {
      '#assignmentName': assignmentName
    },
    ExpressionAttributeValues: {
      ':assignmentData': assignmentData
    }
  };
  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Successfully added assignment: ${assignmentName}`);
  } catch (err) {
    console.error(`Error adding assignment: ${err}`);
  }
}

async function addCourse(course) {
  const params = {
    TableName: TABLEData,
    Item: course
  };
  try {
    await dynamoDb.send(new PutCommand(params));
    console.log(`Successfully added item: ${JSON.stringify(course)}`);
  } catch (err) {
    console.error(`Error adding item: ${err}`);
  }
}

async function addSubmission(courseName, assignmentName, studentName, submissionData) {

  const now = new Date();
  const submissionTime = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)} ${now.getHours()}:${now.getMinutes()}`;

  submissionData.submissionTime = submissionTime;

  const params = {
    TableName: TABLEData,
    Key: { courses: courseName },
    UpdateExpression: 'SET assignments.#assignmentName.submissions.#studentName = :submissionData',
    ExpressionAttributeNames: {
      '#assignmentName': assignmentName,
      '#studentName': studentName
    },
    ExpressionAttributeValues: {
      ':submissionData': submissionData
    }
  };
  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Successfully added submission for student: ${studentName}`);
  } catch (err) {
    console.error(`Error adding submission: ${err}`);
  }
}

async function decodeToken(idToken) {
  if (idToken.includes('Bearer')) {
    idToken = idToken.split(' ');
    idToken = idToken[1];
  }
  console.log(idToken)
  const params = {
    AccessToken: idToken
  };
  try {
    const decoded = jwt.decode(idToken);
    return decoded;
  } catch (error) {
    console.error('An error occurred while calling cognito.getUser:', error);
    return null;
  }
}

async function getGroup(idToken) {
  if (idToken == null) {
    return false;
  }
  let decodedToken = await decodeToken(idToken)
  console.log(decodedToken);
  const group = decodedToken['cognito:groups'];
  console.log(`group: ${group}`)
  return (group)
}

async function getCourse(course) {
  const params = {
    TableName: TABLEData,
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

async function getKeyList(key, isObject) {
  let coursesList;
  const params = {
    TableName: TABLEData,
    ProjectionExpression: key
  };
  try {
    const data = await dynamoDb.send(new ScanCommand(params));
    console.log(data.Items);
    if (isObject){coursesList = data.Items.flatMap((item) => (item[key] ? Object.keys(item[key]) : []));}
    else {coursesList = data.Items.map((item) => item[key]);}
    
    console.log(coursesList);
    return coursesList;
  } catch (err) {
    console.error(err);
  }
}

export const handler = async (event) => {
  let data;
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  const request = event['httpMethod'];
  console.log(request);
  var path = JSON.stringify(event['path']);
  path.replace('"','');
  const pathArray = path.split("/");
  // pathArray.pop()
  pathArray.shift();
  pathArray[pathArray.length-1] = pathArray[pathArray.length-1].replace('\"','');
  if (pathArray[1] || request == 'POST' || request == 'DELETE') {
    if (pathArray.length == 2 && request == 'GET') {
      pathArray.push('courseInfo');
    }
    console.log("A get is commencing")
    if (pathArray[2] == 'assignments' && pathArray.length == 3 && request == 'GET'){
      data = await getKeyList(pathArray[2], true);
      response.body = JSON.stringify(data);
      response.statusCode = 200;
    }
    else{
      console.log("I should be here");
      if (request != 'POST') { 
        data = await getCourse(pathArray[1]);
      }
      else {
        data = JSON.parse(event.body);
      }
      if ((typeof data) === 'object') {
        response.statusCode = 200;
        switch (request) {
          case 'GET':
            console.log(`${pathArray.length} : ${pathArray}`);
            if (pathArray.length >= 3) {
              for (let i = 2; i < pathArray.length; i++) {
                console.log(JSON.stringify(data[pathArray[i]]));
                data = data[pathArray[i]];
              }
            }
            response.body = JSON.stringify(data);
            break;
          case 'POST':
            if (pathArray[2] == 'assignments' && pathArray.length == 3) {
              const { courseName, assignmentName, assignmentData } = JSON.parse(event.body);
              await addAssignment(pathArray[1], assignmentName, assignmentData)
              response.body = 'New Assignment successfully added';
              response.statusCode = 201
            }
            else if (pathArray[0] == 'courses' && pathArray.length == 1) {
              await addCourse(JSON.parse(event.body))
              response.body = 'New Course successfully added';
              response.statusCode = 201
            }
            else if (pathArray[4] == 'submissions' && pathArray.length == 5) {
              const { courseName, assignmentName, studentName, submissionData } = JSON.parse(event.body);
              await addSubmission(pathArray[1], pathArray[3], studentName, submissionData)
              response.body = 'New Submission successfully added';
              response.statusCode = 201
            }
            else {
              response.body = 'The request body was either not present or did not contain a valid Course object.';
              response.statusCode = 400
            }
            break;
          case 'DELETE':
            const idToken = event.headers.Authorization;
            let group = await getGroup(idToken);
            if (1 == 1) { // group && group.includes('Admin')
              response.body = JSON.stringify({ message: 'Unauthorized' });
              response.statusCode = 200;
              if (pathArray.length === 2) {
                // Delete entire row of data
                const key = {};
                key[pathArray[0]] = pathArray[1];
                const params = {
                  TableName: TABLEData,
                  Key: key
                };
                try {
                  await dynamoDb.send(new DeleteCommand(params));
                  response.body = JSON.stringify({ message: 'Delete operation successful' });
                } catch (error) {
                  console.error('An error occurred while calling dynamoDb.send:', error);
                  response.body = JSON.stringify({ message: 'Delete operation failed' });
                }
              } else if (pathArray.length === 4 && pathArray[2] === 'assignments') {
                // Delete specific assignment
                const key = {};
                key[pathArray[0]] = pathArray[1];
                const getParams = {
                  TableName: TABLEData,
                  Key: key
                };
                try {
                  const result = await dynamoDb.send(new GetCommand(getParams));
                  if (result.Item) {
                    const assignments = result.Item.assignments;
                    delete assignments[pathArray[3]];
                    const updateParams = {
                      TableName: TABLEData,
                      Key: key,
                      UpdateExpression: 'SET assignments = :assignments',
                      ExpressionAttributeValues: {
                        ':assignments': assignments
                      }
                    };
                    await dynamoDb.send(new UpdateCommand(updateParams));
                    response.body = JSON.stringify({ message: 'Delete operation successful' });
                  } else {
                    response.body = JSON.stringify({ message: 'Item not found' });
                  }
                } catch (error) {
                  console.error('An error occurred while calling dynamoDb.send:', error);
                  response.body = JSON.stringify({ message: 'Delete operation failed' });
                }
              } else {
                response.body = JSON.stringify({ message: 'Invalid pathArray' });
              }
            } else {
              response.body = JSON.stringify({ message: 'Unauthorized' });
            }
            break;
          case 'PATCH':
            if (pathArray[2] == 'courseInfo' && pathArray.length == 3) {
              const { courseInfoData } = JSON.parse(event.body);
              await updateCourseInfo(pathArray[1], courseInfoData);
              response.body = 'Course Info successfully updated';
              response.statusCode = 200;
            } 
            else if (pathArray[2] == 'assignments' && pathArray.length == 4) {
              const { assignmentData } = JSON.parse(event.body);
              await updateAssignment(pathArray[1], pathArray[3], assignmentData);
              response.body = 'Assignment successfully updated';
              response.statusCode = 200;
            } else {
              response.body = 'The request body was either not present or did not contain any fields related to Assignment objects.';
              response.statusCode = 400;
            }
            break;
          default: 
            response.body = (`Unknown request: ${request}`);
        }
      }
    }
  }
  else {
    data = await getKeyList('courses', false);
    response.body = JSON.stringify(data);
    response.statusCode = 200;
  }
  return response;
}