import { ElectrumClient } from '@samouraiwallet/electrum-client';
import garlicoinjs from 'garlicoinjs-lib';
import parser from 'body-parser';
import express from 'express';
const app = express();
app.use(parser.json());
const port = 80;
// Optional: Change address to a different electrum server
const client = new ElectrumClient(50002, 'services.garlicoin.ninja', 'tls');
// NOTE: In the app, you must write the IP starting with http:// e.g. "http://192.168.1.75".
// If you are hosting it on your PC you might have to disable Windows' firewall.

try {
    client.initElectrum({ client: 'electrum-client-js', version: ['1.2', '1.4'] }, {
        retryPeriod: 5000, maxRetry: 10, pingPeriod: 5000
    });
} catch (error) {
    console.log(error);
}


app.get('/', function (req, res) {
    // deletes /#/ from the url to access txid on explorer
    let response = Buffer.from('<script> const hash = window.location.hash;' +
        'if (hash.length > 0 && hash.includes("#/")) {' +
        'window.location.replace(window.location.href.replace("#/", ""));' +
        '} </script >');
    res.set('Content-Type', 'text/html');
    res.send(response);
});


app.post('/api/GRLC/mainnet/tx/send', async function (req, res) {
    try {
        const rawTransaction = req.body.rawTx;
        let response = await client.blockchainTransaction_broadcast(rawTransaction);
        response = { txid: response };
        res.send(response);
    } catch (error) {
        res.send(error);
    }
});


app.get('/GRLC/mainnet/tx/:txid', function (req, res) {
    try {
        res.redirect(`https://explorer.freshgrlc.net/grlc/transactions/${req.params.txid}`);
    } catch (error) {
        res.send(error);
    }
})


app.get('/api/GRLC/mainnet/address/:address/balance', async function (req, res) {
    const address = req.params.address;
    // Convert the address to a scripthash
    const scripthash = convertToScripthash(address);
    const response = await client.blockchainScripthash_getBalance(scripthash);
    res.send(response);
})


app.get('/api/GRLC/mainnet/address/:address', async function (req, res) {
    const address = req.params.address;
    // Convert the address to a scripthash
    const scripthash = convertToScripthash(address);
    try {
        const response = await client.blockchainScripthash_listunspent(scripthash);
        const utxos = response.map(function (utxo) {
            return {
                mintTxid: utxo.tx_hash,
                mintIndex: utxo.tx_pos,
                value: utxo.value
            };
        });
        res.send(utxos);
    } catch (error) {
        res.send(error);
    }
})


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})


// Convert an address to scripthash
function convertToScripthash(address) {
    let script = garlicoinjs.address.toOutputScript(address);
    let hash = garlicoinjs.crypto.sha256(script);
    return Buffer.from(hash.reverse()).toString('hex');
}