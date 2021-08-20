const { resolve } = require('path');

module.exports = function(dbPoolConnection) {

    if(!dbPoolConnection) throw new Error(`Cannot initialize without a database connection.`);

    const bcrypt = require('bcrypt');
    const path = require('path');
    const fs = require('fs').promises;

    // Utility Functions
    function validateAsId(value){
        return !isNaN(Number(value))
    }

    function validateAsEntity(string){
        return ['student','project','media'].includes(string.toLowerCase())
    }

    function newDBQueryFilterString(object, type, operator){

        let delimiter = ' AND ';
        if(type === 'update') delimiter = ', ';

        if(operator === 'like') return Object.keys(object).map(k => `${k} LIKE '%${object[k]}%'`).join(delimiter) 

        return Object.keys(object).map(k => `${k} = '${object[k]}'`).join(delimiter)
    }

    return {

        encryptString: async function (string){
            return await bcrypt.hash(string, await bcrypt.genSalt(10))   
        },
        decryptString: async function (string, encryptedString){
            return await bcrypt.compare(string, encryptedString)
        },
        searchStudents: async function (query){
            return await new Promise((resolve, reject) => {


                let sqlQuery = `SELECT * FROM student ${query ? `WHERE ${newDBQueryFilterString(query, null, 'like')}` : ''}`

                dbPoolConnection.query(sqlQuery, function(err, result){

                    if(err) return reject(err)

                    return resolve(result)
                })
            });
        },
        searchProjects: async function (query){
            return await new Promise((resolve, reject) => {
                let sqlQuery = `SELECT * FROM project ${query ? `WHERE ${newDBQueryFilterString(query, null, 'like')}` : ''}`
                dbPoolConnection.query(sqlQuery, function(err, res) {

                    if(err) return reject(err);

                    return resolve(res)

                })
            }); 
        },
        uploadFiles: async function (req, entityType, defaultPath) {
    
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
            
                                let filePath = path.join(defaultPath, targetSaveFolder, fileName);
            
                                await fs.writeFile(filePath, fileAsBuffer);
        
                                return {
                                    name: fileName,
                                    filePath: filePath
                                }            
            
                            } catch (e) {
                                throw new Error(`Failed to upload file ${fileName}. Error: ${e.message}`);
                            }
                        }));
            
                    } else {
                        console.log('Handling single file...');
            
                        let file = req.files.Files;
                        let fileName = file.name;
                        let filePath = path.join(defaultPath, targetSaveFolder, fileName);
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
        
                if(!validateAsId(owningObjId)) throw new Error('Invalid OwningObjectId.');
                
                console.log(112, uploadedFiles)
        
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
        getProject: async function (projectId){

            let sqlQuery = `SELECT * FROM project` ;
            if(projectId) sqlQuery += `WHERE id = ${projectId}`;

            return await new Promise((resolve, reject) => {
                dbPoolConnection.query(sqlQuery, function(err, result){

                    if (err) return reject(err);
                    return resolve(result)

                });
            })
        },
        deleteObject: async function (objectId, entityType){
            
            try {
                
                if(!validateAsId(objectId)) throw new Error(`No ObjectId specified.`);

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

        },
        createStudent: async (firstName,lastName, biography) => {
            return await new Promise((resolve, reject) => {
                let sqlQuery = `INSERT into student ( first_name, last_name, biography) VALUES ('${firstName}', '${lastName}', '${biography}')`;
                console.log('inserting')
                dbPoolConnection.query(sqlQuery, function(err, result){

                    if (err) return reject(err);

                    return resolve(result)

                });
            })
        },
        createProject: async (title, project_date, project_type, description) => {
            return await new Promise((resolve, reject) => {
                let sql = `
                    INSERT into project
                        (title, project_date, project_type, description) 
                    VALUES 
                        ('${title}', '${project_date}', '${project_type}', '${description}');

                    SELECT LAST_INSERT_ID() AS id
                `
                dbPoolConnection.query(sql, function (err, result){
                    if(err) return reject(err);

                    console.log(247, result)

                    return resolve(result);
                })
            })
        },
        patchStudent: async function (studentId, updateObj){
            
            try {

                if(!validateAsId(studentId)) throw new Error(`Invalid ObjectId. Not a number.`);

                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(`UPDATE student SET ${newDBQueryFilterString(updateObj, 'update')} WHERE id = ${studentId}`, function (err, result){
                        if(err) return reject(err);
                        return resolve(result);
                    })
                })

            } catch (e) {
                console.log(e)
                throw new Error(`AppFn.PatchStudent failed to patch ObjectId ${studentId}. Error: ${e.message}`)
            }

        },
        patchProject: async function (objectId, updateObj){
            
            try {

                if(!validateAsId(objectId)) throw new Error(`Invalid ObjectId. Not a number.`);

                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(`UPDATE project SET (${newDBQueryFilterString(updateObj, 'update')})`, function (err, result){
                        if(err) return reject(err);
                        return resolve(result);
                    })
                })

            } catch (error) {
                throw new Error(`AppFn.PatchProject failed to patch ObjectId ${objectId}. Error: ${e.message}`)
            }

        },
        addStudentProjectLink: async function (studentId, projectId){

            try {

                console.log(arguments)

                if(!validateAsId(studentId) || !validateAsId(projectId)) throw new Error(`Invalid Student/Project Id. Not a number.`);

                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(`INSERT INTO student_project (student_id, project_id) VALUES(${studentId}, ${projectId})`, function (err, result){
                        if(err) return reject(err);
                        return resolve(result);
                    })
                })

            } catch (e) {
                console.log(e)
            }

        }
        
    }

}