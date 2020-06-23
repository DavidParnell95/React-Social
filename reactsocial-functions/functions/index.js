const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
const e = require('express');
const { auth } = require('firebase-admin');

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

const isEmpty = (string) => {
    if(string.trim() === '')
    {
        return true;
    }

    else{ return false }
}

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

//checks if valid email
const isEmail = (email) => {
    const regEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if(email.match(regEX))
    {
        return true;
    }

    else{
        return false;
    }
}

//Sign Up Route
app.post('/signup', (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassord: req.body.confirmPassord,
        handle: req.body.handle,
    };

    let errors = {};

    //Email Checking 
    //Check if email entered
    if(isEmpty(newUser.email))
    {
        errors.email = "Mustn't be empty"
    }

    //Check if email is a valid email
    else if(!isEmail(newUser.email))
    {
        errors.email = "Must be a valid email address"
    }

    //Password Checking
    //Check if password entered
    if(isEmpty(newUser.password)){ 
        errors.password = "Mustn't be Empty"
    }

    //Check if password and confirmPassword match
    if(newUser.password !== newUser.confirmPassord)
    {
        errors.confirmPassord = "Passwords do not match"
    }

    //If errors
    if(Object.keys(errors).length > 0)
    {
        return res.status(400).json(errors);
    }

    //Check if the user already exists
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc =>{
        let token, userId;

        //check if user document already exists
        if(doc.exists)
        {
            return res.status(400).json({handle: 'username already exists'})            
        }//end if exists

        else{
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email,newUser.password)
            .then(data =>{
                return data.user.getIdToken();
            })
            .then(idToken => {
                token = idToken;
                userId = data.user.userId;
                
                //Prep user infor for document
                const userCred = {
                    handle: newUser.handle,
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    userId
                }

                return db.doc(`/users/${newUser.handle}`).set(userCred);
            }).then(() => {
                return res.status(201).json({ token });
            })


            .catch(err => {
                console.error(err);

                //If email exists error 
                if(err.code === 'auth/email-aleardy-in-user')
                {
                    return res.status(500).json({ email: 'Email is already in user'});
                }

                //Everything else
                else{
                    return res.status(500).json({error: err.code});
                }
                
            })

        }//End else
    })

});

//Login Route
app.post('/login', (req,res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    //check email
    if(isEmpty(user.email)) {
        errors.email = "Mustn't be empty"
    }

    //Check password
    if(isEmpty(user.password)) {
        errors.password = "Mustn't be empty"
    }

    //check if errors 
    if(Object.keys(errors).length > 0 )
    {
        return res.status(400).json(errors);
    }
    
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.getIdToken();
        }).then(token => {
            return res.json({ token })
        }).catch(err => {
            if(err.code === 'auth/wrong-password')
            {
                return res.status(403).json({general: 'Wrong credentials, try again'})
            }

            else{
                return res.status(500).json({ error: err.code })
            }
            
        })
})


exports.api = functions.region('europe-west1').https.onRequest(app);