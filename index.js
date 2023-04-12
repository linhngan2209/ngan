//Load express module with `require` directive

// var express = require('express')

// var app = express()

// //Define request response in root URL (/)  
// app.get('/', function (req, res) {  
//  res.send('Hello World!')  
// })

// //Launch listening server on port 8081  
// app.listen(8081, function () {  
//   console.log('app listening on port 8081!')  
// })


import fs from "fs";
const csv = fs.readFileSync("data.csv")
const array = csv.toString().split("\n");
let result = [];
let headers = array[0].split(",").map((h) => h.replace(/\"/g, ''));
let obj
for (let i = 1; i < array.length - 1; i++) {
    obj = {}
    let str = array[i]
    let s = ''
    let flag = 0
    for (let ch of str) {
        if (ch === '"' && flag === 0) {
            flag = 1
        }
        else if (ch === '"' && flag == 1) flag = 0
        if (ch === ',' && flag === 0) ch = '|'
        if (ch !== '"') s += ch
    }
    let properties = s.split("|")
    for (let j in headers) {
        if (properties[j].includes(",")) {
            obj[headers[j]] = properties[j]
                .split(",")
        }
        else obj[headers[j]] = properties[j]
    }
    result.push(obj)

}
let json = JSON.stringify(result, null, 2);
fs.writeFileSync('output.json', json);

import express from 'express';
const app = express();
const port = 3000;

// const basicAuth = require('basic-auth-connect');
// app.use(basicAuth('admin', 'admin'));

//Middleware
const authh = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.sendStatus(401);
    }

    const [username, password] = Buffer.from(
        authHeader.split(' ')[1], 'base64').toString().split(':');

    if (username === 'admin' && password === 'admin') {
        return next();
    } else {
        return res.sendStatus(401);
    }
};

app.use(authh);


// API GETALL
const jsonData = fs.readFileSync('output.json');
const data = JSON.parse(jsonData);
app.get('/v1/api/deviceactivations/getall', function (req, res) {
    console.log(req.headers);
    res.json(data);

});

// API getByMac
app.get('/v1/api/deviceactivations/getall/:mac', function (req, res) {
    const devices = JSON.parse(fs.readFileSync('output.json', 'utf8'));
    const mac = req.params.mac;
    const device = devices.find(d => d.mac === mac);
    if (!device) {
        res.status(404).send('Device not found');
    } else {
        res.send(device);
    }
});

// API getByProductID have firstActivateAt >= param
app.get('/v1/api/deviceactivations/getByProductId/:productId', function (req, res) {
    const devices = JSON.parse(fs.readFileSync('output.json', 'utf8'));
    const productId = req.params.productId;
    const firstActivatedAt = req.query.firstActivatedAt;
    const data = parseInt(firstActivatedAt);
    const epochTime = new Date(data * 1000).toISOString();
    const filteredData = devices.filter(item => item.productId === productId && item.firstActivatedAt >= epochTime);
    if (!filteredData) {
        res.status(404).send('Device not found');
    } else {
        res.send(filteredData);
    }
});

// API postByProductID payload includes: firstActivatedAt have firstActivatedAt < firstActivatedAt in payload body sent
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const dv = fs.readFileSync('data.csv', 'utf8');
const dataArray = dv.toString().split('\n').map((row) => row.split(','));
app.post('/v1/api/deviceactivations/getByTime', (req, res) => {
    const { firstActivatedAt } = req.body;
    const { limit, page } = req.query;
    const result = [];
    const epochTime = new Date(parseInt(firstActivatedAt)).toISOString();
    for (let i = 1; i < dataArray.length; i++) {
        const row = dataArray[i].map((row) => row.replace(/\"/g, ''));
        const timestamp = row[1];
        if (timestamp < epochTime) {
            result.push({
                mac: row[0],
                firstActivatedAt: row[1],
                name: row[2],
                productId: row[3],
            });
        }
    }
    const startIndex = limit * (page - 1);
    const endIndex = startIndex + limit;
    res.json(result.slice(startIndex, endIndex));
});

// Start server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

import admin from 'firebase-admin';
import firebaseClient from 'firebase';
import serviceAdmin from './.firebase-creds/admin.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAdmin),
  databaseURL: 'https://rogo-test-cf6c6.firebaseapp.com',

});



app.post('/register', (req, res) => {
    const { email, password } = req.body
    const user = {
      email: email,
      password: password,
    }
    
    admin.auth().createUser(user).then(createdUser => {
      res.status(200)
      res.send({
        message: `User registered: ${createdUser.uid}`,
      })
    }).catch(exception => {
      res.status(400)
      res.send(exception)
    })
  })

  app.post('/login', (req, res) => {
    const { email, password } = req.body
    
    firebaseClient.auth()
    .signInWithEmailAndPassword(email, password)
    .then(authenticatedUser => {
      return firebaseClient.auth().currentUser.getIdToken()
    }).then(idToken => {
      res.status(200)
      res.send({
        token: idToken,
      })
    }).catch(exception => {
      res.status(422)
      res.send({
        data: exception
      })
    })
  })