const express = require('express');
const mysql = require('mysql');
const formUploader = require('express-fileupload');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(formUploader());


const webAppConfig = require('./app.config.json');
const { Router } = require('express');
const res = require('express/lib/response');
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

// Middleware goes here

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
            User: {
                name: 'Jess'
            }
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
    }, content;

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
                // Set page to Admin
                content = 'Admin';
    
            break;
    
            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed.`)
    
    
        }

    } catch (e) {
        
        if(!statCode) statCode = 500;

        content = 'Login';

        resObj.FormError = e.message

    }

    resObj.Content = content;

    // Poor url changing on login. 
    if(statCode !== 200)
        return res.status(statCode || 200).render('Home', resObj);
    
    res.status(statCode).render('Home', resObj)
    
});


app.get('/admin', async (req, res, next) => {
    let statCode, resObj = { AppName: appName }, content;
    try {
        resObj.Content = "Admin"
    } catch (e) {
        statCode = 404
    }


    res.status(statCode || 200).render('Admin', resObj)


})


app.all("/admin/AddStudent", async (req, res, next) => {

    let statCode, resObj = { AppName: appName }, content;

    try {
        
        switch(req.method){
    
            case 'GET':
                content = "AddStudent"
            break;

            case 'POST':
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


                content = 'Students';

            break;
    
            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed.`)
    
    
        }

    } catch (e) {
        
        if(!statCode) statCode = 500;

        content = 'Error';

    }
    resObj.Content = content;
    res.status(statCode || 200).render('Admin', resObj)
    
    
} )


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
})


app.all("/admin/students", async(res, req, next) => {
    let statCode, resObj = { AppName: appName }, content;
    try {
        switch (req.method) {
            case "GET":
                content = "Students"
                break;
        
            default:
                statCode = 405;
                throw new Error(`Method ${req.method} not allowed`)
        }
    } catch (e) {
        if(!statCode) statCode = 500;
        content = "Error"
    }

    resObj.Content = content;
    res.status(statCode || 200).render("Admin", resObj)
    
})





const server = app.listen(port, () => {
    console.log(`Api listening on ${port}...`)
})