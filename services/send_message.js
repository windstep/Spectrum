const output = require("../output.js");
const socket = require("../socket.js");
const disk = require("../disk.js");
const discord = require('discord.js')

/**
 *
 * @param {discord.Guild} server
 * @param {discord.TextChannel} channel
 * @param {discord.User} user
 * @param {String} message
 * @param {Boolean} confidential
 */
async function send_message_to_first_accessible_channel(server, channel, user, message, confidential) {
    const channel_ids = server.channels.cache.keyArray();

    let accessible_channel = undefined;

    for (let i = 0; i < channel_ids.length; i++) {
        const channel_id = channel_ids[i];

        const try_channel = server.channels.cache.get(channel_id);

        if (try_channel.permissionsFor(server.me).has("SEND_MESSAGES", true)) {
            accessible_channel = try_channel;

            break;
        }
    }

    if (!accessible_channel) {
        if (confidential) {
            // Sending a confidential message failed. Finding an accessible channel failed too. No way to contact this user.
        }
        else {
            // Sending a message to the channel failed. Finding another accessible channel failed too. Try to send a confidential message to the user.
            await user.send(
                message
            ).then(async () => {
                const msg = output.message("[MESSAGE TO USER] [" + user.username + "#" + user.discriminator + "]\n" + message);
                socket.messageToRoom(server.id, "config_server_logs", "message", msg);
            }).catch((error) => {
                // Sending a confidential message failed too. No way to contact this user.
            });
        }
    }
    else {
        if (confidential) {
            // Sending a confidential message failed.

            if (channel && channel.permissionsFor(server.me).has("SEND_MESSAGES", true)) {
                // The channel the message originated from is accessible. Tell the user that he needs to allow PMs there.
                await channel.send(
                    "Please allow me to send you PMs (private messages). I am not able to contact you.",
                    {
                        "reply": user
                    }
                ).then(async (sentMessage) => {
                    const msg = output.message("[MESSAGE TO CHANNEL] [" + server.name + " -> " + accessible_channel.name + "]\n@" + user.username + "#" + user.discriminator + ", Please allow me to send you PMs (private messages). I am not able to contact you.");
                    socket.messageToRoom(server.id, "config_server_logs", "message", msg);

                    sentMessage.delete({"timeout": 300000});
                });
            }
            else {
                // The channel the message originated from is not accessible. Tell the user in another accessible channel that he needs to allow PMs.
                await accessible_channel.send(
                    "Please allow me to send you PMs (private messages). I am not able to contact you.",
                    {
                        "reply": user
                    }
                ).then(async (sentMessage) => {
                    const msg = output.message("[MESSAGE TO CHANNEL] [" + server.name + " -> " + accessible_channel.name + "]\n@" + user.username + "#" + user.discriminator + ", Please allow me to send you PMs (private messages). I am not able to contact you.");
                    socket.messageToRoom(server.id, "config_server_logs", "message", msg);

                    sentMessage.delete(300000);
                });
            }
        }
        else {
            // Sending a message to the channel failed. An accessible channel has been found. Send the message to that one.
            await accessible_channel.send(
                message,
                {
                    "reply": user
                }
            ).then(async (sentMessage) => {
                const msg = output.message("[MESSAGE TO CHANNEL] [" + server.name + " -> " + accessible_channel.name + "]\n@" + user.username + "#" + user.discriminator + ", " + message);
                socket.messageToRoom(server.id, "config_server_logs", "message", msg);

                sentMessage.delete(300000);
            });
        }
    }
}

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

/**
 *
 * @param {String} serverId
 * @param {String} message
 */
async function send_message_to_operators(serverId, message) {
    let operators = await disk.loadFile("./data/discord/server/" + serverId + "/operators.json");
    operators = operators ? operators : {};

    const userIdList = Object.keys(operators);
    const server = await client.guilds.fetch(serverId, false, true);
    await server.members.fetch({"force": true});

    const ownerID = server.ownerID;

    if (!userIdList.includes(ownerID)) {
        userIdList.push(ownerID);
    }

    for (let i = 0; i < userIdList.length; i++) {
        const userId = userIdList[i];
        const user = (await server.members.fetch(userId)).user;

        await send_message(server, undefined, user, message, true);
    }
}

module.exports.send_message = send_message;
module.exports.send_message_to_operators = send_message_to_operators;
module.exports.send_message_to_first_accessible_channel = send_message_to_first_accessible_channel;