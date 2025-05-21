// src/commands/setdelay.js
const botSettings = require('../botSettings');

async function execute(twitchClient, channel, userstate, args, services) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent changer le délai du jeu de devinette.");
        return;
    }

    const delaySeconds = parseInt(args[0], 10);
    if (isNaN(delaySeconds) || delaySeconds <= 0) {
        twitchClient.say(channel, "Veuillez entrer un délai valide en secondes. Exemple: !setdelay 60");
        return;
    }

    botSettings.setGuessGameDelay(delaySeconds * 1000);
    twitchClient.say(channel, `Le délai pour le jeu de devinette est maintenant de ${delaySeconds} secondes.`);
}

module.exports = {
    name: 'setdelay',
    description: 'Sets the delay for the champion guessing game.',
    execute
};
