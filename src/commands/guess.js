// src/commands/guess.js
const guessGame = require('./guessGame');

async function execute(twitchClient, channel, userstate, args, services) {
    guessGame.startGuess(twitchClient, channel);
}

module.exports = {
    name: 'guess',
    description: 'Starts a new champion guessing game.',
    execute
};
