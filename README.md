# Garlic Wallet Lite
Garlicoin Wallet Lite is an iOS and Android app that uses the Insight Explorer to interact with the blockchain.
> Sponsored by the [Garlicoin Federation](https://garlicoin.io/garlicoin-federation/)

- Transactions are created and signed locally.
- Private keys are stored locally.
- The API URL can be changed in the settings tab.
- Opt-in notifications for new transactions to any address.

> This app was made using [AppGyver](https://www.appgyver.com/), [garlicoin-js](https://github.com/MaxPuig/garlicoinjs-lib), [bitcore-lib-grlc](https://github.com/MaxPuig/bitcore-lib-grlc), [GoQR](https://goqr.me/api/), [express](https://expressjs.com/), [webpack](https://webpack.js.org/), [node-polyfill-webpack-plugin](https://github.com/Richienb/node-polyfill-webpack-plugin), [axios](https://github.com/axios/axios) and [CoinGecko](https://www.coingecko.com/api).

## Support
If you wish to receive support or get in contact, please open an issue on [Github](https://github.com/MaxPuig/garlic-wallet-lite/issues/new) or send an email to info@garlicoin.io.

## Download App
[iOS App Store](https://apps.apple.com/app/garlic-wallet-lite/id1614741682)
> iPhone, iPad, iPod Touch and M1 Macs. The iOS version has a beta channel using [TestFlight](https://testflight.apple.com/join/LPI0nwol).

[Android Play Store](https://play.google.com/store/apps/details?id=com.garlicwalletlite.app)
> The Android versions are also available as an APK file in the [releases page](https://github.com/MaxPuig/garlic-wallet-lite/releases).

## Installation Android APK
- Go to the [releases page](https://github.com/MaxPuig/garlic-wallet-lite/releases) and download the latest APK.
- Install the APK on your device.
> Alternatively, download the .zip file, extract it and install the APK.

## Installation iOS Beta
- Go to the [TestFlight site](https://testflight.apple.com/join/LPI0nwol) and follow the instructions.
- You should be able to install the app on any iOS 14 device (iPhone, iPad, iPod Touch and M1 Macs).

## Useful information
- Fees are set by default to 100-200 sats/byte. The amount can be changed in settings.
- The receiver will get the amount entered, and the fee will be deducted from the remaining balance.
- To send the entire available balance, enter the entire amount. The amount received will be the same as the amount entered minus the fee.
- Private Keys (and WIFs) can be imported or created directly from the app.
- It is possible to choose between P2PKH (G), P2SH (M) and P2WPKH (grlc1) addresses.
- Due to the nature of AppGyver, it is not possible to make the project completely open source. However, [all functions](./garlic_wallet_lite.js) used in the project are included in this repository. If requested (and possible), a copy of the app will be transfered to your AppGyver account.

## API Endpoints

This app uses the `Insight Explorer` v8.9.0, `garlicblocks.com` and `freshgrlc.net`'s API. 

Inside the app you can chose which one you want to use. If you activate `FreshGRLC mode` in settings, the app will use `freshgrlc.net` to get the balance and UTXOs, and `garlicblocks.com` to broadcast transactions, otherwise, `garlicoin.info` will be used for everything.

The default API base URL for the Insight Explorer is `https://garlicoin.info` and can be changed in the settings tab.

The Insight API has to be able to provide information on the following endpoints: 

- `/api/GRLC/mainnet/address/` + address + `/balance`
    - GET `{confirmed, unconfirmed} (in sats)`

- `/api/GRLC/mainnet/address/` + address + `/?unspent=true&limit=0`
    - GET `{mintTxid, mintIndex, value} (in sats)`

- `/api/GRLC/mainnet/tx/send`
    - POST `{rawTx: "0200..."}`

- `/#/GRLC/mainnet/tx/` + txid
    - Explorer link

FreshGRLC mode uses:
- `https://api.freshgrlc.net/blockchain/grlc/address/` + address
    - GET `{balance, pending} (in GRLC)`

- `https://api.freshgrlc.net/blockchain/grlc/address/` + address + `/utxos`
    - GET `{transaction.txid, index, value} (in GRLC)`

- `https://garlicblocks.com/api/tx/send`
    - POST `{rawtx: "0200..."}`

## Consolidate
Sometimes, specially when you are mining, you will get a big amount of transactions to your address. When you send a transaction, it is made up of previous (unspent) transactions. The more (unspent) transactions get joined, the bigger the byte size of the transaction is. There is a byte limit, which is about 600 unspent transactions (UTXOs). Garlic Wallet Lite won't send a transaction if it has 550 or more UTXOs. 

The solution to this is to consolidate your UTXOs. This is done by sending multiple transactions, each including about 600 UTXOs.

You can do this by running [this file](./consolidate.js) in node.js. The instructions are written in the comments inside the file.

## Import Private Keys into Garlicoin Core
```
Help -> Debug Window -> Console and type:
"importprivkey <Priv_Key>"
```

If you get this error `invalid private key encoding (code -5)` this means the Private Key's format is in base58. You can convert it to WIF by running [this file](./import_privkey_core.js) in node.js. 

> If you import a new Private Key into Garlicoin Core, you will need to reindex the entire blockchain.

If you really want to have the same address on Garlicoin Core and GWL, export a Private Key from Garlicoin Core and import it into GWL. This way you will not have to reindex anything.

```
- Help -> Debug Window -> Console and type: 
"dumpprivkey <address>"
```

## Self-Host
If you want to use a different explorer than the one provided by the app, you can host your own. Here's an [example](./self_host.js).


## TODO
- Add support for multiple addresses
- Add ability to see past transactions
- Add dark mode