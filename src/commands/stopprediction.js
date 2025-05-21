// src/commands/stopprediction.js
const predictionGame = require('./predictionGame');

async function execute(twitchClient, channel, userstate, args, services) {
    // services are not directly used by stopPrediction, but passed for consistency
    predictionGame.stopPrediction(twitchClient, channel, userstate);
}

module.exports = {
    name: 'stopprediction',
    description: 'Stops the ongoing prediction game, preventing further bets.',
    execute
};
