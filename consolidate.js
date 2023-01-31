import garlicore from 'bitcore-lib-grlc';
import garlicoinjs from 'garlicoinjs-lib';
import prompt from 'prompt-sync';
const promptSync = prompt({ sigint: true });
import { ElectrumClient } from '@samouraiwallet/electrum-client';
// Install node.js // https://nodejs.org/en/download/
// Clone this repo OR download the zip and extract it (Green button on the top right of GitHub)
// Install packages using "npm i bitcore-lib-grlc garlicoinjs-lib prompt-sync @samouraiwallet/electrum-client" in the terminal


/* EDIT */
const private_key = ""; // also called WIF
const destination_address = ""; // Where the coins will go
const address_starts_with_G = true; // true/false --> false if it starts with M or grlc1
const address_starts_with_M = false; // true/false --> false if it starts with G or grlc1
const address_starts_with_grlc1 = false; // true/false --> false if it starts with G or M
const time_between_tx_seconds = 10; // So you don't get ratelimited by the API
const extra_secure_mode = true; // true/false --> asks for confirmation before every transaction is broadcasted
const join_tx = 300; // Use "join_tx = 2" your first time to check if it works correctly. Don't go over 600
garlicore.Transaction.FEE_PER_KB = 100_000; // if you get "66: min relay fee not met", increase this number to 110_000.
/* EDIT */


const privKey = new garlicore.PrivateKey(private_key);
const client = new ElectrumClient(50002, 'services.garlicoin.ninja', 'tls'); // Change url if you want to use a different server


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
        connectToElectrum();
        const utxos_api = await client.blockchainScripthash_listunspent(convertToScripthash(from_address));
        client.close();
        const script = new garlicore.Script(garlicore.Address.fromString(from_address));
        const utxo = utxos_api.map(function (utxo) {
            return new garlicore.Transaction.UnspentOutput({
                txid: utxo.tx_hash,
                outputIndex: utxo.tx_pos,
                address: from_address,
                script: script,
                satoshis: utxo.value
            });
        });
        // Separate all utxo into chunks
        const perChunk = join_tx; // utxo per chunk    
        let inputArray = utxo;
        let result = inputArray.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / perChunk);
            if (!resultArray[chunkIndex]) resultArray[chunkIndex] = []; // start a new chunk
            resultArray[chunkIndex].push(item);
            return resultArray;
        }, [])
        let utxos = [];
        // Calculate sendable amount per chunk
        for (let x of result) {
            let total = 0;
            for (let y of x) {
                total += y.satoshis;
            }
            utxos.push({ utxo_chunks: x, total });
        }
        return utxos;
    } catch (error) {
        console.error('Error in get_utxo()', error);
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
            tx.from(j.utxo_chunks);
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


async function broadcast_tx(serialized_transactions) {
    const total_tx = serialized_transactions.length;
    let current_tx = 0;
    for (let tx of serialized_transactions) {
        current_tx++;
        if (extra_secure_mode) {
            const confirm = promptSync(`This will send ${tx.amount / 100_000_000} GRLC to ${tx.destination} . Is this correct? [y/n] `);
            if (confirm.toLowerCase() !== 'y') {
                console.log('Stopping the script... That transaction won\'t be broadcasted!');
                process.exit(1);
            }
        }
        try {
            connectToElectrum();
            const txid = await client.blockchainTransaction_broadcast(tx.serialized_tx);
            client.close();
            console.log('Transaction: https://explorer.freshgrlc.net/grlc/transactions/' + txid);
        } catch (error) {
            console.log(error);
        }
        if (current_tx < total_tx) {
            console.log(`Waiting ${time_between_tx_seconds} seconds before sending the next transaction...`);
            await sleep(time_between_tx_seconds * 1000); // wait x sec until next transaction is broadcasted
        }
    }
    console.log('No more transactions to send! Stopping script...');
}


async function main() {
    console.log('If this is your first time running the script, use "join_tx = 2" to check if it works correctly.');
    console.log('To stop the script use "ctrl + c" in the terminal.');
    const correct_address = promptSync(`Is this your address? ${get_address(privKey).toString()} [y/n] `);
    const correct_destination = promptSync(`Is this where you want to send the coins? ${destination_address} [y/n] `);
    if (correct_address.toLowerCase() == 'y' && correct_destination.toLowerCase() == 'y') {
        const tx = await create_tx(privKey, destination_address);
        await broadcast_tx(tx);
    } else {
        console.log('Check "private_key", "address_starts_with_M" and "destination_address" and try again.');
    }
}


// Convert an address to scripthash
function convertToScripthash(address) {
    let script = garlicoinjs.address.toOutputScript(address);
    let hash = garlicoinjs.crypto.sha256(script);
    return Buffer.from(hash.reverse()).toString('hex');
}



function connectToElectrum() {
    try {
        client.initElectrum(
            { client: 'electrum-client-js', version: ['1.2', '1.4'] },
            { retryPeriod: 5000, maxRetry: 10, pingPeriod: 5000 }
        );
    } catch (error) {
        console.log(error);
    }
}


function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }


main();