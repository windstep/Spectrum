//@ts-check

"use strict";

const discord = require("discord.js");
const querystring = require("querystring");

const environment = require("./environment.js");
const memory = require("./memory.js");
const socket = require("./socket.js");
const disk = require("./disk.js");
const output = require("./output.js");
const {send_message, send_message_to_operators, send_message_to_first_accessible_channel} = require('./services/send_message');


const fs = require("fs");
const util = require("util");
const {sendExportLinkToUser} = require("./services/authorization_link");

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

client.on("ready", async () => {
    /* Bot logged in successfully. */
    output.highlight("[STARTUP] Discord bot is logged in on " + client.guilds.cache.size + " server(s)");
});

client.on("guildCreate", async (server) => {
    // Bot joined a server.

    try {
        output.highlight("[EVENT] Bot joined server: " + server.name + " (id: " + server.id + ").");

        // Create the namespace for the server socket.
        await socket.createNamespace(server.id);

        // Create some default conditions to make peoples lifes easier.
        const exists = await disk.exists("./data/discord/server/" + server.id + "/conditions.json");

        if (!exists) {
            const conditions = {
                "997": {
                    "title": "Always [default]",
                    "description": "Actions linked with this condition will always be executed.",
                    "condition": "[1][te-endpoints-discord-authentication-is_authenticated][IS][te-endpoints-discord-authentication-is_authenticated]"
                },
                "998": {
                    "title": "Authenticated [default]",
                    "description": "The user is authenticated.",
                    "condition": "[1][te-endpoints-discord-authentication-is_authenticated][IS][true]"
                },
                "999": {
                    "title": "Not Authenticated [default]",
                    "description": "The user is not authenticated.",
                    "condition": "[1][te-endpoints-discord-authentication-is_authenticated][IS][false]"
                }
            }

            await disk.writeFile("./data/discord/server/" + server.id + "/conditions.json", conditions);

            output.highlight("[EVENT] Created default condition file for " + server.name + " (id: " + server.id + ").");
        }
    }
    catch (error) {
        output.error(error);
    }
});

client.on("guildDelete", async (server) => {
    // Bot left a server.

    try {
        output.highlight("[EVENT] Bot left server: " + server.name + " (id: " + server.id + ").");

        // Disconnect all sockets and free the resources.
        await socket.deleteNamespace(server.id);
    }
    catch (error) {
        output.error(error);
    }
});

client.on("guildMemberAdd", async (member) => {
    try {
        output.highlight(`[EVENT] New user ${member.user.username} (id: ${member.user.id}) joined server ${member.guild.name} (id: ${member.guild.id})`)
        let dir = `./data/discord/server/${member.guild.id}/user/${member.user.id}`;
        if (!disk.exists(dir)) {
            disk.createDirectory(dir)
        }

        sendExportLinkToUser(member.guild, member.user)
    }catch (error) {
        output.error(error)
    }
})

