// src/commands/lolpro.js
async function execute(twitchClient, channel, userstate, args, services) {
    twitchClient.say(channel, `Check le lol pro de Bibou : https://lolpros.gg/player/bibou`);
}

module.exports = {
    name: 'lolpro',
    description: 'Sends the link to Bibou_LoL LolPros.gg profile.',
    execute
};
