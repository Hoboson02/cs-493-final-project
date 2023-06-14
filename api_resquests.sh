# Add New User

url="https://s59ulxxpz7.execute-api.us-west-2.amazonaws.com/main/user"
username="RyanEarl2"
password="Testpassword123!"

curl -X POST "$url" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$username\",\"password\":\"$password\"}"

# User Login
apiUrl='https://s59ulxxpz7.execute-api.us-west-2.amazonaws.com/main/user/login'
username='RyanEarl2'
password='Testpassword123!'

# Valid Credentials
echo "Testing with valid credentials"
response=$(curl -s -X POST $apiUrl -d "{\"username\":\"$username\",\"password\":\"$password\"}")
idToken=$(echo $response | sed 's/.*"idToken":"\([^"]*\)".*/\1/')
echo "Response: $response"

# Invalid Credentials
echo "Testing with invalid credentials"
response=$(curl -s -X POST $apiUrl -d "{\"username\":\"invalid\",\"password\":\"invalid\"}")
echo "Response: $response"