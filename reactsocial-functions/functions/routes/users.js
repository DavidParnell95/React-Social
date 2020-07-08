const { admin, db} = require('../util/admin');
const {validateSignupData, validateLoginData, reduceUserDetails} = require("../util/validator");
const { error } = require('console');
const { user } = require('firebase-functions/lib/providers/auth');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

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
                userId = data.user.uid;
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
                if(err.code === 'auth/email-aleardy-in-use')
                {
                    return res.status(500).json({ email: 'Email is already in use'});
                }

                //Everything else
                else{
                    return res.status(500).json({general: "something messed up, please try again"});
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
        }).catch((err) => {
            console.error(err);
           return res.status(403).json({general: 'Wrong credentials, try again'})
        })
}

//Add user details
exports.addUserDetails = (req,res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
        return res.json({message: 'User details added'})
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({error: err.code})
    })
}

//Get own user details 
exports.getUserDetails = (req,res) => {
    let userData = {};

    db.doc(`users/${req.user.handle}`).get()
    .then((doc) => {
        
        //Check if document exists
        if(doc.exists)
        {
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', req.user.handle).get();
        }
    })
    .then(data => {
        userData.likes = [];
        
        data.forEach(doc => {
            userData.likes.push(doc.data());
        })

        return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          postID: doc.data().postID,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Get other uses details 
exports.getOtherUserDetails = (req,res) => {
    let userData = {};

    db.doc(`/users/${req.params.handle}`).get().then((doc) =>{
        if(doc.exists)
        {
            userData.user = doc.data();
            
            return db.collection("posts")
            .where("userHandle","==",req.params.handle)
            .orderBy("createdAt","desc").get();
        }
        else
        {
            return res.status(404).json({error: "user not found"})
        }
    }).then((data) =>{
        userData.posts = [];
        data.forEach((doc) =>{
            userData.posts.push({
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                postID: doc.id,
            });
        });

        return res.json(userData);
    }).catch((err) =>{
        console.error(err);
        return res.status(500).json({error: err.code});
    });
};

//Notifications marked as read
exports.markNotificationsRead = (req,res) => {
    let batch = db.batch();

    req.body.forEach((notificationId)=>{
        const notification = db.doc(`/notifications/${notificationID}`);
        batch.update(notification, {read:true});
    });

    batch.commit().then(() => {
        return res.json({message: "notifications cleared"})
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({error: err.code})
    });
}

//Upload profile image
exports.imageUpload = (req,res) => {

    const busboy = new BusBoy({headers: req.headers});

    let imageName;
    let imageToUpload = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        //Make sure image uploaded 
        if(mimetype != 'image/jpeg' && mimetype != 'image/png')
        {
            return res.status(400).json({ error: 'incorrect file type'});
        }

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

    busboy.end(req.rawBody);
}