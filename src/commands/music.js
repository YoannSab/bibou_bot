// src/commands/music.js
async function execute(twitchClient, channel, userstate, args, { spotifyService }) {
    if (spotifyService && typeof spotifyService.getCurrentPlaybackState === 'function') {
        await spotifyService.getCurrentPlaybackState(twitchClient, channel);
    } else {
        console.error('Spotify service or getCurrentPlaybackState not available.');
        twitchClient.say(channel, "Sorry, the music command is currently unavailable.");
    }
}

module.exports = {
    name: 'music',
    description: 'Displays the currently playing song on Spotify.',
    execute
};
