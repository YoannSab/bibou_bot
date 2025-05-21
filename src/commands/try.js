// src/commands/try.js
const guessGame = require('./guessGame');

async function execute(twitchClient, channel, userstate, args, services) {
    const guessedChampion = args.join(' ').trim();
    if (!guessedChampion) {
        twitchClient.say(channel, `Veuillez entrer un nom de champion. Usage: !try <champion>`);
        return;
    }
    guessGame.attemptGuess(twitchClient, channel, userstate, guessedChampion, services);
}

module.exports = {
    name: 'try',
    description: 'Attempts to guess the champion.',
    execute
};