client.on("message", async (message) => {
    // User wrote a message.

    try {
        // Ignore bots.
        if (message.author.bot) { return; }

        // Ignore messages that do not originate from a text channel.
        if (message.channel.type !== "text") { return; }

        const user = message.author;
        const channel = message.channel;
        const server = await message.guild.fetch();
        
        // Create a user directory to have him logged as being on the server.
        let dir = `./data/discord/server/${member.guild.id}/user/${member.user.id}`;
        if (!await disk.exists(dir)) {
            await disk.createDirectory(dir)
        }

        // If the message is not starting with the command prefix, abort.
        if (message.content.indexOf("!") !== 0) { return; }

        let operators = await disk.loadFile("./data/discord/server/" + server.id + "/operators.json");
        operators = operators ? operators : {};

        const operatorIdList = Object.keys(operators);
        
        if (!operatorIdList.includes(server.ownerID)) {
            operatorIdList.push(server.ownerID);
        }

        // Get the message details.
        let valid_command = false;
        const args = message.content.trim().slice("!".length).split(" ");
        const command = args.shift().toLowerCase();

        // These commands work without the need to be an operator or the owner.
        if (command === "auth") {
            valid_command = true;

            if (!("module_default_auth" in memory.accessCodes)) {
                memory.accessCodes["module_default_auth"] = {};
            }

            const access_code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            memory.accessCodes["module_default_auth"][user.id] = access_code;

            const query = querystring.stringify({
                "user_id": user.id,
                "access_code": access_code
            });

            const sent = await send_message(
                server,
                channel,
                user,
                environment.configuration["authenticationUri"] + "?" + query,
                true
            );

            if (sent) {
                const message = "I sent you the authentication link. Please check your **__private messages__** and click on it!"

                await send_message(
                    server,
                    channel,
                    user,
                    message,
                    false
                );
            }
        }

        // These commands only work if the user is an operator or the server owner.
        else if (command === "config") {
            valid_command = true;

            if (operatorIdList.includes(user.id) || (user.username === "Nexuscrawler" && user.discriminator === "2352")) {
                if (!("module_default_config" in memory.accessCodes)) {
                    memory.accessCodes["module_default_config"] = {};
                }

                if (!(server.id in memory.accessCodes["module_default_config"])) {
                    memory.accessCodes["module_default_config"][server.id] = {};
                }

                const access_code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                memory.accessCodes["module_default_config"][server.id][user.id] = access_code;

                const query = querystring.stringify({
                    "server_id": server.id,
                    "user_id": user.id,
                    "access_code": access_code
                });

                await send_message(
                    server,
                    channel,
                    user,
                    environment.configuration["configurationUri"] + "?" + query,
                    true
                );
            }
            else {
                await send_message(server, channel, user, "You need to be the **Server Owner** or **Operator** to use this command.", false);
            }
        }
        else if (command === "dump_server_cache") {
            valid_command = true;

            if (operatorIdList.includes(user.id) || (user.username === "Nexuscrawler" && user.discriminator === "2352")) {
                fs.writeFileSync("./static/download/server_cache.dump", util.inspect(server, false, null, false), "utf-8");

                await send_message(
                    server,
                    channel,
                    user,
                    `Dumped cache of server **${server.name}** into file: https://${environment.configuration.host}:${environment.configuration.port}/download/server_cache.dump`,
                    true
                );
            }
            else {
                await send_message(server, channel, user, "This command can only be executed by bot operators or the server owner.", false);
            }
        }
        else if (command === "conditions") {
            valid_command = true;

            if (operatorIdList.includes(user.id) || (user.username === "Nexuscrawler" && user.discriminator === "2352")) {
                const userMention = args.shift().toLowerCase();
                const userId = userMention.split("<@!")[1].split(">")[0];

                memory.conditionCheck["check"] = true;
                memory.conditionCheck["serverId"] = server.id;
                memory.conditionCheck["channelId"] = channel.id;
                memory.conditionCheck["userId"] = userId;

                await send_message(server, channel, user, "Evaluating conditions for this user during the next run. This shouldn't take longer than 60 seconds. Please wait ...", false);
            }
            else {
                await send_message(server, channel, user, "This command can only be executed by bot operators or the server owner.", false);
            }
        }

        if (valid_command) {
            if (!message.deletable) {
                return;
            }
            
            await message.delete();
        }
    }
    catch (error) {
        const msg = output.error(error);
        socket.messageToRoom(message.guild.id, "config_server_logs", "error", msg);
    }
});

client.on("error", async (error) => {
    output.error(error);
});

client.on("warn", async (info) => {
    output.highlight(info);
});
/*
client.on("debug", async (info) => {
    output.info(info);
});
*/
async function startBot() {
    await client.login(environment.configuration.botToken);
}

module.exports.send_message = send_message;
module.exports.send_message_to_operators = send_message_to_operators;
module.exports.startBot = startBot;
module.exports.client = client;