// src/commands/opgg.js
async function execute(twitchClient, channel, userstate, args, services) {
    twitchClient.say(channel, `Check l'opgg de Bibou : https://www.op.gg/summoners/euw/chill%20falls1-ADGAP`);
}

module.exports = {
    name: 'opgg',
    description: 'Sends the link to Bibou_LoL OP.GG profile.',
    execute
};
