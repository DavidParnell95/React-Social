const { admin, db} = require('../util/admin');
const {validateSignupData, validateLoginData} = require("../util/validator");
const firebase = require('firebase');
const config = require('../util/config');
const { error } = require('console');

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

    const noImg = 'blank.png'

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
                    imageUrl: `http://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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

exports.imageUpload = (req,res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs')

    const busboy = new BusBoy({headers: req.headers});

    let imageName;
    let imageToUpload = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        //split on . and get last item 
        const extension = filename.split('.')[filename.split('.').length -1]
        imageName = `${Math.round(random()*1000000000)}.${extension}`;//Give random name

        const filepath = path.join(os.tmpdir(),imageName);
        imageToUpload = { filepath, mimetype};
        
        console.log("Fieldname: " + fieldname);
        console.log("filename: " + filename);
        console.log("mimetype: " + mimetype);

        //Create file
        file.pipe(fs.createWriteStream(filepath));
    })

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToUpload.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToUpload.mimetype
                }
            }
        })
        .then(()=> {
            const imageURL = `http://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageName}?alt=media`
            return db.doc(`/user/${req.user.handle}`).update({ imageURL });
        })
        .then(() => {
            return res.json({ message: 'Image uploaded successfully'})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: error.code})
        })
    })
}