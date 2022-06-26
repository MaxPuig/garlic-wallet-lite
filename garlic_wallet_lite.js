const garlicore = require('garlicoinjs-lib');


export async function create_tx(privKey, G_or_M_or_grlc1, utxos_api, to_address, send_amount, freshgrlc, custom_fee) {
    if (utxos_api.length == 0) return 'Your balance is 0';
    if (utxos_api.length > 550) return 'You have more than 550 utxos, consolidate them before sending. More info in the settings tab';
    let send_amount_sats = Math.round(send_amount * 100_000_000);
    let [from_address, not_used] = get_Address_And_PrivKey(G_or_M_or_grlc1, privKey);
    let keyPair; try { keyPair = garlicore.ECPair.fromPrivateKey(Buffer.from(privKey, 'hex')); } catch { keyPair = garlicore.ECPair.fromWIF(privKey); }
    const p2wpkh = garlicore.payments.p2wpkh({ pubkey: keyPair.publicKey })
    const p2sh = garlicore.payments.p2sh({ redeem: p2wpkh })
    let total_sats = 0;
    let utxos;
    if (freshgrlc) {
        utxos = utxos_api.map(function (utxo) {
            total_sats += Math.round(utxo.value * 100_000_000);
            return {
                txid: utxo.transaction.txid,
                vout: utxo.index,
                satoshis: Math.round(utxo.value * 100_000_000), // Floating point errors
            };
        });
    } else {
        utxos = utxos_api.map(function (utxo) {
            total_sats += utxo.value;
            return {
                txid: utxo.mintTxid,
                vout: utxo.mintIndex,
                satoshis: utxo.value
            };
        });
    }
    if (total_sats < send_amount_sats) return 'Not enough funds, you need at least ' + (send_amount_sats - total_sats) / 100_000_000 + ' extra GRLC';
    let send_all = false;
    if (total_sats == send_amount_sats) send_all = true;
    try {
        const txb = new garlicore.TransactionBuilder();
        let txb_index = 0;
        if (G_or_M_or_grlc1 == 'G') { // P2PKH
            for (let utxo of utxos) { txb.addInput(utxo.txid, utxo.vout); }// add all inputs
            txb.addOutput(to_address, total_sats);
            for (let utxo of utxos) { txb.sign(txb_index, keyPair); txb_index++; }// sign all inputs
        } else if (G_or_M_or_grlc1 == 'M') { // P2SH
            for (let utxo of utxos) { txb.addInput(utxo.txid, utxo.vout); }// add all inputs
            txb.addOutput(to_address, total_sats);
            for (let utxo of utxos) { txb.sign(txb_index, keyPair, p2sh.redeem.output, null, utxo.satoshis); txb_index++; }// sign all inputs
        } else { // P2WPKH
            for (let utxo of utxos) { txb.addInput(utxo.txid, utxo.vout, null, p2wpkh.output); }// add all inputs
            txb.addOutput(to_address, total_sats);
            for (let utxo of utxos) { txb.sign(txb_index, keyPair, null, null, utxo.satoshis); txb_index++; }// sign all inputs
        }

        // Calculate fee
        const feeRate = custom_fee || 150; // satoshi / byte
        let size = txb.build().virtualSize() + utxos_api.length;
        if (!send_all) size += 1; // add for change
        const fee = feeRate * size;
        const changeValue = total_sats - send_amount_sats - fee;
        if (send_all) send_amount_sats = send_amount_sats - fee;
        if (!send_all && changeValue <= 0) return 'Not enough funds with fees, you need ' + (send_amount_sats + fee - total_sats) / 100_000_000 + ' extra GRLC';

        // Create new transaction with the changed fee
        const tx = new garlicore.TransactionBuilder();
        let tx_index = 0;
        if (G_or_M_or_grlc1 == 'G') { // P2PKH
            for (let utxo of utxos) { tx.addInput(utxo.txid, utxo.vout); }// add all inputs
            tx.addOutput(to_address, send_amount_sats);
            if (!send_all && changeValue != 0) tx.addOutput(from_address, changeValue);
            for (let utxo of utxos) { tx.sign(tx_index, keyPair); tx_index++; }// sign all inputs
        } else if (G_or_M_or_grlc1 == 'M') { // P2SH
            for (let utxo of utxos) { tx.addInput(utxo.txid, utxo.vout); }// add all inputs
            tx.addOutput(to_address, send_amount_sats);
            if (!send_all && changeValue != 0) tx.addOutput(from_address, changeValue);
            for (let utxo of utxos) { tx.sign(tx_index, keyPair, p2sh.redeem.output, null, utxo.satoshis); tx_index++; }// sign all inputs
        } else { // P2WPKH
            for (let utxo of utxos) { tx.addInput(utxo.txid, utxo.vout, null, p2wpkh.output); }// add all inputs
            tx.addOutput(to_address, send_amount_sats);
            if (!send_all && changeValue != 0) tx.addOutput(from_address, changeValue);
            for (let utxo of utxos) { tx.sign(tx_index, keyPair, null, null, utxo.satoshis); tx_index++; }// sign all inputs
        }
        return tx.build().toHex();
    } catch (error) {
        return 'An Error occured while creating the transaction.' + error.message.toString();
    }
}


export function get_Address_And_PrivKey(G_or_M_or_grlc1, privKey) {
    let keyPair;
    if (privKey) {
        try { keyPair = garlicore.ECPair.fromPrivateKey(Buffer.from(privKey, 'hex')); } catch { keyPair = garlicore.ECPair.fromWIF(privKey); } // lib can't diferentiate between WIF and PrivKey
    } else {
        keyPair = garlicore.ECPair.makeRandom();
    }
    privKey = keyPair.privateKey.toString('hex');
    if (G_or_M_or_grlc1 == 'G') { // P2PKH
        const { address } = garlicore.payments.p2pkh({ pubkey: keyPair.publicKey });
        return [address, privKey];
    } else if (G_or_M_or_grlc1 == 'M') { // P2SH
        const { address } = garlicore.payments.p2sh({ redeem: garlicore.payments.p2wpkh({ pubkey: keyPair.publicKey }) });
        return [address, privKey];
    } else { // P2WPKH
        const { address } = garlicore.payments.p2wpkh({ pubkey: keyPair.publicKey });
        return [address, privKey];
    }
}


export function validate_address(address) {
    try {
        garlicore.address.toOutputScript(address)
        return true
    } catch (e) {
        return false
    }
}


export function validate_privkey(privKey) { // lib can't diferentiate between WIF and PrivKey
    try {
        garlicore.ECPair.fromPrivateKey(Buffer.from(privKey, 'hex'));
        return true
    } catch {
        try {
            garlicore.ECPair.fromWIF(privKey);
            return true
        } catch {
            return false
        }
    }
}