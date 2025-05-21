// src/commands/guessGame.js
const fs = require('fs');
const path = require('path');
const { jaroWinklerDistance } = require('../utils/helpers');
const botSettings = require('../botSettings.js'); // Added

let champToGuess = {}; // { name: "ChampionName", hintLevel: 0, fullName: "Champion Full Name", quotes: [] }
let lastGuessTime = 0;
// let currentGuessDelay = botSettings.getGuessGameDelay(); // Initialized from settings

// Points logic constants (points not implemented yet, but constants can remain for clarity)
const hintCost = 10; 
const guessReward = 20;

let championsList = {};
try {
    const champFilePath = path.join(__dirname, '../../data/champ.json');
    championsList = JSON.parse(fs.readFileSync(champFilePath, 'utf-8'));
} catch (error) {
    console.error("Failed to load champ.json for guessGame:", error);
}

let championNamesMatch = {};
try {
    const championNamesFilePath = path.join(__dirname, '../../data/championNames.json');
    championNamesMatch = JSON.parse(fs.readFileSync(championNamesFilePath, 'utf-8'));
} catch (error) {
    console.error("Failed to load championNames.json for guessGame:", error);
}

function startGuess(twitchClient, channel) {
    const currentGuessDelay = botSettings.getGuessGameDelay(); // Get current delay from settings
    const currentTime = Date.now();

    if (currentTime - lastGuessTime < currentGuessDelay) {
        twitchClient.say(channel, `Veuillez attendre ${Math.floor((currentGuessDelay - (currentTime - lastGuessTime)) / 1000)} secondes avant de rejouer.`);
        return;
    }
    lastGuessTime = currentTime;

    const championKeys = Object.keys(championsList);
    if (championKeys.length === 0) {
        twitchClient.say(channel, "Erreur: La liste des champions n'a pas pu être chargée pour le jeu de devinette.");
        return;
    }
    const randomChampionKey = championKeys[Math.floor(Math.random() * championKeys.length)];
    const championInfoArray = championsList[randomChampionKey]; 
    
    if (!Array.isArray(championInfoArray) || championInfoArray.length === 0) {
        console.error("Champion data is not in expected format for key:", randomChampionKey, championInfoArray);
        twitchClient.say(channel, "Erreur lors de la sélection d'un champion pour le jeu.");
        return;
    }
    
    champToGuess = {
        name: randomChampionKey, 
        fullName: championInfoArray[0], 
        quotes: championInfoArray.slice(1), // Assuming quotes are elements from index 1 onwards
        hintLevel: 0
    };

    twitchClient.say(channel, `Trouvez le champion ! Pour proposer, tapez !try <champion>. Pour un indice, tapez !hint. Pour abandonner, tapez !abandon.`);
    // Provide the first two letters as an initial hint
    twitchClient.say(channel, `Indice initial: Les deux premières lettres sont "${champToGuess.fullName.substring(0, 2)}"`);
}

function giveHint(twitchClient, channel, userstate, services) {
    if (Object.keys(champToGuess).length === 0) {
        // twitchClient.say(channel, `Aucun champion n'est en cours de devinette !`); // Be silent if no game
        return;
    }
    // TODO: Implement points deduction for hintCost using services.mongoDbService.givePoints(userstate.username, -hintCost);
    
    if (champToGuess.hintLevel === 0 && champToGuess.quotes && champToGuess.quotes[0]) {
        twitchClient.say(channel, `Voici un indice : "${champToGuess.quotes[0]}"`);
        champToGuess.hintLevel = 1;
    } else if (champToGuess.hintLevel === 1 && champToGuess.quotes && champToGuess.quotes[1]) {
         twitchClient.say(channel, `Voici un autre indice : "${champToGuess.quotes[1]}"`);
         champToGuess.hintLevel = 2; // Mark that second hint type (quote) has been used
    } else {
        twitchClient.say(channel, `Vous avez déjà utilisé tous les indices disponibles pour ce champion (${champToGuess.fullName}) !`);
    }
}

function attemptGuess(twitchClient, channel, userstate, guess, services) {
    if (Object.keys(champToGuess).length === 0) return; // No active game

    let normalizedGuess = guess.toLowerCase().replace(/[^a-z0-9]/gi, '');
    let normalizedTargetKey = champToGuess.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
    let normalizedTargetFullName = champToGuess.fullName.toLowerCase().replace(/[^a-z0-9]/gi, '');

    let matched = false;
    if (normalizedGuess === normalizedTargetKey || normalizedGuess === normalizedTargetFullName) {
        matched = true;
    } else {
        // Check against mappings in championNamesMatch.json
        const mappedChampionName = championNamesMatch[guess.toLowerCase()];
        if (mappedChampionName) {
            // Normalize the mapped name as well before comparison
            const normalizedMappedName = mappedChampionName.toLowerCase().replace(/[^a-z0-9]/gi, '');
            if (normalizedMappedName === normalizedTargetKey || normalizedMappedName === normalizedTargetFullName) {
                matched = true;
            }
        }
    }

    if (matched) {
        // TODO: Implement points awarding for guessReward using services.mongoDbService.givePoints(userstate.username, guessReward);
        twitchClient.say(channel, `Bravo @${userstate['display-name']} ! Vous avez trouvé le champion: ${champToGuess.fullName}!`);
        champToGuess = {}; // Reset game state
    } else {
        // Calculate Jaro-Winkler distance for feedback
        const distanceWithKey = jaroWinklerDistance(normalizedGuess, normalizedTargetKey);
        const distanceWithFullName = jaroWinklerDistance(normalizedGuess, normalizedTargetFullName);
        // Consider the best match if the key and full name differ significantly (e.g., "KogMaw" vs "Kog'Maw")
        const distance = Math.max(distanceWithKey, distanceWithFullName); 

        const messageRefus = ["N'importe quoi ! ", "T'es nul", "Mouais pas ouf", "Essaie encore", "Il y a quelque chose", "Franchement c'est pas loin", "T'es tout proche !", "Tqt c'est juste une faute de frappe"];
        let responseMessage = "";
        if (distance > 90) responseMessage = messageRefus[messageRefus.length - 1];
        else if (distance > 80) responseMessage = messageRefus[messageRefus.length - 2];
        else if (distance > 70) responseMessage = messageRefus[messageRefus.length - 3];
        else if (distance > 50) responseMessage = messageRefus[messageRefus.length - 4];
        else if (distance > 30) responseMessage = messageRefus[messageRefus.length - 5];
        else responseMessage = messageRefus[Math.floor(Math.random() * (messageRefus.length - 5))]; // Random from first few
        
        twitchClient.say(channel, `${responseMessage} @${userstate['display-name']}. (Proximité: ${distance}%)`);
    }
}

function abandonGuess(twitchClient, channel) {
    if (Object.keys(champToGuess).length !== 0) {
        twitchClient.say(channel, `Le champion à deviner était ${champToGuess.fullName} !`);
        champToGuess = {}; // Reset game state
    }
}

module.exports = {
    startGuess,
    giveHint,
    attemptGuess,
    abandonGuess,
    // No need to export currentGuessDelay or its setter as it's managed via botSettings
};
