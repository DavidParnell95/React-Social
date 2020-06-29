const { admin, db } = require('./admin')

module.exports = (req, res, next) =>
{
    let idToken; 

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
    {
        idToken = req.headers.authorization.split('Bearer ')[1];

    }

    else{
        console.error("Token not found");
        return res.status(403).json({ error: 'Unauthorized'});
    }

    admin.auth().verifyIdToken(idToken).then(decToken => {
        req.user = decToken;
        console.log(decToken);

        return db.collection('users').where('userId', '==', req.user.uid).limit(1)
        .get();
    })
    .then(data => {
        //Extract handle
        req.user.handle = data.docs[0].data().handle;
        return next();
    })
    //If fails for any reason
    .catch(err => {
        console.error('Token Error', err);
        return res.status(403).json(err);
    })
}