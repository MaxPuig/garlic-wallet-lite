const garlicore = require('bitcore-lib-grlc');
// Use this script to import a private key into Garlicoin Core.
// In Garlicoin Core, go to Help -> Debug Window -> Console and type: "importprivkey <result_of_script>"

/* EDIT */
const private_key = "";
/* EDIT */

console.log(garlicore.PrivateKey(private_key).toWIF());