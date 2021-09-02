const { query } = require('express');
const { resolve } = require('path');

module.exports = function(dbPoolConnection) {

    if(!dbPoolConnection) throw new Error(`Cannot initialize without a database connection.`);

    const bcrypt = require('bcrypt');
    const path = require('path');
    const fs = require('fs').promises;
    const maxCount = 10;

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



    
    async function newDBQuery(statement, conditionObj){
        return await new Promise((resolve, reject) => {
            dbPoolConnection.query(statement.concat(conditionObj ? ` WHERE ${newDBQueryFilterString(conditionObj)}` : ''), function (err, result){

                if(err) return reject(err);

                return resolve(result);

            })
        })
    }

    async function getStudent(studentId, firstName, lastName){
        
        let sqlQuery = `SELECT * FROM student WHERE `;
        if(studentId) sqlQuery += `id = ${studentId}`;
        if(firstName && lastName) sqlQuery += `first_name = '${firstName}' and last_name = '${lastName}'`
        console.log(sqlQuery)
        return await new Promise((resolve, reject) => {
            dbPoolConnection.query(sqlQuery, function(err, result){
    
                if (err) return reject(err);
                return resolve(result[0])
    
            });
        })
    }

    async function getMedia(owningObjId, entityType){
        
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
    
    }

    async function getFile(fileId){
        try {
            
            return ( await newDBQuery(`SELECT * FROM media`, { id: fileId }))[0]

        } catch (e) {
            throw new Error(`Failed to get file ${fileId}. Error: ${e.message}`)
        }
    }

    async function getStudentProject(objectId, entityType){

        try {
            
            if(!validateAsId(objectId)) throw new Error(`Invalid ObjectId. Not a number.`);
            
            return await new Promise((resolve, reject) => {
                dbPoolConnection.query(`
                    SELECT Proj.*, SP.id AS link_id FROM student_project AS SP
                        LEFT JOIN ${entityType} AS Proj
                    ON Proj.id = SP.${entityType}_id
                        WHERE SP.${entityType === 'project' ? 'student' : 'project'}_id = ${objectId}                    
                `, function (err, result){
                    if(err) return reject(err);
                    return resolve(result);
                })
            })

        } catch (e) {
            console.log(e)
            throw new Error(`AppFn.GetStudentProject failed to find Projects related to StudentId ${studentId}. Error: ${e.message}`)
        }
    }

    async function addStudentProjectLink(studentId, projectId){

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

    async function getPaginationString(queryObj){
        
        let start = queryObj?.start,
            end = queryObj?.end,
            page = queryObj?.page;

        if(start) delete queryObj.start;
        if(end) delete queryObj.end;
        if(page) delete queryObj.page;

        start = validateAsId(start) && start > 1 ? start : 0;
        end = validateAsId(end) && end >= 1 ? end : maxCount;
        pageNum = validateAsId(page) && page !== 0 ? page : 1;

        return {
            query: queryObj,
            pagination: {
                start: start,
                end: end,
                page: pageNum
            }
        }

    }

    return {

        encryptString: async function (string){
            return await bcrypt.hash(string, await bcrypt.genSalt(10))   
        },
        decryptString: async function (string, encryptedString){
            return await bcrypt.compare(string, encryptedString)
        },
        searchEntity: async function (query, entityType, mapToContext){

            let pagination = await getPaginationString(query);

            query = pagination.query;

            let { start, end, page } = pagination.pagination;

            let paginationStr = ` LIMIT ${maxCount} OFFSET ${start};`;

            console.log(187, query)

            query = Object.keys(query).length ? `WHERE ${newDBQueryFilterString(query, null, 'like')}` : '';

            let resultSet = {};

            let searchResults = await new Promise((resolve, reject) => {


                let sqlQuery = `
                    SELECT * FROM ${entityType} ${query} ${paginationStr}
                    SELECT COUNT(*) FROM ${entityType} ${query} ${paginationStr}
                `;
                console.log(sqlQuery)
                dbPoolConnection.query(sqlQuery, function(err, result){

                    if(err) return reject(err)

                    return resolve(result)
                })
            });

            // console.log(204, searchResults)

            resultSet.page = page;
            resultSet.start = start;
            resultSet.end = end;
            resultSet.totalRows = searchResults[1][0]['COUNT(*)'];

            if(typeof mapToContext !== 'string') {
                resultSet.Data = searchResults[0];
                return resultSet
            }

            switch(mapToContext){

                case 'project':

                    resultSet.Data = await Promise.all(

                        searchResults[0].map(async obj => {
                        
                            let prof = await this.getProjectProfile(obj.id, obj); 
        
                            prof.students = await Promise.all(prof.students.map(
                                async student => {

                                    let studPhoto = (await getMedia(student.id, 'student'))[0];

                                    return {
                                        ...student,
                                        profilePhoto: studPhoto
                                    }
                                    
                                })
                            ); 
        
                            return prof
        
                        })
                    )

                break;

                default:
                    throw new Error(`Invalid context mapping provided ${mapToContext}.`)

            }

            

            console.log(204, resultSet)

            return resultSet

        },
        // searchEntity: async function (query, entityType, mappingFn){

        //     let searchResults = await new Promise((resolve, reject) => {


        //         let sqlQuery = `SELECT * FROM ${entityType} ${query ? `WHERE ${newDBQueryFilterString(query, null, 'like')}` : ''}`

        //         dbPoolConnection.query(sqlQuery, function(err, result){

        //             if(err) return reject(err)

        //             return resolve(result)
        //         })
        //     });

        //     if(!typeof mappingFn === 'function') {

        //     }


        // }
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

                    // Check if the file is marked as the hero image
                    let is_hero = file?.is_hero;

                    console.log(344, file)

                    file = await new Promise((resolve, reject) => {

                        console.log('Updating DB filestore...');
                        let sqlQuery = `
                            INSERT into media (name, path, owning_id, entity_type) VALUES ('${name}', '${filePath.replace(/\\/g, '/')}', '${owningObjId}', '${entityType}')
                        `;
                     
                        dbPoolConnection.query(sqlQuery, function(err, result){
            
                            if (err) return reject(err);
            
                            return resolve(result)
            
                        });
                    })

                    console.log(356, file)
                    // If it's set as the hero image, update the object store, remove all existing flags and replace with this one
                    if(is_hero){
                        await this.setHeroMedia(file.insertId, owningObjId)
                    }

                    return file.insertId

                };   
                
                return await Promise.all(uploadedFiles.map(file => addFile(file)))
        
            } catch (e) {
                console.log(e)
                throw new Error(`Failed to update File Store in database. Error: ${e.message}`)
            }
        
        },    
        getMedia: getMedia,
        getFile: getFile,
        deleteMedia: async function (fileId){

            try {
                
                if(!validateAsId(fileId)) throw new Error(`Invalid FileId. Must be a number.`);

                return await newDBQuery(`DELETE FROM media`, { id: fileId })

            } catch (e) {
                throw new Error(`Failed to delete FileId ${fileId}. Error: ${e.message}.`)      
            }

        },
        getStudent: getStudent,
        getStudentProfile: async function (studentId, student){

            try {

                if(!student) student = (await getStudent(studentId));

                let id = student.id;

                let profilePhoto = (await getMedia(id, 'student'))[0];

                let projects = await getStudentProject(id, 'project')

                console.log(438, projects)

                let o = {
                    ...student,
                    ...profilePhoto,
                    projects: projects
                }

                o.id = id;
                console.log(258, o)
                return o
        
            } catch (e) {
                throw new Error(`Failed to get Student Profile for Student ${studentId}. Error: ${e.message}`)
            }
        },
        getProjectProfile: async function (projectId, project){

            try {
                
                if(!project) project = (await this.getProject(projectId));

                let id = project.id

                let media = await getMedia(projectId, 'project');

                let students = await getStudentProject(id, 'student');
                console.log(297, students)
                
                let pro = {
                    ...project,
                    media: media,
                    students: students
                }

                pro.id = id
                // console.log(280, pro)
                return pro
            } catch (e) {
                throw new Error(`Failed to get Project Portfolio ${projectId}. Error: ${e.message}`)
            }
        },
        getProject: async function (projectId){

            try {

                let sqlQuery = `SELECT * FROM project WHERE `;
                if(projectId) sqlQuery += `id = ${projectId}`;
                console.log(sqlQuery)
                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(sqlQuery, function(err, result){
            
                        if (err) return reject(err);
                        return resolve(result[0])
            
                    });
                })

                

            } catch (e) {

                throw new Error(`Project ${projectId} could not be found!`)
            }
   

        },
        deleteObject: async function (objectId, entityType){
            
            try {
                
                if(!validateAsId(objectId)) throw new Error(`No ObjectId specified.`);

                const entityTypeValidator = ['media', 'student', 'project'];

                if(!entityTypeValidator.includes(entityType)) throw new Error(`No EntityType specified.`);

                // DELETE STUDENT_PROJECT_LINKS
                return await newDBQuery(`DELETE FROM ${entityType}`, { id: objectId })

            } catch (e) {
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

                console.log(406, objectId, updateObj)
                return await new Promise((resolve, reject) => {
                    dbPoolConnection.query(`UPDATE project SET ${newDBQueryFilterString(updateObj, 'update')} WHERE id = ${objectId}`, function (err, result){
                        if(err) return reject(err);
                        return resolve(result);
                    })
                })

            } catch (e) {
                throw new Error(`AppFn.PatchProject failed to patch ObjectId ${objectId}. Error: ${e.message}`)
            }

        },
        getStudentProject: getStudentProject,
        addStudentProjectLink: addStudentProjectLink,
        deleteStudentProjectLink: async linkId => {

            try {
                
                return await newDBQuery(`DELETE FROM student_project`, { id: linkId })

            } catch (e) {
                throw new Error(`Failed to delete StudentProjectLink ${linkId}. Error: ${e.message}`)
            }

        },
        newStudentProjectLinkSet: async (linkIDs, objectID, entityType) => {
            if (linkIDs) {
                console.log('Binding Student to Projects...');
                if (linkIDs.includes(','))
                    linkIDs = linkIDs.split(',');
                else
                    linkIDs = [linkIDs];
        
                // await Promise.all(objectIDs.map(objID => addStudentProjectLink(object[0].id, objID)));
                await Promise.all(linkIDs.map(objID => {
                    let args = [objectID, objID];
                    
                    if(entityType == "project") args = args.reverse()

                    console.log(args)

                    return addStudentProjectLink(...args)}));
        
            }
        },
        getStudentProjectLinks: async (objectID, entityType) => {
            try {

                if(!validateAsId(objectID)) throw new Error(`Invalid object id. Not a number.`);

                if(!validateAsEntity(entityType)) throw new Error(`Invalid entityType.`);

                let statement = `SELECT * FROM student_project`;
                let condition = entityType === 'student' ? { student_id: objectID } : { project_id: objectID }

                return await newDBQuery(statement, condition)

            } catch (e) {
                console.log(e)
            }
        },
        getAboutBlurbs: async () => {

            try {
               
                return await newDBQuery(`SELECT * FROM about`)
                
            } catch (e) {
                throw new Error(`GetAboutBlurbs failed. Error: ${e.message}.`)
            }

        },
        setHeroMedia: async (id, owningId) => {

            try {

                console.log(626, arguments)

                if(!validateAsId(id) || !validateAsId(owningId)) throw new Error(`Invalid Id/OwningId.`);
                
                await newDBQuery(`UPDATE media SET is_hero = NULL`, { owning_id: owningId });
                
                await newDBQuery(`UPDATE media SET is_hero = true`, { id: id })


            } catch (e) {
                throw new Error(`SetHeroImage failed. Error: ${e.message}.`)
            }

        }
        
    }

}