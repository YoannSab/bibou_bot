// src/services/spotifyService.js
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('../config/config.js');

// Initialize SpotifyWebApi instance
const spotifyApi = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
    redirectUri: config.spotify.redirectUri,
});

// Function to authenticate with Spotify
async function authenticateSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        console.log('Spotify access token acquired.'); // Removed token from log
        spotifyApi.setAccessToken(data.body['access_token']);

        // Refresh the token periodically before it expires
        // Spotify tokens typically expire after 1 hour (3600 seconds)
        // We'll refresh it a bit earlier, e.g., every 55 minutes
        setInterval(async () => {
            try {
                const refreshData = await spotifyApi.clientCredentialsGrant();
                spotifyApi.setAccessToken(refreshData.body['access_token']);
                console.log('Spotify access token refreshed.');
            } catch (err) {
                console.error('Error refreshing Spotify access token:', err);
            }
        }, 55 * 60 * 1000); // 55 minutes in milliseconds

    } catch (err) {
        console.error('Error during Spotify client credentials grant:', err);
    }
}

// Call authentication function when the module is loaded
authenticateSpotify();

// Function to search and queue a song
async function searchAndQueueSong(twitchClient, channel, query) {
    try {
        const result = await spotifyApi.searchTracks(query);
        const firstTrack = result.body.tracks.items[0];

        if (firstTrack) {
            const trackUri = firstTrack.uri;
            await spotifyApi.addToQueue(trackUri);
            twitchClient.say(channel, `Track ajouté à la liste d'attente : ${firstTrack.name} par ${firstTrack.artists[0].name}`);
        } else {
            console.log('Aucune chanson trouvée pour la requête:', query);
            twitchClient.say(channel, 'Aucune chanson trouvée pour la requête : ' + query);
        }
    } catch (error) {
        console.error('Erreur lors de la recherche et de la mise en file d\'attente d\'une chanson:', error);
        if (error.body && error.body.error && error.body.error.message === 'No active device found') {
             twitchClient.say(channel, 'Aucun appareil Spotify actif détecté. Assurez-vous que Spotify est ouvert et joue de la musique sur un appareil.');
        } else if (error.body && error.body.error && error.body.error.status === 401) {
             twitchClient.say(channel, 'Erreur d\'authentification avec Spotify. Bibou doit peut-être se reconnecter.');
        }
        else {
            twitchClient.say(channel, 'Bibou a un souci avec Spotify en ce moment, réessayez plus tard.');
        }
    }
}

// Function to get current playback state
async function getCurrentPlaybackState(twitchClient, channel) {
    try {
        const data = await spotifyApi.getMyCurrentPlaybackState();
        if (data.body && data.body.is_playing && data.body.item) {
            const trackName = data.body.item.name;
            const artists = data.body.item.artists.map(artist => artist.name).join(', ');
            twitchClient.say(channel, `La musique en cours de lecture est "${trackName}" par ${artists}.`);
        } else {
            twitchClient.say(channel, 'Aucune musique en cours de lecture ou Spotify n\'est pas actif.');
        }
    } catch (err) {
        console.error('Erreur lors de la récupération des informations sur la musique en cours de lecture :', err);
         if (err.body && err.body.error && err.body.error.status === 401) {
             twitchClient.say(channel, 'Erreur d\'authentification avec Spotify. Bibou doit peut-être se reconnecter.');
        } else {
            twitchClient.say(channel, 'Bibou a un souci avec Spotify pour récupérer la musique en cours.');
        }
    }
}

// Function to skip the current song
async function skipSong(twitchClient, channel, username) {
    // Points logic will be handled in the command itself or a points service
    try {
        await spotifyApi.skipToNext();
        twitchClient.say(channel, `La chanson a été passée à la demande de @${username}.`);
    } catch (error) {
        console.error('Erreur lors du passage de la chanson sur Spotify:', error);
        if (error.body && error.body.error && error.body.error.message === 'No active device found') {
             twitchClient.say(channel, 'Aucun appareil Spotify actif détecté. Impossible de passer la chanson.');
        } else if (error.body && error.body.error && error.body.error.status === 401) {
             twitchClient.say(channel, 'Erreur d\'authentification avec Spotify. Bibou doit peut-être se reconnecter.');
        } else {
            twitchClient.say(channel, `Il y a eu un problème pour passer la chanson sur Spotify.`);
        }
    }
}

// Export public functions
module.exports = {
    authenticateSpotify, // Though called internally, exporting might be useful for testing or manual re-auth
    searchAndQueueSong,
    getCurrentPlaybackState,
    skipSong,
    // For web server OAuth, we might need to export spotifyApi or specific methods later
    // For now, this is sufficient for bot commands
};
