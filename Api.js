const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const formUploader = require('express-fileupload');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.set('trust proxy', 1)
app.use(
    session({
        secret: 'keyboard cat',
        saveUninitialized: true,
        resave: true,
        cookie: {
            secure: false
        }
    })
)

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(formUploader());
app.use(express.static(__dirname + '/public/'))
// app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))



const webAppConfig = require('./app.config.json');
const { KeyObject } = require('crypto');
let { port, database, adminUser, appName } = webAppConfig;

app.set('views', './views');
app.set('view engine', 'ejs');

async function encryptString(string){
    return await bcrypt.hash(string, await bcrypt.genSalt(10))   
}

async function decryptString(string){
    return await bcrypt.compare(string, adminUser.password)
}

// Connect to db
const dbPoolConnection = mysql.createConnection(database);

dbPoolConnection.connect(err => {

    if (err) throw err;

    console.log("Connected!");

});

async function getStudents(){
    return await new Promise((resolve, reject) => {
        let sqlQuery = `SELECT * FROM student ORDER BY id DESC`
        dbPoolConnection.query(sqlQuery, function(err, result){
            if(err) throw new Error(err)
            return resolve(result)
        })
    });
}

// Middleware goes here
async function isAuthorized(req, res, next) {

    if(!req.session.username) return res.redirect('/adminLogin');

    next()

}

