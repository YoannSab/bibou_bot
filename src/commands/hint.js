// src/commands/hint.js
const guessGame = require('./guessGame');

async function execute(twitchClient, channel, userstate, args, services) {
    // Points logic for hintCost would be handled by guessGame.giveHint if implemented there
    guessGame.giveHint(twitchClient, channel, userstate, services);
}

module.exports = {
    name: 'hint',
    description: 'Gives a hint for the current champion guessing game.',
    execute
};
