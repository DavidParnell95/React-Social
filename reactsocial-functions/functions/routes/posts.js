const {db} = require('../util/admin');

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