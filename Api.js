
const webAppConfig = require('./app.config.json');
let { port, database, adminUser } = webAppConfig;

const express = require('express');
const mysql = require('mysql');
const ejs = require('ejs');

// const sql = require('mysql');
const app = express();
app.set('views', './views');
app.set('view engine', 'ejs');

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

            console.log(error, results, fields)
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
    
        content = 'Error'
        resObj = {
            ErrorTitle: 'Error',
            ErrorMessage: e.message
        }
    
    }
    
    res.status(statCode || 200).render(pageName, resObj)

});

const server = app.listen(port, () => {
    console.log(`Api listening on ${port}...`)
})