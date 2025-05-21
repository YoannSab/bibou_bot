// src/commands/twitter.js
async function execute(twitchClient, channel, userstate, args, services) {
    twitchClient.say(channel, `Check le twitter de Bibou : https://twitter.com/Bibou_euw`);
}

module.exports = {
    name: 'twitter', // command name
    description: 'Sends the link to Bibou_euw Twitter profile.',
    execute
};
