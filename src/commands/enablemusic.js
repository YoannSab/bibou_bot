// src/commands/enablemusic.js
const botSettings = require('../botSettings');

async function execute(twitchClient, channel, userstate, args, services) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent activer la musique.");
        return;
    }

    botSettings.setMusicAllowed(true);
    twitchClient.say(channel, "La mise en file d'attente de la musique est maintenant activée.");
}

module.exports = {
    name: 'enablemusic',
    description: 'Enables music requests.',
    execute
};
