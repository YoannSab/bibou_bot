// src/commands/coaching.js
const config = require('../config/config');

async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    const cost = config.pointSettings.coachingCost;
    const username = userstate.username;
    const displayName = userstate['display-name'];

    if (!mongoDbService || typeof mongoDbService.getPoints !== 'function' || typeof mongoDbService.givePoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        console.error("mongoDbService or its functions are not available in !coaching command.");
        return;
    }

    try {
        const userPoints = await mongoDbService.getPoints(username);
        if (userPoints < cost) {
            twitchClient.say(channel, `Il te manque ${cost - userPoints} points pour demander un coaching, @${displayName}. Tqt ça va le faire !`);
            return;
        }
        await mongoDbService.givePoints(username, -cost);
        twitchClient.say(channel, `@${displayName} a demandé un coaching ! Ce sera chose faite ! (-${cost} points)`);
        // Add to a queue or notify streamer as needed
    } catch (error) {
        console.error("Error during !coaching command:", error);
        twitchClient.say(channel, "Une erreur est survenue lors de la demande de coaching.");
    }
}

module.exports = {
    name: 'coaching',
    description: 'Requests a coaching session (costs points).',
    execute
};
