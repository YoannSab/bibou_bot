// src/bot/twitchClient.js
const tmi = require('tmi.js');
const config = require('../config/config.js');

// Function to initialize the Twitch client
function initializeTwitchClient() {
    // TMI client options
    const options = {
        options: {
            debug: true, // Example option, can be configured as needed
        },
        connection: {
            reconnect: true,
            secure: true // Connect securely using SSL
        },
        identity: {
            username: config.twitch.username,
            password: config.twitch.oauth, // Corrected to use oauth from config
        },
        channels: config.twitch.channels,
    };

    // Create a new TMI client
    const client = new tmi.Client(options);

    // Event Handlers
    client.on('connected', (address, port) => {
        client.action(config.twitch.channels[0], "*** Je suis connecté ! ***"); // Use client instance from this module
    });

    client.on('disconnected', (reason) => {
        client.action(config.twitch.channels[0], "Je suis déconnecté !"); // Use client instance from this module
    });

    client.on('subscription', (channel, username, method, message, userstate) => {
        client.action(channel, `Merci ${username} pour l'abonnement !`); // Use client instance from this module
    });

    client.on('resub', (channel, username, months, message, userstate, methods) => {
        client.action(channel, `Merci ${username} pour le ${months}ème mois d'abonnement !`); // Use client instance from this module
    });

    client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
        client.action(channel, `Merci ${username} pour l'abonnement offert à ${recipient} !`); // Use client instance from this module
    });

    client.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => {
        client.action(channel, `Merci ${username} pour les ${numbOfSubs} abonnements offerts !`); // Use client instance from this module
    });

    client.on('cheer', (channel, userstate, message) => {
        client.action(channel, `Merci ${userstate["display-name"]} pour le ${userstate.bits} bits !`); // Use client instance from this module
    });

    client.on('raided', (channel, username, viewers) => {
        client.action(channel, `Merci ${username} pour le raid de ${viewers} viewers !`); // Use client instance from this module
    });

    client.on('hosted', (channel, username, viewers, autohost) => {
        client.action(channel, `Merci ${username} pour l'host de ${viewers} viewers !`); // Use client instance from this module
    });

    // Connect the client
    client.connect().catch(console.error);

    // Return the client instance
    return client;
}

// Export the function
module.exports = { initializeTwitchClient };
