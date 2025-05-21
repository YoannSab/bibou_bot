// src/commands/skipsong.js
async function execute(twitchClient, channel, userstate, args, { spotifyService }) {
    // Original code had points logic here, skipping for now
    if (spotifyService && typeof spotifyService.skipSong === 'function') {
        await spotifyService.skipSong(twitchClient, channel, userstate.username);
    } else {
        console.error('Spotify service or skipSong not available.');
        twitchClient.say(channel, "Sorry, the skipsong command is currently unavailable.");
    }
}

module.exports = {
    name: 'skipsong',
    description: 'Skips the current song.',
    execute
};
