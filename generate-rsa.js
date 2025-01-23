const crypto = require('crypto');
const fs = require('fs');

function generateKeys() {
    const passphrase = 'top secret';  // Define your passphrase here

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: passphrase
        }
    });

    const keys = {
        publicKey: publicKey,
        privateKey: privateKey,
        passphrase: passphrase  // Save the passphrase in the JSON
    };

    fs.writeFileSync('keys.json', JSON.stringify(keys, null, 4));

    console.log("Keys and passphrase have been saved to keys.json");
}

generateKeys();
