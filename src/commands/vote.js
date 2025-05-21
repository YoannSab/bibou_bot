// src/commands/vote.js
const skinVote = require('./skinVote');

async function execute(twitchClient, channel, userstate, args, services) {
    // services is not strictly needed here by handleVoteCommand's current signature,
    // but passed for consistency if it were to evolve (e.g., points for voting).
    await skinVote.handleVoteCommand(twitchClient, channel, userstate, args);
}

module.exports = {
    name: 'vote',
    description: 'Casts a vote in an ongoing skin poll.',
    execute
};
