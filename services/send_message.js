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

/**
 *
 * @param {discord.Guild} server
 * @param {discord.TextChannel} channel
 * @param {discord.User} user
 * @param {String} message
 * @param {Boolean} confidential
 */
async function send_message(server, channel, user, message, confidential) {
    let sent = true;

    if (confidential || !channel) {
        await user.send(
            message
        ).then(async () => {
            const msg = output.message("[MESSAGE TO USER] [" + user.username + "#" + user.discriminator + "]\n" + message);
            socket.messageToRoom(server.id, "config_server_logs", "message", msg);
        }).catch((error) => {
            const msg = output.error("[MESSAGE TO USER] [" + user.username + "#" + user.discriminator + "]\n" + error);
            socket.messageToRoom(server.id, "config_server_logs", "error", msg);

            sent = false;
        });
    } else {
        if (channel.permissionsFor(server.me).has("SEND_MESSAGES", true)) {
            if (user) {
                await channel.send(
                    message,
                    {
                        "reply": user
                    }
                ).then(async (sentMessage) => {
                    const msg = output.message("[MESSAGE TO CHANNEL] [" + server.name + " -> " + channel.name + "]\n@" + user.username + "#" + user.discriminator + ", " + message);
                    socket.messageToRoom(server.id, "config_server_logs", "message", msg);

                    sentMessage.delete({"timeout": 300000});
                });
            }
            else {
                await channel.send(
                    message
                ).then(async (sentMessage) => {
                    const msg = output.message("[MESSAGE TO CHANNEL] [" + server.name + " -> " + channel.name + "]\n" + message);
                    socket.messageToRoom(server.id, "config_server_logs", "message", msg);

                    sentMessage.delete({"timeout": 300000});
                });
            }
        }
        else {
            sent = false;
        }
    }

    if (!sent) {
        await send_message_to_first_accessible_channel(server, channel, user, message, confidential);
    }

    return sent;
}

module.exports.send_message = send_message;