// Api code goes here
app.get('/', async (req, res, next) => {

    let resObj, statCode, pageName = 'Home';

    try {
        dbPoolConnection.query(`SELECT id, title FROM project`, (error, results, fields) => {

            //console.log(error, results, fields)
        })

        // Code here
        resObj = {
            Content: 'Home',
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

    res.status(statCode || 200).render('Home', resObj)

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

                let defaultMsg = `Invalid username or password.`;
                let body = req.body;
                if(!body){
                    statCode = 400;
                    throw new Error(`Bad request. No payload specified.`)
                }


                // Validate request body
                let { username, password } = body;

                // Validate username
                if(!username || username.toLowerCase() !== adminUser.userName){
                    statCode = 401;
                    throw new Error(defaultMsg)
                }
                // Validate password;
                if(!password || !await decryptString(password)){
                    statCode = 401;
                    throw new Error(defaultMsg)
                }

                
                req.session.username = username;
                req.session.created = new Date();
                // resMethod = 'redirect'
                resArgs.push('/admin')
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
    //     return res.status(statCode || 200).render('Home', resObj);
    res.status(statCode || 200)[resMethod](...resArgs)
    
});

app.get('/admin', isAuthorized, async (req, res, next) => {
    let statCode, resObj = { AppName: appName }, content;
    try {
        resObj.Content = "Admin"
    } catch (e) {
        statCode = 404
    }


    res.status(statCode || 200).render('Admin', resObj)


});

app.all("/admin/AddStudent", isAuthorized, async (req, res, next) => {

    let statCode, resObj = { AppName: appName }, content, resMethod = 'render', resArgs = [];

    try {
        
        switch(req.method){
    
            case 'GET':

                resObj.Content = "AddStudent";

                resArgs.push('Admin', resObj)

            break;

            case 'POST':

                let fileStr = [];
                console.log(req?.files)
                if(req.files?.Files){
                    if(typeof req.files.Files === 'object' && req.files.length){
                        let files = req.files.Files;
                        fileStr = await Promise.all(files.map(async file => {
                            try{

                                let fileAsBuffer = new Buffer.from(file.data, file.encoding);
                                let fileName = file.name;
                                await fs.writeFile(path.join(__dirname, 'files', fileName), fileAsBuffer);
                                resolve(fileName)

                            } catch (e) {
                                reject(e)
                            }
                        }))
            
                    } else{
                        console.log('Handling single file...');
                        
                        let file = req.files.Files;
                        let fileAsBuffer = new Buffer.from(file.data, file.encoding);
                        let fileName = file.name;
                        await fs.writeFile(path.join(__dirname, 'files', fileName), fileAsBuffer)
                        fileStr.push(fileName)
                    }
                }

                let defaultMsg = `Student already exists.`;
                let body = req.body;
                if(!body){
                    statCode = 400;
                    throw new Error(`Bad request. No payload specified`);
                }

                let {firstName, lastName, biography} = body
                // Insert First_name, last_name validation

                async function getStudent(firstName, lastName){
                    return await new Promise((resolve, reject) => {
                        dbPoolConnection.query(`SELECT * FROM student WHERE first_name = '${firstName}' and last_name = '${lastName}'`, function(err, result){

                            if (err) return reject(err);
                            return resolve(result)

                        });
                    })
                }

                async function newStudent(firstName, lastName, biography){

                    let createStudent = async () => {
                        return await new Promise((resolve, reject) => {
                            let sqlQuery = `INSERT into student ( first_name, last_name, biography) VALUES ('${firstName}', '${lastName}', '${biography}')`;
                            console.log('inserting')
                            dbPoolConnection.query(sqlQuery, function(err, result){

                                if (err) return reject(err);

                                return resolve(result)

                            });
                        })
                    }
                    if(!(await getStudent(firstName, lastName)).length){
                        console.log('Creating Student')
                        await createStudent();
                        return await getStudent(firstName, lastName)

                    }

                
                }
                
                await newStudent(firstName, lastName, biography);

                // resObj.Students = await getStudents();
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

app.all("/admin/addProject", isAuthorized, async(req, res, next) => {
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
            let {title, project_date, project_type, biography} = body
            // Define the new project function, which should contain a seperate create function.
            async function newProject(title, project_date, project_type, biography) {
                let createProject = async () => {
                    return await new Promise((resolve, reject) => {
                        let sql = `INSERT into project (title, project_date, project_type, biography) VALUES ('${title}', '${project_date}', '${project_type}', '${biography}')`
                        dbPoolConnection.query(sql, function (err, result){
                            if(err) return reject(err);
                            return resolve(result);
                        })
                    })
                }

                await createProject()

            }

            await newProject(title, project_date, project_type, biography);
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

// Ensure ordering of Request -- Response -- Next
app.all("/admin/students", isAuthorized, async(req, res, next) => {
    let statCode, resObj = {Appname : appName}, content, students;
    switch (req.method) {
        case "GET":
            content = "Students"
            // Get all Students. Possible add a year to each student, so we can get all students but from specific years and not pull the entire table.
            // let currentYear = new Date().getFullYear()
            
            students = await getStudents();
            resObj.Students = students
            break;
    
        default:
            statCode = 405;
            throw new Error(`${req.method} is not allowed`)
    }
    resObj.Content = content
    res.status(statCode || 200).render("Admin", resObj);
});

app.post('/DocumentUpload', async function(req, res, next) {

    let statCode, resObj = { Message: null };
    try {

        let fileStr = [];
        if(req.files?.Files){
            if(typeof req.files.Files === 'object' && req.files.Files.length){
                let files = req.files.Files;
                fileStr = await Promise.all(files.map(async file => {
                    try{

                        let fileAsBuffer = new Buffer.from(file.data, file.encoding);
                        let fileName = file.name;
                        await fs.writeFile(`${uploadDir}\\${fileName}`, fileAsBuffer);
                        resolve(fileName)

                    } catch (e) {
                        reject(e)
                    }
                }))
    
            } else{
                console.log('Handling single file...');
                let file = req.files.Files;
                let fileAsBuffer = new Buffer.from(file.data, file.encoding);
                let fileName = file.name;
                await fs.writeFile(`${uploadDir}\\${fileName}`, fileAsBuffer)
                fileStr.push(fileName)
            }
        }

        if(fileStr.length) resObj.Message = fileStr.join(`,\r\n`);

    } catch (e) {

        if(!statCode)  statCode = 500;

        apiResMsg = e.message;

    }

    res.status(statCode || 200).send(resObj)

});





const server = app.listen(port, () => {
    console.log(`Api listening on ${port}...`)
})