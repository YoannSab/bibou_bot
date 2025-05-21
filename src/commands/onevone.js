// src/commands/onevone.js
const config = require('../config/config');

async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    const cost = config.pointSettings.oneVOneCost;
    const username = userstate.username;
    const displayName = userstate['display-name'];

    if (!mongoDbService || typeof mongoDbService.getPoints !== 'function' || typeof mongoDbService.givePoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        console.error("mongoDbService or its functions are not available in !onevone command.");
        return;
    }

    try {
        const userPoints = await mongoDbService.getPoints(username);
        if (userPoints < cost) {
            twitchClient.say(channel, `Il te manque ${cost - userPoints} points pour pouvoir défier Bibou en 1v1, @${displayName}. Perds pas espoir !`);
            return;
        }
        await mongoDbService.givePoints(username, -cost);
        twitchClient.say(channel, `@${displayName} a défié @Bibou_LoL pour un 1v1 ! Le combat aura lieu à la fin de la game ! (-${cost} points)`);
    } catch (error) {
        console.error("Error during !onevone command:", error);
        twitchClient.say(channel, "Une erreur est survenue lors du défi 1v1.");
    }
}

module.exports = {
    name: 'onevone',
    description: 'Challenges Bibou to a 1v1 (costs points).',
    execute
};
