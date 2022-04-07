const output = require("../output.js");
const socket = require("../socket.js");
const disk = require("../disk.js");
const discord = require('discord.js')
const client = new discord.Client({
    ws: {
        intents: [
            "DIRECT_MESSAGES",
            "DIRECT_MESSAGE_REACTIONS",
            "DIRECT_MESSAGE_TYPING",
            "GUILDS",
            "GUILD_BANS",
            "GUILD_EMOJIS",
            "GUILD_INTEGRATIONS",
            "GUILD_INVITES",
            "GUILD_MEMBERS",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS",
            "GUILD_MESSAGE_TYPING",
            "GUILD_VOICE_STATES",
            "GUILD_WEBHOOKS"
        ]
    }
});

module.exports.send_message = send_message;
module.exports.send_message_to_operators = send_message_to_operators;
module.exports.send_message_to_first_accessible_channel = send_message_to_first_accessible_channel;