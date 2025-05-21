// src/commands/winrate.js
const fs = require('fs');
const path = require('path');
const config = require('../config/config'); // For BibouSummonerName

let championNamesMatch = {};
try {
    // Adjusted path to be relative to the project root, assuming CWD is project root
    const championNamesFilePath = path.join('./data/championNames.json'); 
    championNamesMatch = JSON.parse(fs.readFileSync(championNamesFilePath, 'utf-8'));
} catch (error) {
    console.error("Failed to load championNames.json for winrate command:", error);
    // If this file is critical, the command might not work as expected.
}

// State for winrate command delay
let lastWinrateTime = 0;
// Using winrateDelay from config if available, otherwise default (0 for testing, 2 mins for prod)
const winrateDelay = (config.twitch && config.twitch.commandDelay && config.twitch.commandDelay.winrate) || 0; // Example: config.twitch.commandDelay.winrate

async function execute(twitchClient, channel, userstate, args, { riotApiService }) {
    const currentTime = Date.now();
    if (currentTime - lastWinrateTime < winrateDelay) {
        twitchClient.say(channel, `Merci de patienter ${Math.round((winrateDelay - (currentTime - lastWinrateTime)) / 1000)} secondes avant de faire cette commande.`);
        return;
    }
    lastWinrateTime = currentTime;

    const argString = args.join(' ').trim();
    const parts = argString.split('/');
    let rawChampName = (parts[0] || "").trim();
    let rawOppChamp = (parts[1] || "").trim();
    
    let champName = rawChampName;
    let oppChamp = rawOppChamp;

    if (championNamesMatch[champName.toLowerCase()]) {
        champName = championNamesMatch[champName.toLowerCase()];
    }
    if (championNamesMatch[oppChamp.toLowerCase()]) {
        oppChamp = championNamesMatch[oppChamp.toLowerCase()];
    }

    if (riotApiService && typeof riotApiService.getStatistics === 'function') {
        try {
            const stats = await riotApiService.getStatistics(config.bibouSummonerName, champName, oppChamp);
            
            if (stats === undefined || stats === null || !Array.isArray(stats)) {
                twitchClient.say(channel, "Problème de récupération des stats de winrate ou format incorrect.");
                return;
            }
            
            const wr = stats[0]; // winrate value
            const nbGame = stats[1]; // number of games

            if (nbGame === 0 || isNaN(wr) || wr === null) { 
                twitchClient.say(channel, "Bibou n'a pas joué récemment ce matchup ou pas assez de données.");
            } else {
                let message = `Bibou a un winrate de ${(wr * 100).toFixed(1)}%`;
                if (champName) message += ` avec ${champName}`;
                if (oppChamp) message += ` contre ${oppChamp}`;
                message += ` sur ses ${nbGame} dernières parties.`;
                twitchClient.say(channel, message);
            }
        } catch (error) {
            console.error("Error calling getStatistics for winrate command:", error);
            twitchClient.say(channel, "Une erreur technique est survenue avec la commande !winrate.");
        }
    } else {
        console.error('Riot API service or getStatistics not available for winrate command.');
        twitchClient.say(channel, "Désolé, la commande !winrate n'est pas disponible pour le moment.");
    }
}

module.exports = {
    name: 'winrate',
    description: 'Calculates winrate for Bibou with a champion against an opponent.',
    execute
};
