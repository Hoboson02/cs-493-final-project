const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

async function getSub(username, userPoolId) {
  const params = {
    UserPoolId: userPoolId,
    Filter: `username = "${username}"`,
    Limit: 1
  };

  try {
    const response = await cognito.listUsers(params).promise();
    if (response.Users.length > 0) {
      const user = response.Users[0];
      const subAttribute = user.Attributes.find(attribute => attribute.Name === 'sub');
      return subAttribute.Value;
    }
  } catch (err) {
    console.error(err);
  }
}

exports.handler = async (event) => {
  const { username, password } = JSON.parse(event.body);
  const userPoolId = 'us-west-2_IoBo5jDL6';
  const clientId = '1agtrq9sqmodapdq850m9i205n';

  const params = {
    AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    ClientId: clientId,
    UserPoolId: userPoolId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password
    }
  };

  const response = {};

  try {
    const cognitoResponse = await cognito.adminInitiateAuth(params).promise();
    const idToken = cognitoResponse.AuthenticationResult.IdToken;
    uuid = await getSub(username, userPoolId);
    console.log(`uuid: ${uuid}`);
    response.statusCode = 200;
    response.body = JSON.stringify({ idToken, uuid });
  } catch (error) {
      response.statusCode = 401;
      response.body = JSON.stringify({ error: error.message });
  }
  console.log(response);
  return response;
};