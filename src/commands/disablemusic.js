// src/commands/disablemusic.js
const botSettings = require('../botSettings');

async function execute(twitchClient, channel, userstate, args, services) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent désactiver la musique.");
        return;
    }

    botSettings.setMusicAllowed(false);
    twitchClient.say(channel, "La mise en file d'attente de la musique est maintenant désactivée.");
}

module.exports = {
    name: 'disablemusic',
    description: 'Disables music requests.',
    execute
};
