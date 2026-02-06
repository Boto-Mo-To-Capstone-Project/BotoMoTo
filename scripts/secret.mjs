// this code will generate a secure random secret key that you can use for HMAC and authentication purposes
import crypto from 'crypto';
console.log(crypto.randomBytes(32).toString('hex'));