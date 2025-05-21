// src/commands/songrequest.js
const botSettings = require('../botSettings.js'); // Added

async function execute(twitchClient, channel, userstate, args, { spotifyService }) {
    if (!botSettings.isMusicAllowed()) {
        twitchClient.say(channel, 'Ajout de musique interdit par le streamer.');
        return;
    }

    const query = args.join(' ').trim();
    if (query.length === 0) {
        twitchClient.say(channel, 'Veuillez fournir une requête pour la recherche de chansons. Exemple: !songrequest The Beatles');
        return;
    }

    if (spotifyService && typeof spotifyService.searchAndQueueSong === 'function') {
        // Points logic for songrequestCost would be handled here if re-implemented.
        // For now, it's skipped as per instructions.
        await spotifyService.searchAndQueueSong(twitchClient, channel, query);
    } else {
        console.error('Spotify service or searchAndQueueSong not available for !songrequest.');
        twitchClient.say(channel, "Désolé, la commande !songrequest n'est pas disponible pour le moment.");
    }
}

module.exports = {
    name: 'songrequest',
    description: 'Requests a song to be added to the Spotify queue.',
    execute
};
