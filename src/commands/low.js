// src/commands/low.js
const fs = require('fs');
const path = require('path');
let phraseLow = [];
try {
    const clashFilePath = path.join(__dirname, '../../data/clash.json');
    const rawData = fs.readFileSync(clashFilePath, 'utf8'); // Specify encoding
    phraseLow = JSON.parse(rawData);
} catch (error) {
    console.error("Failed to load or parse clash.json:", error);
    phraseLow = ["Yo []! Tu es trop fort !"]; // Fallback with a placeholder
}

async function execute(twitchClient, channel, userstate, args) {
    // Points logic ignored for now as per instructions.
    // Original logic for point deduction or specific user targeting (e.g. with @)
    // is simplified here.

    const targetName = args.join(' ').trim();
    if (!targetName) {
        twitchClient.say(channel, `Usage: !low <nom d'utilisateur>`);
        return;
    }

    if (phraseLow.length === 0) {
        twitchClient.say(channel, `Yo ${targetName}! (Error: phrases not loaded)`);
        return;
    }
    
    // Select a random phrase and replace the placeholder if it exists.
    // The original phrases might not have a placeholder, so we adapt.
    let randomPhrase = phraseLow[Math.floor(Math.random() * phraseLow.length)];
    if (randomPhrase.includes("[]")) {
        randomPhrase = randomPhrase.replace("[]", targetName);
    } else {
        // If no placeholder, just prepend/append the name or use a default structure.
        // For this example, let's assume the phrase structure from gg.json was more generic.
        // If clash.json phrases are complete sentences, this might need adjustment.
        // The original example just prepended "Yo targetName, "
        randomPhrase = `Yo ${targetName}, ${randomPhrase}`;
    }

    twitchClient.say(channel, randomPhrase);
}

module.exports = {
    name: 'low',
    description: 'Sends a "low" message to a user, using phrases from clash.json.',
    execute
};
