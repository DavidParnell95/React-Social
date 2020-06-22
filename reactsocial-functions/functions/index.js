const functions = require('firebase-functions');
const admin = require('firebase-admin');

const express = require('express');

admin.initializeApp();
const app = express();



// Get all posts from DB
app.get('/posts', (req,res) =>{
    admin.firestore()
    .collection('posts')
    .orderBy(createdAt,'descending').get()//Order by createdAt date
    .then((data) => {
            let posts = [];//Array to hold posts
            data.forEach((doc) => {
                posts.push({
                    postID: doc.id,
                    body: doc.data.body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data.createdAt
                });
            });

            return res.json(posts);
        })
        .catch(err => console.log(err))//Log errors to console
})

//Create new post with data from request object
app.post('/post',(req,res) => {
   
    const newPost = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    //Add json to new document
    admin.firestore().collection('posts').add(newPost).then(doc => {
        // log that document with ID was created
        res.json({message: `document ${doc.id} created`})
    })
    .catch(err => {
        res.statusCode(500).json({error: 'something messed up :('});
        console.log(err);
        })
    })

    exports.api = functions.region('europe-west1').https.onRequest(app);