const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
const e = require('express');

const app = require('express')();
admin.initializeApp();

//Firebase Configuration 
const config = {
    apiKey: "AIzaSyCaPLVTbGcc5hXKW5VCgTwp8Eu16OpxMdc",
    authDomain: "react-social-31369.firebaseapp.com",
    databaseURL: "https://react-social-31369.firebaseio.com",
    projectId: "react-social-31369",
    storageBucket: "react-social-31369.appspot.com",
    messagingSenderId: "1049822439839",
    appId: "1:1049822439839:web:f01a4cb643a1c168db75aa",
    measurementId: "G-BSKHG5YVZD"
}

firebase.initializeApp(config)


const db = admin.firestore();

// Get all posts from DB
app.get('/posts', (req,res) =>{
    db.collection('posts')
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
    db.collection('posts').add(newPost).then(doc => {
        // log that document with ID was created
        res.json({message: `document ${doc.id} created`})
    })
    .catch(err => {
        res.statusCode(500).json({error: 'something messed up :('});
        console.log(err);
        })
    })

//Sign Up Route
app.post('/signup', (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassord: req.body.confirmPassord,
        handle: req.body.handle,
    };

    //TODO: validate
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc =>{

        //check if user document already exists
        if(doc.exists)
        {
            return res.status(400).json({handle: 'user already exists'})            
        }//end if exists

        else{
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email,newUser.password)
            .then(data =>{
                return data.user.getIdToken();
            })
            .then(token => {
                return res.status(201).json({token});
            })
            .catch(err => {
                console.error(err);
                return res.status(500).json({error: err.code});
            })

        }//End else
    })

})


    exports.api = functions.region('europe-west1').https.onRequest(app);