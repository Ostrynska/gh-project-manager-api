const jwt = require('jsonwebtoken')
const { createPublicKey } = require('node:crypto')

const getCognitoJWTPublicKey = async (tokenSigningKeyUrl) => {
    const res = await fetch(tokenSigningKeyUrl);
    const data = await res.json();
    // console.log(data);
    const jwtSigningKey = createPublicKey({ format: 'jwk', key: data.keys[1] }).export({ format: 'pem', type: 'spki' })
    // console.log(jwtSigningKey);
    return jwtSigningKey;
}

const verfiyJWT = (jwtToken, jwtSigningKey) => {
    return jwt.verify(jwtToken, jwtSigningKey, (err, decoded) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return false;
        } else {
            return true;
        }
    });
}

const getCurrentUrl = (req) => {
    const currentUrl = process.env.COGNITO_CALLBACK_URL + req['_parsedUrl'].search;
    return new URL(currentUrl)
}





module.exports = { getCurrentUrl, verfiyJWT, getCognitoJWTPublicKey }