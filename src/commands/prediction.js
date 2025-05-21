// src/commands/prediction.js
const predictionGame = require('./predictionGame');

async function execute(twitchClient, channel, userstate, args, services) {
    // services (like mongoDbService for point costs) are not directly used by startPrediction
    // but are passed by commandHandler, so we accept it.
    predictionGame.startPrediction(twitchClient, channel, userstate);
}

module.exports = {
    name: 'prediction',
    description: 'Starts a new prediction game.',
    execute
};
