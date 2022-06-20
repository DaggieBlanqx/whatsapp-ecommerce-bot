'use strict';

let jwt = require('jsonwebtoken');

const generateJWT = ({ data, privateKey }) => {
    privateKey = privateKey || process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('No private key provided');
    if (!data) {
        throw new Error('Provide the JWT payload data!');
    } else {
        // expires after half and hour (604800 seconds = 1week)
        let output = jwt.sign({ payload: data }, privateKey, {
            expiresIn: '604800s',
        });

        console.log({
            output: output.length,
        });

        return output;
    }
};

const readJWT = ({ token, privateKey }) => {
    privateKey = privateKey || process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('No private key provided');
    if (!token) {
        throw new Error('Provide the JWT token!');
    } else {
        try {
            var outcome = jwt.verify(token, privateKey);
            return {
                status: 'success',
                data: outcome,
            };
        } catch (error) {
            return {
                status: 'failure',
                data: error,
            };
        }
    }
};

module.exports = {
    generateJWT,
    readJWT,
};
