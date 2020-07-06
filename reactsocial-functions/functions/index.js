const functions = require('firebase-functions');
const app = require('express')();
const FbMw = require('./util/FbMW')

const {getAllPosts, createNewPost} = require('./routes/posts');
const {signUp, login, imageUpload, addUserDetails, getUserDetails} = require('./routes/users')

// Posts routes 
app.get('/posts', getAllPosts);//Get all posts
app.post('/post', FbMw, createNewPost);//Create new posts
app.get('/user', FbMw, getUserDetails );//Get user credentials & likes

// Authentication routes
app.post('/signup', signUp);//Sign up route
app.post('/login', login);//Login route
app.post('user/image', FbMw, imageUpload);
app.post('/user',FbMw,addUserDetails)

exports.api = functions.region('europe-west1').https.onRequest(app);