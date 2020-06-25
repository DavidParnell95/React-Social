const {db} = require('../util/admin');
const {validateSignupData, validateLoginData} = require("../util/validator");
const firebase = require('firebase');
const config = require('../util/config');

firebase.initializeApp(config);

//Signup
exports.signUp = (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassord: req.body.confirmPassord,
        handle: req.body.handle,
    };

    const { valid, errors } = validateSignupData(newUser);

    if(!valid)
    {
        return res.status(400).json(errors);
    }

    let token, userId;

    //Check if the user already exists
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc =>{

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

}

//Log In 
exports.login = (req,res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(user);

    if(!valid)
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
}