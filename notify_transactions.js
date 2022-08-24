require('dotenv').config()
const fetch = require('node-fetch');
const RpcClient = require('garlicoind-rpc');
const config = {
    protocol: 'http',
    user: process.env.RPC_USER,
    pass: process.env.RPC_PASS,
    host: '127.0.0.1',
    port: '42068',
};
const rpc = new RpcClient(config);
let txids = [];

function showNewTransactions() {
    rpc.getRawMemPool(function (err, ret) {
        if (err) {
            console.error(err);
            return setTimeout(showNewTransactions, 10000);
        }

        function batchCall() {
            ret.result.forEach(function (txid) {
                if (txids.indexOf(txid) === -1) {
                    rpc.getRawTransaction(txid);
                }
            });
        }
        rpc.batch(batchCall, function (err, rawtxs) {
            if (err) {
                console.error(err);
                return setTimeout(showNewTransactions, 10000);
            }
            rawtxs.map(function (rawtx) {
                rpc.decodeRawTransaction(rawtx.result.toString('hex'), function (err, resp) {
                    let recipients = {};
                    resp.result.vout.forEach(function (vout) {
                        if (vout.scriptPubKey.type !== 'nulldata') {
                            if (recipients[vout.scriptPubKey.addresses[0]]) {
                                recipients[vout.scriptPubKey.addresses[0]] += vout.value;
                            } else {
                                recipients[vout.scriptPubKey.addresses[0]] = vout.value;
                            }
                        }
                    });
                    if (Object.keys(recipients).length > 0) {
                        sendNotif(recipients);
                    }
                })
            });
            txids = ret.result;
            setTimeout(showNewTransactions, 2500);
        });
    });
}

showNewTransactions();

function sendNotif(tx) {
    for (const address in tx) {
        const body = {
            'to': '/topics/' + address,
            'notification': {
                'title': 'New transaction!',
                'body': `Amount: ${tx[address]} GRLC\nTo: ${address.slice(0, 5)}...${address.slice(-5)}`,
                'mutable_content': false,
                'sound': 'default'
            }
        };
        fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.FCM_KEY
            },
            body: JSON.stringify(body)
        }).catch(err => console.error(err));
    }
}