const { admin , db } = require('../util/admin');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const config = require('../util/config');

exports.getAllPosts =  (req,res) =>{
    db.collection('posts')
    .orderBy('createdAt','desc').get()//Order by createdAt date
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
}
 
exports.createNewPost = (req,res) => {
   
    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
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
}

let imageFilename;
let imageToBeUploaded = {};

exports.imageUpload = (req,res) => {
    const busboy = new BusBoy({headers: req.headers});
    
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        //Split file name on . 
        const extension = filename.split('.')[filename.split('.').length -1];
        imageFilename = `${Math.round(Math.random()*100000000)}.${extension}`;

        const filepath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = { filepath, mimetype}
        
        console.log("fieldname: " + fieldname + "\n filename: " + filename + "\n mimetype: " +mimetype)

        //Creates the file
        file.pipe(fs.createWriteStream(filepath))
    });

    //uploads the file 
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded, filepath), {
            resumable: false,
            metadata: {
                metadata: {
                    contenType: imageToBeUploaded.mimetype
                }
            }
        }
    }).then(() =>{
        const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`
        return db.doc(`/users/${req.user.handle}`).update({imageURL})
    }).then(() =>{
        return res.json({message: "image uploaded"})
    })
    .catch(err =>{
        console.error(err);
        return res.status(500).json({error: err.code});
    })
}