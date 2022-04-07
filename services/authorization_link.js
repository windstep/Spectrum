const querystring = require("querystring");
const {send_message} = require("./bot");
const memory = require("../memory.js");
const discord = require('discord.js')
const environment = require('../environment')

function generateExportLink() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * @param {discord.User} user
 * @param {string} link
 */
function storeExportLink(user, link) {
    if (!("module_default_auth" in memory.accessCodes)) {
        memory.accessCodes["module_default_auth"] = {};
    }

    memory.accessCodes.module_default_auth[user.id] = link;
}

/**
 * @param {discord.User} user
 * @param {discord.Guild} server
 * @param {string} access_code
 */
function sendExportLink(user, server, access_code) {
    const query = querystring.stringify({
        "user_id": user.id,
        "access_code": access_code
    });

    const url = `${environment.configuration.authenticationUri}?${query}`

    return send_message(
        server,
        null,
        user,
        `Привет капсулер!\nТы присоединился к серверу ${server.name}, но для того, чтобы быть полноценным членом нашего сообщества, тебе необходимо пройти авторизацию своим аккаунтом, которым ты стал частью нашей корпорации.\nТогда твое имя станет видно всем членам нашего дружного коллектива и ты получишь возможность общаться во всех каналах и видеть других участников нашего дискорда.\nКак это сделать:\n1.Проходи по ссылке ${url}\n2.Нажимай "Add character"\n3.Логинься своим персонажем и соглашайся со всеми разрешениями.\n4.Спустя несколько минут, твой никнейм в дискорде сменится и ты сможешь общаться:)`,
        true
    )
}

/**
 * @param {discord.User} user
 * @param {discord.Guild} server
 */
function sendExportLinkToUser(server, user) {
    const link = generateExportLink()
    storeExportLink(user, link)
    return sendExportLink(user, server, link)
}

module.exports.sendExportLinkToUser = sendExportLinkToUser;