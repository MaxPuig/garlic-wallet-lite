import { ElectrumClient } from "@samouraiwallet/electrum-client";
import garlicoinjs from "garlicoinjs-lib";
import parser from "body-parser";
import express from "express";
const app = express();
app.use(parser.json());
// Optional: Change address to a different electrum server
const electrum_server = "electrum.maxpuig.com";
// Optional: Change the port you are hosting the API on
const port = 80;
// NOTE: In the app, you must write the IP starting with http:// e.g. "http://192.168.1.75".
// If you are hosting it on your PC you might have to disable Windows' firewall.

app.get("/", function (req, res) {
  // deletes /#/ from the url to access txid on explorer
  let response = Buffer.from(
    "<script> const hash = window.location.hash;" +
    'if (hash.length > 0 && hash.includes("#/")) {' +
    'window.location.replace(window.location.href.replace("#/", ""));' +
    "} </script >"
  );
  res.set("Content-Type", "text/html");
  res.send(response);
});

app.post("/api/GRLC/mainnet/tx/send", async function (req, res) {
  // Send a raw transaction to the network
  const rawTransaction = req.body.rawTx;
  const client = await getElectrumClient();
  try {
    let response = await client.blockchainTransaction_broadcast(rawTransaction);
    client.close();
    res.send({ txid: response });
  } catch (error) {
    client.close();
    res.send({ error });
  }
});

app.get("/GRLC/mainnet/tx/:txid", function (req, res) {
  // Redirect to the transaction on the explorer
  try {
    res.redirect(`https://explorer.freshgrlc.net/grlc/transactions/${req.params.txid}`);
  } catch (error) {
    res.send(error);
  }
});

app.get("/api/GRLC/mainnet/address/:address/balance", async function (req, res) {
  // Get the balance of an address
  const address = req.params.address;
  const scripthash = convertToScripthash(address);
  const client = await getElectrumClient();
  if (scripthash == null) {
    client.close();
    res.send({ error: "Invalid address" });
    return;
  }
  let response;
  try {
    response = await client.blockchainScripthash_getBalance(scripthash);
    client.close();
  } catch (error) {
    response = { error };
  }
  res.send(response);
});

app.get("/api/GRLC/mainnet/address/:address", async function (req, res) {
  // Get the utxos of an address
  const address = req.params.address;
  const scripthash = convertToScripthash(address);
  if (scripthash == null) {
    res.send({ error: "Invalid address" });
    return;
  }
  const client = await getElectrumClient();
  try {
    const response = await client.blockchainScripthash_listunspent(scripthash);
    client.close();
    const utxos = response.map(function (utxo) {
      return {
        mintTxid: utxo.tx_hash,
        mintIndex: utxo.tx_pos,
        value: utxo.value,
      };
    });
    res.send(utxos);
  } catch (error) {
    client.close();
    res.send(error);
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

// Get an electrum client
async function getElectrumClient() {
  const client = new ElectrumClient(50002, electrum_server, "tls");
  try {
    await client.initElectrum(
      { client: "gwl-api", version: ["1.2", "1.4"] },
      {
        retryPeriod: 5000,
        maxRetry: 10,
        pingPeriod: 5000,
      }
    );
  } catch (error) {
    console.error(error);
  }
  return client;
}

// Convert an address to scripthash (used for electrum)
function convertToScripthash(address) {
  try {
    let script = garlicoinjs.address.toOutputScript(address);
    let hash = garlicoinjs.crypto.sha256(script);
    return Buffer.from(hash.reverse()).toString("hex");
  } catch (error) {
    return null;
  }
}
