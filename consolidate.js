const garlicore = require('bitcore-lib-grlc')
const axios = require('axios')
const prompt = require('prompt-sync')({ sigint: true });
// Install node.js
// Create a folder and put this file in it
// Install packages using "npm i bitcore-lib-grlc axios prompt-sync"
// Note: This script only works with garlicoin.info as it's the only insight explorer that supports bech32/grlc1 addresses


/* EDIT */
const private_key = ""; // also called WIF
const destination_address = ""; // Where the coins will go
const address_starts_with_G = true; // true/false --> false if it starts with M or grlc1
const address_starts_with_M = false; // true/false --> false if it starts with G or grlc1
const address_starts_with_grlc1 = false; // true/false --> false if it starts with G or M
const time_between_tx_seconds = 10; // So you don't get ratelimited by the API
const extra_secure_mode = true; // true/false --> asks for confirmation before every transaction is broadcasted
const join_tx = 600; // Use "join_tx = 2" your first time to check if it works correctly. Don't go over 600
/* EDIT */


const privKey = new garlicore.PrivateKey(private_key);
const url = 'https://garlicoin.info/api/GRLC/mainnet/';


function get_address(privKey) {
    let address;
    if ((address_starts_with_G + address_starts_with_M + address_starts_with_grlc1) != 1) {
        console.log('Only one "address_starts_with_x" should be true.');
        process.exit(1);
    }
    if (address_starts_with_M) {
        const redeemScript = garlicore.Script.empty()
            .add(garlicore.Script.buildWitnessV0Out(privKey.toAddress()));
        address = garlicore.Address.payingTo(redeemScript);
    } else if (address_starts_with_G) {
        address = privKey.toAddress();
    } else { // address_starts_with_grlc1
        const pubkey = privKey.toPublicKey();
        address = garlicore.Address.fromPublicKey(pubkey, 'mainnet', 'witnesspubkeyhash');
    }
    return address;
}


async function get_utxo(from_address) {
    try {
        let api_url = url + 'address/' + from_address + '/?unspent=true';
        const response = await axios.get(api_url);
        const utxos_api = response.data;
        const utxo = utxos_api.map(function (utxo) {
            return new garlicore.Transaction.UnspentOutput({
                txid: utxo.mintTxid,
                outputIndex: utxo.mintIndex,
                address: utxo.address,
                script: utxo.script,
                satoshis: utxo.value
            });
        });
        // Separate all utxo into blocks of 600
        const perChunk = join_tx; // utxo per chunk    
        let inputArray = utxo;
        let result = inputArray.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / perChunk);
            if (!resultArray[chunkIndex]) resultArray[chunkIndex] = []; // start a new chunk
            resultArray[chunkIndex].push(item);
            return resultArray;
        }, [])
        let utxos = [];
        // Calculate sendable amount per chunk of 600
        for (let x of result) {
            let total = 0;
            for (let y of x) {
                total += y.satoshis;
            }
            utxos.push({ utxo600: x, total });
        }
        return utxos;
    } catch (error) {
        console.error(error);
    }
}


async function create_tx(privKey, to_address) {
    const from_address = get_address(privKey).toString();
    privKey = privKey.toString();
    const utxo = await get_utxo(from_address);
    let all_tx = [];
    for (let j of utxo) {
        try {
            const tx = new garlicore.Transaction();
            tx.from(j.utxo600);
            tx.to(to_address, Math.floor(j.total / 2));
            tx.change(to_address);
            tx.sign(privKey);
            all_tx.push({ serialized_tx: tx.serialize(), amount: j.total, destination: to_address });
        } catch (error) {
            return { error: error.message };
        }
    }
    return all_tx;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function broadcast_tx(serialized_transactions) {
    const total_tx = serialized_transactions.length;
    let current_tx = 0;
    let api_url = url + '/tx/send';
    for (let tx of serialized_transactions) {
        current_tx++;
        if (extra_secure_mode) {
            const confirm = prompt(`This will send ${tx.amount / 100_000_000} GRLC to ${tx.destination} . Is this correct? [y/n] `);
            if (confirm.toLowerCase() !== 'y') {
                console.log('Stopping the script... That transaction won\'t be broadcasted!')
                process.exit(1)
            }
        }
        try {
            const response = await axios.post(api_url, {
                rawTx: tx.serialized_tx
            });
            const txid = await response.data;
            console.log('https://garlicoin.info/#/GRLC/mainnet/tx/' + txid.txid)
        } catch (error) {
            console.log(error.response.data);
        }
        if (current_tx < total_tx) {
            console.log(`Waiting ${time_between_tx_seconds} seconds before sending the next transaction...`)
            await sleep(time_between_tx_seconds * 1000); // wait x sec until next transaction is broadcasted
        }
    }
    console.log('No more transactions to send! Exiting...')
}


async function main() {
    console.log('If this is your first time running the script, use "join_tx = 2" to check if it works correctly.');
    console.log('To stop the script use "ctrl + c" in the terminal.')
    const correct_address = prompt(`Is this your address? ${get_address(privKey).toString()} [y/n] `);
    const correct_destination = prompt(`Is this where you want to send the coins? ${destination_address} [y/n] `);
    if (correct_address.toLowerCase() == 'y' && correct_destination.toLowerCase() == 'y') {
        const tx = await create_tx(privKey, destination_address);
        await broadcast_tx(tx);
    } else {
        console.log('Check "private_key", "address_starts_with_M" and "destination_address" and try again.')
    }
}


main();