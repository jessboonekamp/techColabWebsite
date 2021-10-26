const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const formUploader = require('express-fileupload');
const path = require('path');
const bootstrapDir = '/node_modules/bootstrap/dist/';
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const app = express();
const webAppConfig = require('./app.config.json');
const AWS = require("aws-sdk");
const bucketName = 'techcolabbucket';
const S3 = new AWS.S3({
  signatureVersion: "v4",
  apiVersion: "2006-03-01",
  accessKeyId: "AKIA5KEPN477NS6AE553",
  secretAccessKey: "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",
  region: "ap-southeast-2",
});

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
app.use('/about_media', express.static(path.join(__dirname, 'files/about_media')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());




// Load Bootstrap
// You'll be able to access these in the ejs via their named locations; 
//  -src="bs_scripts/file_name"
//  -src="bs_styles/file_name"
app.use('/bs_scripts', express.static(__dirname + bootstrapDir + 'js'));
app.use('/bs_styles', express.static(__dirname + bootstrapDir + 'css'));
app.use('/modules', express.static(__dirname + 'node_modules/moment'));

let { port, database, adminUser, appName } = webAppConfig;

app.set('views', './views');
app.set('view engine', 'ejs');

// Connect to db
let dbPoolConnection = mysql.createPool(database);

const AppClass = require('./components/App.Class')(dbPoolConnection);
const AppFn = require('./components/App.Fn')(dbPoolConnection);
const ApiMiddleware = require('./components/Api.Middleware');
// Configure db password to encrypted string
//(async () => { console.log(await (AppFn.encrypt('techcolabmail'))) })();
// console.log(AppFn.decrypt(webAppConfig.mailSvc.auth.pass))
const { newMailService } = require('./components/Api.Services')(webAppConfig.mailSvc, AppFn.decrypt)

// Middleware goes here


// Api code goes here
app.get('/', async (req, res, next) => {

    let resObj, statCode, pageName = 'TechColab';

    try {

        // Code here
        resObj = {
            Content: 'Home',
            AppName: appName,
            AboutBlurbs: await AppFn.getAboutBlurbs(),
            ApiKeys: webAppConfig.apis
        }
    
    } catch (e) {
    
    
        if(!statCode) statCode = 500;
    
        resObj = {
            Content: 'Error',
            ErrorTitle: 'Error',
            ErrorMessage: e.message,
            ApiKeys: webAppConfig.apis
        }
    
    }
    
    resObj.AppName = appName

    res.status(statCode || 200).render(pageName, resObj)

});

app.get('/Projects', async (req, res, next) => {

    let resObj, statCode, pageName = 'TechColab';

    try {

        // Code here
        resObj = {
            Content: 'Projects',
            AppName: appName,
            ApiKeys: webAppConfig.apis,
            SearchFormFields: [
                {
                    displayTitle: 'Title',
                    fieldName: 'title',
                },
                {
                    displayTitle: 'Year',
                    fieldName: 'project_date',
                    type: 'number',
                    pattern: '[0-9]{4}'
                },
                {
                    displayTitle: 'Type',
                    fieldName: 'project_type',
                    type: 'select',
                    options: ['All', 'techcolab', 'capstone']
                }
            ]
        }
    
    } catch (e) {
    
    
        if(!statCode) statCode = 500;
    
        resObj = {
            Content: 'Error',
            ErrorTitle: 'Error',
            ErrorMessage: e.message,
            ApiKeys: webAppConfig.apis
        }
    
    }
    
    resObj.AppName = appName

    res.status(statCode || 200).render(pageName, resObj)

});

app.get('/Students', async (req, res, next) => {

    let resObj, statCode, pageName = 'TechColab';

    try {

        // Code here
        resObj = {
            Content: 'Students',
            AppName: appName,
            ApiKeys: webAppConfig.apis,
            SearchFormFields: [
                {
                    displayTitle: 'First Name',
                    fieldName: 'first_name'
                },
                {
                    displayTitle: 'Last Name',
                    fieldName: 'last_name'
                }
            ]
        }
    
    } catch (e) {
    
    
        if(!statCode) statCode = 500;
    
        resObj = {
            Content: 'Error',
            ErrorTitle: 'Error',
            ErrorMessage: e.message,
            ApiKeys: webAppConfig.apis
        }
    
    }
    
    resObj.AppName = appName

    res.status(statCode || 200).render(pageName, resObj)

})

app.get('/About', async (req, res, next) => {
    let apiResData, apiResMessage,statCode;

    try {
        
        apiResData = await AppFn.getAboutBlurbs();
        if(!apiRes){
            statCode = 400;
            throw new Error(`Bad Request`)
        }

    } catch (e) {

        apiResMessage = e.message;

    }

    res.status(statCode || 200).send(apiResData ? apiResData : { Message: apiResMsg })
})

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
                if(!password || !await AppFn.compareEncString(password, adminUser.password)){
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

                resMethod = 'render';

                resObj.Content = "AddStudent";

                resArgs.push('Admin', resObj)

            break;

            case 'POST':

                let body = req.body;
                if(!Object.keys(body).length){
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

                    throw new Error(`Student already exists.`)
                
                }
                
                let thisStudent = await newStudent(firstName, lastName, biography, linkedin);

                await manageFileUpload(req, thisStudent.id, 'student');

                // let uploadedFiles = await AppFn.uploadFiles(req, 'student', __dirname);
    
                // if(!uploadedFiles.length) throw new Error(`Files failed to be uploaded`)

                // let heroImage = req.body?.heroImage;
                // if(heroImage){
                //     uploadedFiles = uploadedFiles.map(f => {

                //         if(f.name === heroImage){
                //             f.is_hero = heroImage
                //         }

                //         return f
                //     })
                // }

                // await AppFn.updateDbFileStore(thisStudent.id, uploadedFiles, 'student');
    
                // await AppFn.newStudentProjectLinkSet(req.body.ProjectIDs, thisStudent.id, 'student');

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

        e.message.includes('exists') ? statCode = 409 : false;

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
                
                await manageFileUpload(req, projectID, 'project');
    
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
        if(entityType.toLowerCase() == 'project' && query.project_type == 'All'){
            delete query.project_type;
        }
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
                    searchProps = ['title', 'project_date', 'project_type'];
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
                    fnArgs.push(query, entityType,'student');
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
                console.log(805, projectId)
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

app.all('/admin/about/:asType*?', async (req, res, next) => {

    let apiResMsg, apiResData, statCode, resObj = {}, resMethod = 'render', renderPage;
    let reqMethod = req.method;
    try {
        
        switch(reqMethod){

            case 'GET':

                let content = await AppFn.getAboutBlurbs();
                
                if(req.params?.asType){
                    resMethod = 'send';
                    apiResData = content
                } else{
                    // Render about content
                    resObj.AboutBlurbs = content;
                    resObj.AppName = appName;
                    resObj.Content = 'About';
                    renderPage = 'Admin'
                }

            break;

            case 'POST':

                let updateObj = req.body
        
                await AppFn.patchAbout(updateObj);
                console.log(839, updateObj)

                resMethod = 'send'


                if(req?.files?.Files) await AppFn.updateDbFileStore(5, await AppFn.uploadFiles(req, 'about', __dirname), 'about');
                
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
    console.log(898, resMethod, ...resArgs);
    res.status(statCode || 200)[resMethod](...resArgs)

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
async function manageFileUpload(req, owningObjectId, entityType) {

    try {
    
        console.log(req.files)

        if(!req.files.Files) throw new Error(`No files.`);
        if(!owningObjectId) throw new Error(`No owningObjectId specified.`);

        if(!Array.isArray(req.files.Files)) req.files.Files = [req.files.Files];

        let newDate = new Date().toString();
    
        const heroImage = req.body.heroImage;

        req.files.Files = req.files.Files.map(f => {
            if (f.name === heroImage) {
                f.is_hero = heroImage;
            }
    
            f.name = newDate + '_' + f.name;
    
            return f
    
        });
        // Check and upload files if applicable
        //let uploadedFiles = await AppFn.uploadFiles(req, 'student', __dirname);
        console.log(1074, req.files.Files);
        await awsFileUpload(req.files.Files);  
        await AppFn.updateDbFileStore(owningObjectId, req.files.Files, entityType)

    } catch (e) {
        console.log(e)
    }

}

async function awsFileUpload(files){
            
    try {
        


        if(!Array.isArray(files)) files = [files];

        await Promise.all(

            files.map(async f => {

                return S3.putObject(
                    {
                        Bucket: bucketName,
                        Key: f.name,
                        ContentType: f.type,
                        ContentLength: f.size,
                        Body: f.data // Accepts a Buffer (see file.data property of incoming file)
                    },
                    async (error, data) => {
                        console.log(1122, error, data)

                        console.log(1120, await getSignedUrl(f.name))

                        Promise.resolve(data)
                    }
                )

            })
        )

    } catch (e) {
        console.log(e)
    }

}

function getSignedUrl(fileName) {
    return new Promise((resolve, reject) => {
        S3.getSignedUrl(
            "getObject",
            {
                Bucket: bucketName,
                Key: fileName,
            },
            function (err, url) {
                if (err) reject(err);

                resolve(url);
            }
        );
    });
}


app.post('/:entityType/:objectId/addFiles', async (req, res, next) => {

    let apiResData, apiResMsg, statCode;
    
    try {
    
        let { entityType, objectId } = req.params;

        if(!['student','project', 'about'].includes(entityType)){
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


        await manageFileUpload(req, objectId, entityType);
        
        statCode = 204
    
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

app.get('/files/:fileName/getUri', async (req, res) => {

    let apiResData, apiResMsg, statCode;

    try {
        
        let fileName = req.params?.fileName;
        if(!fileName){
            statCode = 400;
            throw new Error(`Bad request. No FileName in URL parameters.`)
        }

        apiResData = {
            uri: await getSignedUrl(fileName),
            imageName: fileName
        }

    } catch (e) {
        
        console.log(e)

        if(!statCode) statCode = 500;

        apiResMsg = e.message

    }

    let resObj = {};
    if(apiResData)
        resObj.Data = apiResData
    else
        resObj.Message = apiResMsg;

    res.status(statCode || 200).send(resObj)


})

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
        if(!['student', 'project', 'about'].includes(entityType) || isNaN(Number(objectId))){
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

app.post('/contact', async (req, res) => {

    let statCode, apiResMsg;
    try {
        
        const mailSvc = req.app.get('MailSvc');

        let { FullName, Company, Phone, Email, Query } = req.body;

        let template = await fs.readFile('./templates/NewItem.nmp', 'utf-8');

        req.body.Query = `${FullName} from ${Company} has submitted a query.<br><br>
        ${Query}
        <br><br>
        Contact: ${Phone}<br>
        Email: <a href="mailto:${Email}">${Email}</a>.
        `

        // template = template.replace('{FullName}', req.body.FullName)
        // template = template.replace('{Query}', req.body.Query)
        Object.keys(req.body).forEach(k => template = template.replace(new RegExp(`{${k}}`, 'gim'), req.body[k]))

        await mailSvc.send(`New enquiry received`, template)

        apiResMsg = 'Success!'

    } catch (e) {
        
        if(!statCode) statCode = 500;

        // Detail error
        console.log(e)

    }

    res.status(statCode || 200).send({ Message: apiResMsg })

})

// Catch any requests for routes that don't exist
app.get('*', async (req, res, next) => {
    res.status(404).send('DOESN\'T EXIST CHAMMMMMPP!!!!!')
});

// const server = app.listen(port, async () => {

//     console.log(`Api listening on ${port}...`)

//     await fs.writeFile(path.join(__dirname, 'public/js/client-cfg.js'), `export let config = ${JSON.stringify(webAppConfig.apis)}`)

//     app.set('MailSvc', await newMailService())

// })

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});





async function paginatedQuery(queryString){

    return `
        SELECT * FROM (${queryString})
    
    `

}