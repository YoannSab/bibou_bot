// src/commands/gg.js
const fs = require('fs');
const path = require('path');
let phraseGG = [];
try {
    const ggFilePath = path.join(__dirname, '../../data/gg.json');
    const rawData = fs.readFileSync(ggFilePath, 'utf8'); // Specify encoding
    phraseGG = JSON.parse(rawData).map(phrase => phrase.replace(/Bibou/g, '[]'));
} catch (error) {
    console.error("Failed to load or parse gg.json:", error);
    phraseGG = ["GG []!"]; // Fallback
}

async function execute(twitchClient, channel, userstate, args, services) {
    const name = args.join(' ').trim() || 'Bibou';
    if (phraseGG.length === 0) {
        twitchClient.say(channel, `GG ${name}! (Error: phrases not loaded)`);
        return;
    }
    const randomPhrase = phraseGG[Math.floor(Math.random() * phraseGG.length)];
    twitchClient.say(channel, randomPhrase.replace("[]", name));
}

module.exports = {
    name: 'gg',
    description: 'Sends a random GG message.',
    execute
};
