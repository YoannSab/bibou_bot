// src/commands/abandon.js
const guessGame = require('./guessGame');

async function execute(twitchClient, channel, userstate, args, services) {
    guessGame.abandonGuess(twitchClient, channel);
}

module.exports = {
    name: 'abandon',
    description: 'Abandons the current champion guessing game.',
    execute
};
