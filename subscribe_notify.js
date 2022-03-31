require('dotenv').config()
const key = process.env.FCM_KEY;
const fetch = require('node-fetch');
const express = require('express');
const app = express();
const port = 80;


app.get('/gwl/delete/:token', async function (req, res) {
    const token = req.params.token;
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
        if(response.error) topics = "error";
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
    try {
        await fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/${address}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': "key=" + key }
        });
        res.send({ success: true });
        return;
    } catch (e) {
        console.log(e.toString())
        res.send({ success: false });
        return;
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})