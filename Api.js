const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const formUploader = require('express-fileupload');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const bootstrapDir = '/node_modules/bootstrap/dist/';
const app = express();
app.use(formUploader());
app.set('trust proxy', 1);
app.use(
    session({
        secret: 'keyboard cat',
        saveUninitialized: true,
        resave: true,
        cookie: {
            secure: false
        }
    })
);

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/student_media', express.static(path.join(__dirname, 'files/student_media')));
app.use('/project_media', express.static(path.join(__dirname, 'files/project_media')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Load Bootstrap
// You'll be able to access these in the ejs via their named locations; 
//  -src="bs_scripts/file_name"
//  -src="bs_styles/file_name"
app.use('/bs_scripts', express.static(__dirname + bootstrapDir + 'js'));
app.use('/bs_styles', express.static(__dirname + bootstrapDir + 'css'));
app.use('/modules', express.static(__dirname + 'node_modules/moment'));

const webAppConfig = require('./app.config.json');
let { port, database, adminUser, appName } = webAppConfig;

app.set('views', './views');
app.set('view engine', 'ejs');

// Connect to db
const dbPoolConnection = mysql.createConnection(database);

dbPoolConnection.connect(err => {

    if (err) throw err;

    console.log("Connected!");

});

const AppClass = require('./components/App.Class')(dbPoolConnection);
const AppFn = require('./components/App.Fn')(dbPoolConnection);
const ApiMiddleware = require('./components/Api.Middleware');

// Middleware goes here


// Api code goes here
app.get('/', async (req, res, next) => {

    let resObj, statCode, pageName = 'Home';

    try {

        // Code here
        resObj = {
            Content: 'Home',
            AppName: appName
        }
    
    } catch (e) {
    
        console.log(e)
    
        if(!statCode) statCode = 500;
    
        content = 'Error';
        resObj = {
            ErrorTitle: 'Error',
            ErrorMessage: e.message
        }
    
    }
    
    resObj.AppName = appName

    res.status(statCode || 200).render(pageName, resObj)

});

app.get('/:entityType', async (req, res, next) => {

    try {
        
        const entityTypeValidator = ['student', 'project','media'];

        let entityType = req.params.entityType;
        if(!entityTypeValidator.includes(entityType)){
            statCode = 400;
            throw new Error(`Bad request. No EntityType specifid.`)
        }




    } catch (e) {
        
    }

});

app.get('/adminLogin', async (req, res, next) => {

    let statCode;

    let resObj = {
        AppName: appName,
        Content: null,
        FormError: null
    }

    try {

        // project in a db
        resObj.Content = 'Login'

        
    } catch (e) {
        
        if(!statCode) statCode = 500;


    }

    res.status(statCode || 200).render('Login', resObj)

});

app.all('/adminLogin', async (req, res, next) => {

    let statCode = 200, resObj = { 
        AppName: appName,
        FormError: null,
        Content: null
    }, content, resMethod = 'redirect', resArgs = [];

    // All FormData gets bound to the Req.Body
    try {

        switch(req.method){

            case 'POST':

                let defaultMsg = 'Invalid username or password.';
                let body = req.body;
                if(!body){
                    statCode = 400;
                    throw new Error('Bad request. No payload specified.')
                }


                // Validate request body
                let { username, password } = body;

                // Validate username
                if(!username || username.toLowerCase() !== adminUser.userName){
                    statCode = 401;
                    throw new Error(defaultMsg)
                }
                // Validate password;
                if(!password || !await AppFn.decryptString(password, adminUser.password)){
                    statCode = 401;
                    throw new Error(defaultMsg)
                }


                req.session.username = username;
                req.session.created = new Date();
                // resMethod = 'redirect'
                resArgs.push('/admin/students')
                // Set page to Admin
                // content = 'Admin';

            break;

            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed.`)


        }

    } catch (e) {

        if(!statCode) statCode = 500;

        // content = 'Login';

        resArgs.push('/adminLogin')
        resObj.FormError = e.message

    }

    resObj.Content = content;

    // // Poor url changing on login. 
    // if(statCode !== 200)
    //     return res.status(statCode  200).render('Home', resObj);
    res.status(statCode || 200)[resMethod](...resArgs)

});

app.get('/admin', async (req, res, next) => {

    let statCode, resObj = { AppName: appName }, content;

    try {

        resObj.Content = "Admin"

    } catch (e) {

        statCode = 404

    }


    res.status(statCode || 200).render('Admin', resObj)


});

app.all("/admin/AddStudent", async (req, res, next) => {

    let statCode, resObj = { AppName: appName }, content, resMethod = 'render', resArgs = [];

    try {
        
        switch(req.method){
    
            case 'GET':

                resObj.Content = "AddStudent";

                resArgs.push('Admin', resObj)

            break;

            case 'POST':

                // Check and upload files if applicable
                let uploadedFiles = await AppFn.uploadFiles(req, 'student', __dirname);

                console.log(252, req.body)

                let defaultMsg = `Student already exists.`;
                let body = req.body;
                if(!body){
                    statCode = 400;
                    throw new Error(`Bad request. No payload specified`);
                }
                let { first_name: firstName, last_name: lastName, biography: biography, linkedin: linkedin } = body;
                // Insert First_name, last_name validation
                async function newStudent(firstName, lastName, biography, linkedin){
                    let thisStudent = await AppFn.getStudent(null, firstName, lastName);

                    if(!thisStudent){
                        console.log('Creating Student')
                        await AppFn.createStudent(firstName,lastName, biography, linkedin);
                        return await AppFn.getStudent(null, firstName, lastName)

                    }

                    return thisStudent
                
                }
                
                let thisStudent = await newStudent(firstName, lastName, biography, linkedin);

                if(thisStudent.length && uploadedFiles.length){

                    let heroImage = req.body?.heroImage;
                    if(heroImage){
                        uploadedFiles = uploadedFiles.map(f => {

                            if(f.name === heroImage){
                                f.is_hero = heroImage
                            }

                            return f
                        })
                        
                    }

                    await AppFn.updateDbFileStore(thisStudent.id, uploadedFiles, 'student')
                }

                await AppFn.newStudentProjectLinkSet(req.body.ProjectIDs, thisStudent.id, 'student');

                // resObj.Students = await searchStudents();
                // content = 'Students';
                resMethod = 'redirect';
                resArgs.push('/admin/students')

            break;
    
            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed.`)
    
    
        }

    } catch (e) {
        
        console.log(e)

        if(!statCode) statCode = 500;

        content = 'Error';

    }

    res.status(statCode || 200)[resMethod](...resArgs)
    
});

app.all("/admin/addProject", async(req, res, next) => {
    // Define function parameters
    let statCode, resObj = { AppName: appName }, content;

    try {

        switch (req.method) {
        
            case "POST":
    
                // Get the body of the request(EXPRESS)
                let body = req.body
                // Check if the body exists/Otherwise throw a bad payload error
                if(!body){
                    statCode = 400
                    throw new Error(`Bad Request. No payload specified`)
                }
                // Define each attribute of the body.
                let { title, project_date, project_type, description } = body;
    
                // Define the new project function, which should contain a seperate create function.
                async function newProject(title, project_date, project_type, description) {
                    // Perform any project data validation
                    return (await AppFn.createProject(title, project_date, project_type, description))[1][0].id
                }
                
                let projectID = await newProject(title, project_date, project_type, description);
                
                console.log(346, body)

                let uploadedFiles = await AppFn.uploadFiles(req, 'project', __dirname);
    
                if(!uploadedFiles.length) throw new Error(`Files failed to be uploaded`)

                let heroImage = req.body?.heroImage;
                if(heroImage){
                    uploadedFiles = uploadedFiles.map(f => {

                        if(f.name === heroImage){
                            f.is_hero = heroImage
                        }

                        return f
                    })
                }

                await AppFn.updateDbFileStore(projectID, uploadedFiles, 'project');
    
                await AppFn.newStudentProjectLinkSet(req.body.StudentIDs, projectID, 'project');
                
                content = "AddProject"
    
            break;
    
            case "GET":
                content = "AddProject"
            break;
    
            default:
                throw new Error(`Request Method '${req.method}' is not allowed`)
        }

    } catch (e) {
        if(!statCode) statCode = 500;
        console.log(e)
    }

    // Define swtich-case to cover request methods, GET, POST
    

    resObj.Content = content;
    res.status(statCode || 200).render('Admin', resObj)
});

///admin
app.get("/admin/:entityType/search/:id*?", async (req, res, next) => {

    let statCode, apiResMsg, apiResData;

    try {

        let entityType = req.params.entityType;
        if(!entityType || !['student','project','media'].includes(entityType.toLowerCase())){
            statCode = 400;
            throw new Error(`Bad request. Invalid EntityType specified.`)
        }

        let query = req.query;
        let queryKeys = Object.keys(query);
        if(!queryKeys.length){
            statCode = 400;
            throw new Error(`Bad request. No query parameters specified..`)
        }

        let searchProps = ['id'], useFn, objId = query?.id;
        let fnArgs = [];
        switch(entityType){

            case 'project':

                if(!objId){
                    searchProps = ['title'];
                    useFn = 'searchEntity';
                    fnArgs.push(query, entityType, 'project');
                } else{
                    query = objId;   
                    fnArgs.push(query);
                    useFn = 'getProjectProfile';
                }

            break;
            case 'student':
                
                if(!objId){
                    searchProps = ['first_name', 'last_name'];
                    useFn = 'searchEntity';
                    fnArgs.push(query, entityType);;
                } else{
                    query = objId; 
                    fnArgs.push(query);
                    useFn = 'getStudentProfile';
                }
                               

            break

        }

        if(queryKeys.find(k => !searchProps.includes(k))){
            statCode = 400;
            throw new Error(`Bad request. One or more of: ${queryKeys.join(', ')} doesn't exist on EntityType ${entityType}.`)
        }

        console.log(fnArgs)
        apiResData = await AppFn[useFn](...fnArgs)
        

    } catch (e) {
        
        console.log(e)

        if(!statCode) statCode = 500;

        apiResMsg = e.message

    }

    res.status(statCode || 200).send(apiResData ? apiResData : { Message: apiResMsg })

});

app.get("/:entityType/search/:id*?", async (req, res, next) => {

    let statCode, apiResMsg, apiResData;

    try {

        let entityType = req.params.entityType;
        if(!entityType || !['student','project','media'].includes(entityType.toLowerCase())){
            statCode = 400;
            throw new Error(`Bad request. Invalid EntityType specified.`)
        }

        let query = req.query;
        const paginationKeys = ['start','end','page'];
        let queryKeys = Object.keys(query).filter(k => !paginationKeys.includes(k));
        if(!queryKeys.length && !query?.start){
            statCode = 400;
            throw new Error(`Bad request. No query parameters specified..`)
        }

        let searchProps = ['id'], useFn, objId = query?.id;
        let fnArgs = [];
        switch(entityType){

            case 'project':

                if(!objId){
                    searchProps = ['title'];
                    useFn = 'searchEntity';
                    fnArgs.push(query, entityType, 'project');
                } else{
                    query = objId;   
                    fnArgs.push(query);
                    useFn = 'getProjectProfile';
                }

            break;

            case 'student':
                
                if(!objId){
                    searchProps = ['first_name', 'last_name'];
                    useFn = 'searchEntity';
                    fnArgs.push(query, entityType);;
                } else{
                    query = objId; 
                    fnArgs.push(query);
                    useFn = 'getStudentProfile';
                }
                               

            break

        }


        if(queryKeys.find(k => !searchProps.includes(k))){
            statCode = 400;
            throw new Error(`Bad request. One or more of: ${queryKeys.join(', ')} doesn't exist on EntityType ${entityType}.`)
        }

        console.log(fnArgs)
        apiResData = await AppFn[useFn](...fnArgs)
        

    } catch (e) {
        
        console.log(e)

        if(!statCode) statCode = 500;

        apiResMsg = e.message

    }

    res.status(statCode || 200).send(apiResData ? apiResData : { Message: apiResMsg })

});

// Ensure ordering of Request -- Response -- Next
app.all("/admin/students/:studentId*?", async(req, res, next) => {

    let statCode, resObj = {Appname : appName}, content, students, resMethod

    switch (req.method) {

        case "GET":

            content = "Students"
            // Get all Students. Possible add a year to each student, so we can get all students but from specific years and not pull the entire table.
            // let currentYear = new Date().getFullYear()
            
            students = await Promise.all((await AppFn.searchEntity(null, 'student')).Data.map(async student => AppFn.getStudentProfile(student.id)));

            resObj.Students = students
            console.log(resObj.Students)
            
            break;

        case "PATCH":

            let updateObj = req.body;

            let projectIDs = updateObj.ProjectIDs;

            delete updateObj.ProjectIDs;

            console.log(461, req.params, updateObj, req.files)

            let studentId = req.params.studentId;
            if(!studentId || isNaN(Number(studentId))){
                statCode = 400;
                throw new Error(`Bad request. Invalid StudentId, not a number.`)
            }

            let thisStudent = await AppFn.getStudent(studentId);
            if(!thisStudent){
                statCode = 404;
                throw new Error(`Student not found.`)
            }
            
            // Update the projects this student is associated with
            await AppFn.newStudentProjectLinkSet(projectIDs, studentId, 'student');

            await AppFn.patchStudent(studentId, updateObj);

            let uploadedFiles;
            if(req.files){
                uploadedFiles = await AppFn.uploadFiles(req, 'student', __dirname);
                if(uploadedFiles.length){
                    uploadedFiles = await AppFn.updateDbFileStore(studentId, uploadedFiles, 'student')
                }
            }

            return res.send({
                Message: 'Student updated!'
            })

        default:
            statCode = 405;
            throw new Error(`${req.method} is not allowed`)
    }

    resObj.Content = content

    res.status(statCode || 200).render("Admin", resObj);
});

app.all("/admin/projects/:projectId*?", async(req, res, next) => {
    let statCode, resObj = {Appname: appName}, content;

    try {
        
        switch (req.method) {

            case "GET":
    
                content = "Projects"
                // Then map each project in array with its media.
                projects = await Promise.all((await AppFn.searchEntity(null, 'project')).Data.map(async project => AppFn.getProjectProfile(project.id)));
                // projects = await AppFn.searchEntity(null, 'project')
                resObj.Projects = projects;
                console.log(resObj.Projects)
                break;
    
            case "PATCH":
                let updateObj = req.body;
                console.log(507, updateObj)
                let studentIds = updateObj.StudentIDs;
    
                delete updateObj.StudentIDs;
    
                let projectId = req.params.projectId;
                if(!projectId || isNaN(Number(projectId))){
                    statCode = 400
                    throw new Error(`Bad request. Invalid ProjectID, not a number`)
                }
    
                let thisProject = await AppFn.getProject(projectId);
                console.log(519,thisProject)
                if(!thisProject){
                    statCode = 404;
                    throw new Error(`Project not found.`)
                }
    
                await AppFn.newStudentProjectLinkSet(studentIds, projectId, 'project')
        
                let uploadedFiles
                if(req.files){

                    uploadedFiles = await AppFn.uploadFiles(req, 'student', __dirname);
                    if(uploadedFiles.length){

                        let heroImage = req.body?.heroImage;
                        if(heroImage){

                            uploadedFiles = uploadedFiles.map(f => {
                
                                if(f.name === heroImage) f.is_hero = true;
                
                                return f

                            });                            

                        }


                        uploadedFiles = await AppFn.updateDbFileStore(projectId, uploadedFiles, 'project')
                    }
                }

                delete updateObj?.heroImage

                await AppFn.patchProject(projectId, updateObj)

                return res.send({
                    Message: 'Project updated!'
                })
    
            default:
                statCode = 405;
                throw new Error(`'${req.method}' is not allowed`)
        }

    } catch (e) {
        console.log(e)
    }
    


    resObj.Content = content;

    res.status(statCode || 200).render("Admin", resObj);
})

app.all('/admin/:entityType/:objectId', async (req, res, next) => {

    let apiResData, apiResMsg, statCode, resObj = {};
    
    try {
    
        // Code here
        let params = req.params;

        const entityTypeValidator = ['student','project', 'media'];

        let entityType = params.entityType?.toLowerCase();
        if(!entityType || !entityTypeValidator.includes(entityType)){
            statCode = 400;
            throw new Error(`Bad request. No EntityType specified.`)
        }

        let objectId = params.objectId;
        if(!objectId){
            statCode = 400;
            throw new Error(`Bad request. No ObjectId specified.`)
        }

        switch(req.method){

            case 'DELETE':

                console.log('Simulating object deletion', entityType, objectId)

                let getFn, delFn = 'deleteObject'
                switch(entityType){

                    case 'student':

                        getFn = 'getStudent';

                    break;

                    case 'project':

                        getFn = 'getProject';

                    break;

                    case 'media':

                        getFn = 'getFile';
                        delFn = 'deleteMedia';

                    break;

                }

                (await AppFn.getStudentProjectLinks(objectId, entityType)).map(async link => {
                    await AppFn.deleteStudentProjectLink(link.id)
                })


                let thisObj = await AppFn[getFn](objectId);
                console.log(633, thisObj)
                if(!thisObj){
                    statCode = 404;
                    throw new Error(`Object ${entityType} ${objectId} doesn't exist.`)
                }

                let fnArgs = [thisObj.id, entityType];

                // Delete the student
                console.log(`Deleting ${entityType} ${thisObj.id}...`);

                await AppFn[delFn](...fnArgs);

                if(['student','project'].includes(entityType)){

                    let thisObjMedia = await AppFn.getMedia(thisObj.id, entityType);
                    if(thisObjMedia.length){
                        await Promise.all(thisObjMedia.map(obj => AppFn.deleteObject(obj.id, 'media')))
                    }
                }
                
                statCode = 204;

                break;

            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed.`)

        }
    
    } catch (e) {
    
        console.log(e)
    
        if(!statCode) statCode = 500;
    
        apiResMsg = e.message
    
    }
    
    // Respond to Client    
    res.status(statCode || 200).send(resObj[apiResMsg ? 'Message' : 'Data'] = apiResMsg ? apiResMsg : apiResData)

});

app.delete('/admin/:entityType/link/:id', async (req, res, next) => {

    let apiResMsg, statCode;
    
    try {
    
        // Code here
        let { entityType, id } = req.params;
        if(!['student','project'].includes(entityType)){
            statCode = 400;
            throw new Error(`Bad request. Invalid EntityType.`)
        }

        if(isNaN(Number(id))){
            statCode = 400;
            throw new Error(`Bad request. Invalid LinkId.`)
        }

        await AppFn.deleteStudentProjectLink(id);

        statCode = 204;

    } catch (e) {
    
        console.log(e)
    
        if(!statCode) statCode = 500;
    
        apiResMsg = e.message
    
    }
    
    if(apiResMsg) return res.status(statCode).send({ Message: apiResMsg });

    res.status(statCode).end()

});

app.post('/:entityType/:objectId/addFiles', async (req, res, next) => {

    let apiResData, apiResMsg, statCode;
    
    try {

        console.log(req.body, req.files)
    
        let { entityType, objectId } = req.params;

        if(!['student','project'].includes(entityType)){
            statCode = 400;
            throw new Error(`Bad request. Invalid EntityType. Must be a string.`)
        }

        if(isNaN(Number(objectId))){
            statCode = 400;
            throw new Error(`Bad request. Invalid ObjectId. Must be a number.`)
        }

        // Code here
        if(!req.files){
            statCode = 400;
            throw new Error(`Bad request. No files in request body.`)
        }

        let uploadedFiles = await AppFn.uploadFiles(req, entityType, __dirname);
        console.log(766, uploadedFiles)
        let heroImage = req.body?.heroImage;
        if(heroImage){
            uploadedFiles = uploadedFiles.map(f => {

                if(f.name === heroImage){
                    f.is_hero = heroImage
                }

                return f
            })
        }

        apiResData = await AppFn.updateDbFileStore(objectId, uploadedFiles, entityType);
        
    
    } catch (e) {
    
        console.log(e)
    
        if(!statCode) statCode = 500;
    
        apiResMsg = e.message
    
    }
    
    // Respond to Client
    res.status(statCode || 200).send({
        [apiResMsg ? 'Message' : 'Data']: apiResMsg ? apiResMsg : apiResData
    })

});

app.all('/:entityType/:objectId/files/:fileId', async (req, res, next) => {

    let apiResMsg, statCode;
    
    try {
    
        // Code here
        let { entityType, objectId, fileId } = req.params;

        if(!['student','project'].includes(entityType)){
            statCode = 400;
            throw new Error(`Bad request. Invalid EntityType. Must be a string.`)
        }

        if(isNaN(Number(objectId)) || isNaN(Number(fileId))){
            statCode = 400;
            throw new Error(`Bad request. Invalid ObjectId or FileId. Must be a number.`)
        }

        switch(req.method){

            case 'DELETE':

                await AppFn.deleteMedia(objectId, fileId);

                statCode = 204

            break;

            case 'PATCH':

                console.log(req.method, req.body)

                let body = req.body;
                if(body?.is_hero){

                    await AppFn.setHeroMedia(fileId, objectId)

                    apiResMsg = `Image heroized!`

                }



            break;

            default:
                statCode = 405;
                throw new Error(`Method ${req.method} is not allowed.`)

        }





    } catch (e) {
    
        console.log(e)
    
        if(!statCode) statCode = 500;
    
        apiResMsg = e.message
    
    }

    if(apiResMsg) return res.status(statCode || 200).send({ Message: apiResMsg });

    return res.status(statCode || 200).end();


});

app.get('/:entityType/:objectId/files', async (req, res, next) => {

    let apiResData, apiResMsg, statCode;

    try {
        
        let {entityType, objectId} = req.params;
        if(!['student', 'project'].includes(entityType) || isNaN(Number(objectId))){
            statCode = 400;
            throw new Error(`Bad request. Invalid ObjectId, or entityType`);
        }
        
        apiResData = await AppFn.getMedia(objectId, entityType)

    } catch (e) {
        apiResMsg = e.message
        console.log(e)
    }

    res.status(statCode || 200).send({
        [apiResMsg ? 'Message' : 'Data']: apiResMsg || apiResData
    })

});

app.all('/admin/about', async (req, res, next) => {

    let apiResMsg, apiResData, statCode, resObj = {}, resMethod = 'render', renderPage;
    let reqMethod = req.method;
    try {
        
        switch(reqMethod){

            case 'GET':

                // Render about content
                resObj.AboutBlurbs = await AppFn.getAboutBlurbs();
                resObj.AppName = appName;
                resObj.Content = 'About';
                renderPage = 'Admin'

            break;

            case 'PATCH':

                resMethod = 'send';

            break;

            default:
                statCode = 405;
                throw new Error(`Method ${req.method} isn't allowed.`)

        }

    } catch (e) {

        console.log(e)

        if(!statCode) statCode = 500;

        apiResMsg = e.message
    }

    let resArgs = [];
    if(apiResData){

        resObj.Data = apiResData;
        resArgs.push(resObj)

    } else{

        if(reqMethod === 'GET')
            resArgs.push(renderPage, resObj)
        else{
            resObj.Message = apiResMsg;
            resArgs.push(resObj)
        }

    }

    console.log(resMethod, resArgs)
    res.status(statCode || 200)[resMethod](...resArgs)

})

// Catch any requests for routes that don't exist
app.get('*', async (req, res, next) => {
    res.status(404).send('DOESN\'T EXIST CHAMMMMMPP!!!!!')
});

const server = app.listen(port, () => {
    console.log(`Api listening on ${port}...`)
})





async function paginatedQuery(queryString){

    return `
        SELECT * FROM (${queryString})
    
    `

}