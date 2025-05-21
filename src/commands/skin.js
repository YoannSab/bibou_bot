// src/commands/skin.js
const skinVote = require('./skinVote');

async function execute(twitchClient, channel, userstate, args, services) {
    // services will be passed down, which includes riotApiService needed by handleSkinCommand
    await skinVote.handleSkinCommand(twitchClient, channel, userstate, args, services);
}

module.exports = {
    name: 'skin',
    description: 'Starts a vote for champion skins.',
    execute
};
