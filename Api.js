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
            Content: 'Home'
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

                let {first_name: firstName, last_name: lastName, biography} = body

                // Insert First_name, last_name validation
                async function newStudent(firstName, lastName, biography){
                    let thisStudent = await AppFn.getStudent(null, firstName, lastName);

                    if(!thisStudent.length){
                        console.log('Creating Student')
                        await AppFn.createStudent(firstName,lastName, biography);
                        return await AppFn.getStudent(null, firstName, lastName)

                    }

                    return thisStudent
                
                }
                
                let thisStudent = await newStudent(firstName, lastName, biography);

                if(thisStudent.length && uploadedFiles.length){
                    await AppFn.updateDbFileStore(thisStudent[0].id, uploadedFiles, 'student')
                }

                if(req.body?.ProjectIDs?.length){
                    console.log('Binding Student to Projects...');
                    await Promise.all(req.body.ProjectIDs.map(projId => AppFn.addStudentProjectLink(thisStudent[0].id, projId)))

                }

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

    // Define swtich-case to cover request methods, GET, POST
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
            
            let projectId = await newProject(title, project_date, project_type, description);

            let uploadedFiles = await AppFn.uploadFiles(req, 'project', __dirname);

            if(uploadedFiles.length) await AppFn.updateDbFileStore(projectId, uploadedFiles, 'project');

            content = "Projects"

        break;

        case "GET":
            content = "AddProject"
        break;

        default:
            throw new Error(`Request Method '${req.method}' is not allowed`)
    }

    resObj.Content = content;
    res.status(statCode || 200).render('Admin', resObj)
});

app.get("/admin/:entityType/search?", async (req, res, next) => {

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

        let appFn, searchProps;
        switch(entityType){

            case 'project':

                appFn = 'searchProjects';
                searchProps = ['title']

            break;

            case 'student':

                appFn = 'searchStudents';
                searchProps = ['first_name', 'last_name']

            break

        }

        if(queryKeys.find(k => !searchProps.includes(k))){
            statCode = 400;
            throw new Error(`Bad request. One or more of: ${queryKeys.join(', ')} doesn't exist on EntityType ${entityType}.`)
        }
        
        apiResData = await AppFn[appFn](query)


    } catch (e) {
        
        console.log(e)

        if(!statCode) statCode = 500;

        apiResMsg = e.message

    }

    res.status(statCode || 200).send({
        [apiResMsg ? 'Message' : 'Data']: apiResMsg || apiResData
    })

})

// Ensure ordering of Request -- Response -- Next
app.all("/admin/students/:studentId*?", async(req, res, next) => {

    let statCode, resObj = {Appname : appName}, content, students, resMethod

    switch (req.method) {

        case "GET":

            content = "Students"
            // Get all Students. Possible add a year to each student, so we can get all students but from specific years and not pull the entire table.
            // let currentYear = new Date().getFullYear()
            
            students = await AppFn.searchStudents();
            students = await Promise.all(students.map(async student => {

                let id = student.id;

                let profilePhoto = (await AppFn.getMedia(id, 'student'))[0];

                let o = {
                    ...student,
                    ...profilePhoto
                }

                o.id = id;

                return o

                
            }))

            resObj.Students = students
            
            break;

        case "PATCH":

            let updateObj = req.body;

            console.log(req.params)

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

            await AppFn.patchStudent(studentId, updateObj);

            return res.send({
                Message: 'Student updated!'
            })
            

            break;

        default:
            statCode = 405;
            throw new Error(`${req.method} is not allowed`)
    }

    resObj.Content = content
    console.log(resObj)

    res.status(statCode || 200).render("Admin", resObj);
});

app.all("/admin/projects", async(req,res, next) => {
    let statCode, resObj = {Appname: appName}, content;
    switch (req.method) {

        case "GET":

            content = "Projects"

            // Then map each project in array with its media.
            resObj.Projects = await Promise.all((await AppFn.searchProjects()).map(async project => {

                let id = project.id;

                project.media = await AppFn.getMedia(id, 'project');
  
                project.id = id;

                return project


            }))

            break;

        default:
            statCode = 405;
            throw new Error(`'${req.method}' is not allowed`)
    }


    resObj.Content = content;

    res.status(statCode || 200).render("Admin", resObj);
})

app.all('/admin/:entityType/:objectId', async (req, res, next) => {

    let apiResData, apiResMsg, statCode, resObj = {};
    
    try {
    
        // Code here
        let params = req.params;

        const entityTypeValidator = ['student','project'];

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

                let getFn;
                switch(entityType){

                    case 'student':

                        getFn = 'getStudent';

                    break;

                    case 'project':

                        getFn = 'getProject';

                    break;

                    case 'media':

                        getFn = 'getMedia';

                    break;

                }


                let thisObj = await AppFn[getFn](objectId);
                if(!thisObj.length){
                    statCode = 404;
                    throw new Error(`Object ${entityType} ${objectId} doesn't exist.`)
                }

                thisObj = thisObj[0];

                // Delete the student
                console.log(`Deleting ${entityType} ${thisObj.id}...`);

                await AppFn.deleteObject(thisObj.id, entityType);

                if(['student','project'].includes(entityType)){

                    let thisObjMedia = await AppFn.getMedia(thisObj.id, entityType);
                    if(thisObjMedia.length){
                        await Promise.all(thisObjMedia.map(obj => AppFn.deleteObject(obj.id, 'media')))
                    }
                }
                
                statCode = 204;

                break;

            case 'PATCH':

                console.log('Simulating object update', entityType, objectId)

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

})




const server = app.listen(port, () => {
    console.log(`Api listening on ${port}...`)
})



async function paginatedQuery(queryString){

    return `
        SELECT * FROM (${queryString})
    
    `

}