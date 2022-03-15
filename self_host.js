const path = require('path');
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
const port = 80;
// NOTE: this example uses garlicblocks.com which doesn't support bech32/grlc1 addresses.
// In the app, you must write the IP starting with http:// e.g. "http://192.168.1.75".
// If you are hosting it on your PC you might have to disable Windows' firewall.


app.get('/', function (req, res) {
    // deletes /#/ from the url to access txid on explorer
    res.sendFile(path.join(__dirname, '/index.html'));
});


app.post('/api/GRLC/mainnet/tx/send', async function (req, res) {
    // /api/GRLC/mainnet/tx/send
    // POST {rawTx: "0200..."}
    const tx = { 'rawtx': req.body.rawTx };
    const response = await fetch('https://garlicblocks.com/api/tx/send', {
        method: 'post',
        body: JSON.stringify(tx),
        headers: { 'Content-Type': 'application/json' }
    });
    let data = await response.text();
    if (response.status == 200) {
        data = JSON.parse(data);
    }
    res.statusCode = response.status;
    res.send(data);
});


app.get('/GRLC/mainnet/tx/:txid', function (req, res) {
    // /#/GRLC/mainnet/tx/ + txid
    // Explorer link
    res.redirect(`https://garlicblocks.com/tx/${req.params.txid}`);
});


app.get('/api/GRLC/mainnet/address/:address/balance', async function (req, res) {
    // /api/GRLC/mainnet/address/ + address + /balance
    // { confirmed, unconfirmed } (in sats)
    const data = await fetch(`https://garlicblocks.com/api/addr/${req.params.address}`).then(res => res.json());
    res.send({ confirmed: data.balanceSat, unconfirmed: data.unconfirmedBalanceSat });
});


app.get('/api/GRLC/mainnet/address/:address', async function (req, res) {
    // /api/GRLC/mainnet/address/ + address + /?unspent=true
    // GET {mintTxid, mintIndex, value} (in sats)
    const utxos_api = await fetch(`https://garlicblocks.com/api/addr/${req.params.address}/utxo`).then(res => res.json());
    const utxos = utxos_api.map(function (utxo) {
        return {
            mintTxid: utxo.txid,
            mintIndex: utxo.vout,
            value: utxo.satoshis
        };
    });
    res.send(utxos);
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})