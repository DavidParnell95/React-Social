const { admin , db } = require('../util/admin');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const config = require('../util/config');

//Get all posts
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
                    createdAt: doc.data.createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage
                });
            });

            return res.json(posts);
        })
        .catch((err) => {
            console.log(err);//Log errors to console
            res.status(400).json({body: "body must not be empty"})
        })
}
 
//Create new Post
exports.createNewPost = (req,res) => {
    if (req.body.body.trim() === '') 
    {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    //Add json to new document
    db.collection('posts').add(newPost).then((doc) => {
        // log that document with ID was created
        const resPost = newPost; 
        resPost.postID = doc.id;

        res.json({message: `document ${doc.id} created`})
    })
    .catch(err => {
        res.statusCode(500).json({error: 'something messed up :('});
        console.log(err);
    })
}

//Get single post
exports.getPost = (req,res) => {
    let postData = {};

    db.doc(`/posts/${req.params.postID}`).get().then((doc) => {
        
        if(!doc.exists)
        {
            return res.status(404).json({error: "Post not found"});
        }

        postData = doc.data();
        postData.postID = doc.id;

        return db.collection('comments').orderBy('createdAt', 'desc')
        .where('postID','==', req.params.postID).get();
    })
    .then((data) => {
        postData.comments = [];

        data.forEach((doc) => {
            postData.comments.push(doc.data());
        });

        return res.json(postData);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({error: err.code})
    });
};

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

//Like post
exports.likePost = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('postID', '==', req.params.postID)
      .limit(1);
  
    const postDocument = db.doc(`/posts/${req.params.postID}`);
  
    let postData;
  
    postDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          postData = doc.data();
          postData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Post not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection('likes')
            .add({
              postID: req.params.postID,
              userHandle: req.user.handle
            })
            .then(() => {
              postData.likeCount++;
              return postDocument.update({ likeCount: postData.likeCount });
            })
            .then(() => {
              return res.json(postData);
            });
        } else {
          return res.status(400).json({ error: 'Post already liked' });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

//Delete post
exports.deletePost = (res,req) => {
    const document = db.doc(`/posts/${req.params.postID}`);

    document.get().then((doc) =>{
        
        //If post doesnt exist 
        if(!doc.exists)
        {
            return res.status(404).json({error: 'Post cant be found'});
        }

        //If user handle doesnt match the one in the document
        //Prevents post from being deleted by other users 
        if(doc.data().userHandle !== req.user.handle)
        {
            return res.status(403).json({error: 'Unauthorized'})
        }
        else
        {
            //Delete the post 
            return document.delete();
        }
    })
    .then(() => {
        res.json({message: "Post successfully deleted"})
    })
    .catch((err) =>{
        console.error(err);
        return res.status(500).json({error: err.code});
    })
}