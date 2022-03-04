# Garlic Wallet Lite
Garlicoin Wallet Lite app that uses the Insight Explorer to interact with the blockchain.

This is an Android and iOS app. However, it is only available right now as an Android APK file. There is a functioning iOS app that works exactly the same as the Android app, but an Apple Developer account is needed.

Transactions are created and signed locally.

Private keys are stored locally.

The API URL can be changed in the settings tab.

This app was made using [AppGyver](https://www.appgyver.com/), [garlicoin-js](https://github.com/MaxPuig/garlicoinjs-lib) and [bitcore-lib-grlc](https://github.com/MaxPuig/bitcore-lib-grlc).

## Installation Android
- Go to the [releases page](https://github.com/MaxPuig/garlic-wallet-lite/releases) and download the latest APK.
- Install the APK on your device.

Alternatively, download the .zip file, extract it and run the APK.

## Useful information
- Fees will automatically be calculated and are about 100-200 sats/byte. The receiver will get the amount entered, and the fee will be deducted from the remaining balance. 

- To send the entire available balance, enter the entire amount. The amount received will be the same as the amount entered minus the fee.

- Private Keys (and WIFs) can be imported or created directly from the app.

- It is possible to choose between P2PKH (G), P2SH (M) and P2WPKH (grlc1) addresses.

- Due to the nature of AppGyver, it is not possible to make the project open source. However, [all functions](./garlic_wallet_lite.js) used in the project are included in this repository. If requested (and possible), a copy of the app will be transfered to your AppGyver account.

## API Endpoints

This app uses the `Insight Explorer` v8.9.0 and `freshgrlc.net`'s API. 

Inside the app you can chose which one you want to use. In case you use the `freshgrlc.net` API, transactions will be broadcasted through `https://garlicblocks.com/api/tx/send`.

The default API base URL for the Insight Explorer is `https://garlicoin.info` and can be changed in the settings tab.

The API has to be able to provide information on the following endpoints: 

- `/api/GRLC/mainnet/address/` + address + `/balance`
    - GET `{balance, confirmed, unconfirmed} (sats)`

- `/api/GRLC/mainnet/address/` + address + `/?unspent=true`
    - GET `{mintTxid, mintIndex, address, script, value} (sats)`

- `/api/GRLC/mainnet/tx/send`
    - POST `{rawTx: "0100..."}`

- `/#/GRLC/mainnet/tx/` + txid
    - Explorer link

## Consolidate
Sometimes, specially when you are mining, you will get a big amount of transactions to your address. When you send a transaction, it is made up of previous (unspent) transactions. The more (unspent) transactions get joined, the bigger the byte size of the transaction is. There is a byte limit, which is about 600 unspent transactions (UTXOs). Garlic Wallet Lite won't send a transaction if it has 550 or more UTXOs. 

The solution to this is to consolidate your UTXOs. This is done by sending multiple transactions, each including about 600 UTXOs.

You can do this by running [this file](./consolidate.js) in node.js. The instructions are written in the comments inside the file.
