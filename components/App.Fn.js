module.exports = function(dbPoolConnection) {

    if(!dbPoolConnection) throw new Error(`Cannot initialize without a database connection.`);

    const bcrypt = require('bcrypt');

    return {

        encryptString: async function (string){
            return await bcrypt.hash(string, await bcrypt.genSalt(10))   
        },
        decryptString: async function (string, encryptedString){
            return await bcrypt.compare(string, encryptedString)
        },
        searchStudents: async function (){
            return await new Promise((resolve, reject) => {
                let sqlQuery = `SELECT * FROM student ORDER BY id DESC`
                dbPoolConnection.query(sqlQuery, function(err, result){
                    if(err) throw new Error(err)
                    return resolve(result)
                })
            });
        },
        uploadFiles: async function (req, entityType) {
    
            try {
                
                let targetSaveFolder = 'files/'.concat(entityType === 'student' ? 'student_media' : 'project_media');
                let uploadFiles = [];
                if (req.files?.Files) {
                    if (Array.isArray(req.files.Files)) {
                        let files = req.files.Files;
                        uploadFiles = await Promise.all(files.map(async file => {
                            let fileName;
                            try {
            
                                fileName = file.name;
            
                                let fileAsBuffer = new Buffer.from(file.data, file.encoding);
            
                                let filePath = path.join(__dirname, targetSaveFolder, fileName);
            
                                await fs.writeFile(filePath, fileAsBuffer);
        
                                uploadFiles.push({
                                    name: fileName,
                                    filePath: filePath
                                })
            
            
                            } catch (e) {
                                throw new Error(`Failed to upload file ${fileName}. Error: ${e.message}`);
                            }
                        }));
            
                    } else {
                        console.log('Handling single file...');
            
                        let file = req.files.Files;
                        let fileName = file.name;
                        let filePath = path.join(__dirname, targetSaveFolder, fileName);
                        let fileAsBuffer = new Buffer.from(file.data, file.encoding);
                        await fs.writeFile(filePath, fileAsBuffer);
                        uploadFiles.push({
                            name: fileName,
                            filePath: filePath
                        });
                    }
                }
        
                return uploadFiles
        
            } catch (e) {
                console.log(e)
                throw new Error(`File upload failed. Error: ${e.message}`)
            }
        
        
        },
        updateDbFileStore: async function (owningObjId, uploadedFiles, entityType){
        
            try {
        
                if(isNaN(Number(owningObjId))) throw new Error('Invalid OwningObjectId.');
                
                console.log(uploadedFiles)
        
                if(!Array.isArray(uploadedFiles) || !uploadedFiles.find(f => typeof f === 'object'))
                    throw new Error(`Invalid File Array.`);
        
                if(!entityType) throw new Error(`No EntityType specified.`);
        
                const addFile = async file => {
                    let { name, filePath } = file;
                    return await new Promise((resolve, reject) => {
                        let sqlQuery = `INSERT into media ( name, path, owning_id, entity_type) VALUES ('${name}', '${filePath.replace(/\\/g, '/')}', '${owningObjId}', '${entityType}')`;
                        console.log('Updating DB filestore...');
                        dbPoolConnection.query(sqlQuery, function(err, result){
            
                            if (err) return reject(err);
            
                            return resolve(result)
            
                        });
                    })
                };   
                
                return await Promise.all(uploadedFiles.map(file => addFile(file)))
        
            } catch (e) {
                console.log(e)
                throw new Error(`Failed to update File Store in database. Error: ${e.message}`)
            }
        
        },    
        getMedia: async function (owningObjId, entityType){
        
            try {
                
                let results = await new Promise((resolve, reject) => {
                    let sqlQuery = `SELECT * FROM media WHERE owning_id = ${owningObjId} AND entity_type = '${entityType}'`;
                    dbPoolConnection.query(sqlQuery, function(err, result){
                    
                        if (err) return reject(err);
            
                        return resolve(result)
            
                    });
                });
        
                return results.map(r => {
                    r.path = `/${entityType}_media/${r.name}`
                    return r
                })
        
            } catch (e) {
                throw new Error(`Failed to get Media for EntityType ${entityType}, OwningObjectId ${owningObjId}`)
            }
        
        },    
        getStudent: async function (studentId, firstName, lastName){
        
            let sqlQuery = `SELECT * FROM student WHERE `;
            if(studentId) sqlQuery += `id = ${studentId}`;
            if(firstName && lastName) sqlQuery += `first_name = '${firstName}' and last_name = '${lastName}'`
        
            return await new Promise((resolve, reject) => {
                dbPoolConnection.query(sqlQuery, function(err, result){
        
                    if (err) return reject(err);
                    return resolve(result)
        
                });
            })
        },
        deleteObject: async function (objectId, entityType){
            
            try {
                
                if(isNaN(Number(objectId))) throw new Error(`No ObjectId specified.`);

                const entityTypeValidator = ['media', 'student', 'project'];

                if(!entityTypeValidator.includes(entityType)) throw new Error(`No EntityType specified.`);

                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(`DELETE FROM ${entityType} WHERE id = ${objectId}`, function(err, result){
            
                        if (err) return reject(err);

                        return resolve(result)
            
                    });
                })

            } catch (error) {
                throw new Error(`AppFn.DeleteObject failed to remove ObjectId ${objectId}. Error: ${e.message}`)
            }

        }
        
    }

}