// src/commands/elo.js
async function execute(twitchClient, channel, userstate, args, { riotApiService }) {
    if (riotApiService && typeof riotApiService.handleElo === 'function') {
        await riotApiService.handleElo(twitchClient, channel);
    } else {
        console.error('Riot API service or handleElo not available.');
        twitchClient.say(channel, "Sorry, the elo command is currently unavailable.");
    }
}

module.exports = {
    name: 'elo',
    description: 'Displays Bibou_LoL current Elo.',
    execute
};
