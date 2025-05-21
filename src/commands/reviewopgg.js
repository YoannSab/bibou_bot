// src/commands/reviewopgg.js
const config = require('../config/config');

async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    const cost = config.pointSettings.reviewOPGGCost;
    const username = userstate.username;
    const displayName = userstate['display-name'];

    if (!mongoDbService || typeof mongoDbService.getPoints !== 'function' || typeof mongoDbService.givePoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        console.error("mongoDbService or its functions are not available in !reviewopgg command.");
        return;
    }

    try {
        const userPoints = await mongoDbService.getPoints(username);
        if (userPoints < cost) {
            twitchClient.say(channel, `Il te manque ${cost - userPoints} points pour demander une review, @${displayName}. Continue de stacker !`);
            return;
        }
        await mongoDbService.givePoints(username, -cost);
        twitchClient.say(channel, `@${displayName} a demandé une review de son opgg ! (-${cost} points)`);
        // Here you might add logic to notify the streamer, add to a queue, etc.
        // For now, just the message and point deduction.
    } catch (error) {
        console.error("Error during !reviewopgg command:", error);
        twitchClient.say(channel, "Une erreur est survenue lors de la demande de review op.gg.");
    }
}

module.exports = {
    name: 'reviewopgg',
    description: 'Requests an OP.GG review (costs points).',
    execute
};
