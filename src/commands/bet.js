// src/commands/bet.js
const predictionGame = require('./predictionGame');

async function execute(twitchClient, channel, userstate, args, services) {
    // services (like mongoDbService) are passed to placeBet by predictionGame.js
    await predictionGame.placeBet(twitchClient, channel, userstate, args, services);
}

module.exports = {
    name: 'bet',
    description: 'Places a bet on the outcome of the current prediction.',
    execute
};
