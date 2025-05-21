// src/config/config.js
require('dotenv').config({ path: '../../.env' }); // Load environment variables from .env file at project root

const config = {
    twitch: {
        username: process.env.TWITCH_USERNAME, // Twitch bot username
        oauth: process.env.TWITCH_OAUTH,       // Twitch bot OAuth token
        channels: ['Bibou_LoL']                // Default Twitch channels to join
    },
    riot: {
        apiKey: process.env.RIOT_API_KEY       // Riot Games API key for accessing LoL data
    },
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID, // Spotify API client ID
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET, // Spotify API client secret
        redirectUri: process.env.SPOTIFY_REDIRECT_URI // Spotify API redirect URI
    },
    mongoDB: {
        username: process.env.MONGODB_USERNAME, // MongoDB username
        password: process.env.MONGODB_PASSWORD, // MongoDB password
        // Construct the MongoDB connection URI using username and password
        uri: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@biboubot.kdbhjnu.mongodb.net/?retryWrites=true&w=majority`
    },
    server: {
        // Port for the web server, defaults to 8888 if not set in environment variables
        port: process.env.PORT || 8888
    },
    // Summoner name for specific bot functionalities, moved from global scope
    bibouSummonerName: "chill falls1",

    pointSettings: {
        hintCost: 10,
        lowCost: 10, // Note: Original had user and target lose points. Simplified for now.
        guessReward: 20,
        coachingCost: 3000,
        oneVOneCost: 2000,
        // oneVOneReward: 300, // This was mentioned but not clearly implemented in original !1v1
        skipsongCost: 30,
        reviewOPGGCost: 150,
        // skinCost: 30, // This was for !skin, which is now a vote. Not a direct cost.
        songrequestCost: 30,
        giftMinAmount: 1, // Minimum amount for !gift (though not used in provided gift.js)
    }
};

module.exports = config;
