module.exports = {

    isAuthorized: async (req, res, next) => {

        if(!req.session.username) return res.redirect('/adminLogin');
    
        next()
    }

}