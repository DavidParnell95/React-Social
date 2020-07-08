const { admin , db } = require('../util/admin');
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

//Comment on post
exports.commentOnPost = (req, res) => {
    if(req.body.body.trim() === '')
    {
        return res.status(400).jsopn({comment: "Must not be empty "})
    }

    //Object storing comment and commenter info
    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        postID: req.params.postID,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };
    console.log(newComment);

    db.doc(`posts/${req.params.postID}`).get().then((doc) => {
        if(!doc.exists)
        {
            return res.status(400).json({error: "Post not found"})
        }

        //Update comment count on post
        return doc.ref.update({commentCount: doc.data().commentCount +1});
    }).then(() =>{
        //Add to comment collection
        return db.collection('comments').add(newComment);
    }).then(() =>{
        res.json(newComment);
    }).catch((err) => {
        console.log(err);
        return res.status(500).json({error: "Something messed up"})
    });
};

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

//Unlike post
exports.unlikePost = (req,res) => {
    const likedDocument = db.collection('likes')
    .where('userHandle',"==",req.user.handle)
    .where("postID","==",req.params.postID)
    .limit(1);

    const postDocument = db.doc(`/posts/${req.params.postID}`);
    let postData;

    postDocument.get().then((doc) =>{
        if(doc.exists)
        {
            postData = doc.data();
            postData.postID = doc.id;
            return likedDocument.get();
        }
        //No post found
        else{
            return res.status(404).json({error: "Post not found"});
        }
    }).then((data) => {
        //If data is empty
        if(data.empty)
        {
            return res.status(400).json({error: 'Post not liked'})
        }
        else{
            return db.doc(`/likes/${data.docs[0].id}`).delete().then(() =>{
                postData.likeCount--;
                return postData.update({likeCount: postData.likeCount});
            }).then(()=>{
                res.json(postData);
            });
        }
    }).catch((err) => {
        console.error(err);
        res.status(500).json({error: err.code});
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