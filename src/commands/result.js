// src/commands/result.js
const predictionGame = require('./predictionGame');

async function execute(twitchClient, channel, userstate, args, services) {
    // services (like mongoDbService) are passed to resolvePrediction by predictionGame.js
    await predictionGame.resolvePrediction(twitchClient, channel, userstate, args, services);
}

module.exports = {
    name: 'result',
    description: 'Resolves the current prediction and distributes points.',
    execute
};
