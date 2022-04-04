//@ts-check

"use strict";

require('dotenv').config()

const configuration = {
    "ssl": {
        "certPath": process.env.SSL_CERT_PATH,
        "keyPath": process.env.SSL_KEY_PATH,
        "caPath": process.env.SSL_CA_PATH,
    },
    "uid": process.env.ESI_CLIENT_ID,
    "secret": process.env.ESI_CLIENT_SECRET,
    "userAgent": process.env.USER_AGENT,
    "authenticationUri": process.env.AUTHENTICATION_URI,
    "configurationUri": process.env.CONFIGURATION_URI,
    "botToken": process.env.DISCORD_BOT_TOKEN,
    "host": process.env.HOST,
    "port": process.env.PORT
}

module.exports.configuration = configuration;
