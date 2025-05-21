// src/commands/points.js
async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    if (mongoDbService && typeof mongoDbService.getPoints === 'function') {
        try {
            const points = await mongoDbService.getPoints(userstate.username);
            twitchClient.say(channel, `@${userstate['display-name']} a ${points} points.`);
        } catch (error) {
            console.error("Error getting points:", error);
            twitchClient.say(channel, "Sorry, couldn't fetch your points.");
        }
    } else {
        console.error('MongoDB service or getPoints not available.');
        twitchClient.say(channel, "Sorry, the points command is currently unavailable.");
    }
}

module.exports = {
    name: 'points',
    description: 'Displays the users current points.',
    execute
};
