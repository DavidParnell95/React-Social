const functions = require('firebase-functions');
const app = require('express')();
const FbMw = require('./util/FbMW')

const {getAllPosts, createNewPost} = require('./routes/posts');
const {signUp, login, imageUpload} = require('./routes/users')

// Posts routes 
app.get('/posts', getAllPosts);//Get all posts
app.post('/post', FbMw, createNewPost);//Create new posts 

// Authentication routes
app.post('/signup', signUp);//Sign up route
app.post('/login', login);//Login route
app.post('user/image', FbMw, imageUpload);

exports.api = functions.region('europe-west1').https.onRequest(app);