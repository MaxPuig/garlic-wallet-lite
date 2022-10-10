require('dotenv').config()
const key = process.env.FCM_KEY;
const fs = require('fs');
const https = require('https');
const privateKey = fs.readFileSync('./privkey.pem', 'utf8');
const certificate = fs.readFileSync('./fullchain.pem', 'utf8');
const options = { key: privateKey, cert: certificate };
const fetch = require('node-fetch');
const express = require('express');
const app = express();
const port = 6969;


app.get('/gwl/delete/:token', async function (req, res) {
    const token = req.params.token;
    log_events(`Delete request by: ${token}`)
    let topics;
    try {
        let sub_topics = [];
        let response = await fetch(`https://iid.googleapis.com/iid/info/${token}?details=true`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': "key=" + key }
        });
        response = await response.json();
        topics = response.rel?.topics || [];
        for (let topic in topics) sub_topics.push(topic);
        if (response.error) topics = "error";
    } catch (e) {
        topics = "error";
        console.log(e.toString());
    }
    if (topics == "error") {
        res.send({ success: false });
        return;
    }
    try {
        if (topics) {
            for (let topic in topics) {
                await fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'Authorization': "key=" + key }
                });
            }
        }
        res.send({ success: true });
        return;
    } catch (e) {
        console.log(e.toString());
        res.send({ success: false });
        return;
    }
});


app.get('/gwl/subscribe/:token/:address', async function (req, res) {
    const token = req.params.token;
    const address = req.params.address;
    log_events(`Subscribe request by: ${token}`)
    try {
        let response = await fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/${address}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': "key=" + key }
        });
        response = await response.json();
        if (response.error) {
            res.send({ success: false });
            return;
        }
        res.send({ success: true });
        return;
    } catch (e) {
        console.log(e.toString())
        res.send({ success: false });
        return;
    }
});


function log_events(event){
    const dateObject = new Date();
    const date = (`0 ${dateObject.getDate()}`).slice(-2);
    const month = (`0 ${dateObject.getMonth() + 1}`).slice(-2);
    const year = dateObject.getFullYear();
    const hours = dateObject.getHours();
    const minutes = dateObject.getMinutes();
    const seconds = dateObject.getSeconds();
    console.log(`${year}-${month}-${date} ${hours}:${minutes}:${seconds} - ${event}`);
}


const httpsServer = https.createServer(options, app);


httpsServer.listen(port, () => {
    console.log("Https server listing on port : " + port)
});