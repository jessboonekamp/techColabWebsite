module.exports = function(databasePoolConnection){

    return {
        
        getPoolConnection: function(){

            return new Promise((resolve, reject) => {

                databasePoolConnection.getConnection((err, connection) => {
    
                    if(err) reject(err);
    
                    resolve(connection)
                    
                })

            })

        }

    }

}