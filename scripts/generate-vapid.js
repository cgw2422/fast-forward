#!/usr/bin/env node
// Generates a VAPID keypair for Web Push. Paste the output into your env vars.
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey);
