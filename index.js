require('dotenv').config();

const express = require("express");
bodyParser = require("body-parser");
const cors = require("cors");

const axios = require('axios');
const accessTokens = new Set();
const appId = process.env.FB_CLIENT_ID;
const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

const app = express();

var corsOptions = {
  origin: "http://localhost:3000"
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;


// Route 1: UI to redirect the user to Facebook's login dialog
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
       <button> <a href="https://www.facebook.com/v6.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent('http://localhost:3000/oauth-redirect')}">
          Log In With Facebook
        </a></ button>
      </body>
    </html>
  `);
});


// Route 2: Exchange auth code for access token
app.get('/oauth-redirect', async (req, res) => {
  try {
    const authCode = req.query.code;

    // Build up the URL for the API request. `client_id`, `client_secret`,
    // `code`, **and** `redirect_uri` are all required. And `redirect_uri`
    // must match the `redirect_uri` in the dialog URL from Route 1.
    const accessTokenUrl = 'https://graph.facebook.com/v6.0/oauth/access_token?' +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/oauth-redirect')}&`+`code=${encodeURIComponent(authCode)}`;

    // Make an API request to exchange `authCode` for an access token
    const accessToken = await axios.get(accessTokenUrl).then(res => res.data['access_token']);
    // Store the token in memory for now. Later we'll store it in the database.
    console.log('Access token is', accessToken);
    accessTokens.add(accessToken);

    res.redirect(`/me?accessToken=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.response.data || err.message });
  }
});


// Route 3: Make requests to FB on behalf of the user
app.get('/me', async (req, res) => {
  try {
    const accessToken = req.query.accessToken;
    if (!accessTokens.has(accessToken)) {
      throw new Error(`Invalid access token "${accessToken}"`);
    }

    // Get the name and user id of the Facebook user associated with the access token.
    const data = await axios.get(`https://graph.facebook.com/me?access_token=${encodeURIComponent(accessToken)}`).
      then(res => res.data);
      console.log(data);

    return res.send(`
      <html>
        <body>
        Your name is ${data.name}
        </body>
      </html>
    `);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.response.data || err.message });
  }
});


app.listen(port,()=>{
  console.log(`Server is listening on port ${port}`);
})