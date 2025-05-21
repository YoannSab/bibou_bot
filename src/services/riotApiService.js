// src/services/riotApiService.js
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs'); // For loading local JSON files
const config = require('../config/config.js');

const riotApiKey = config.riot.apiKey;
const bibouSummonerName = config.bibouSummonerName; // Centralized summoner name

// Load champion names data
let championNamesMatch = {};
try {
    // Corrected path assuming this file is in src/services/ and data is at the root
    const championNamesFile = fs.readFileSync('./data/championNames.json', 'utf8');
    championNamesMatch = JSON.parse(championNamesFile);
} catch (error) {
    console.error('Failed to load championNames.json:', error);
    // Consider the implications if this file is essential for some functions
}

// Module-local cache for winrate statistics
const winrate = {};

// Placeholder for emoticons, to be consistent with how they were used in index.js
// These are passed to twitchClient.say, so they should be defined or passed if needed.
const emoticons = {
    Kappa: 'Kappa',
    Kreygasm: 'Kreygasm',
    PogChamp: 'PogChamp',
    LUL: 'LUL',
    BibleThump: 'BibleThump',
    TriHard: 'TriHard',
};

async function getMatchHistory(username) {
    var histo = [];
    try {
        const encodedUsername = encodeURIComponent(username);
        const account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedUsername}?api_key=${riotApiKey}`);
        const accountId = account.data.puuid;
        // console.log(`ID du compte de ${username} : ${accountId}`);

        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${accountId}/ids?start=0&count=20&api_key=${riotApiKey}`);
        const matches = matchList.data;

        let nb = 0;
        for (let i = 0; i < matches.length; i++) {
            if (nb === 5) break;
            const matchId = matches[i];
            const match = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = match.data;
            if (matchDetails.info.gameMode === "CLASSIC") {
                let result = '';
                const participant = matchDetails.info.participants.find(p => p.summonerName === username || p.puuid === accountId);
                if (participant) {
                    result = participant.win ? '✅' : '❌';
                } else {
                    result = 'E'; 
                }
                histo.push(result);
                nb++;
            }
        }
        return histo;
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'historique des parties pour ${username}:`, error.message);
        if (error.response && error.response.status === 404) {
            return ['Summoner not found'];
        }
        return ['Error'];
    }
}

async function handleElo(twitchClient, channel) {
    // Uses bibouSummonerName from config
    const summonerNames = [bibouSummonerName]; 

    const getSummonerInfo = async (summonerName) => {
        try {
            const encodedSummonerName = encodeURIComponent(summonerName);
            const summonerResponse = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedSummonerName}?api_key=${riotApiKey}`);
            const summonerId = summonerResponse.data.id;

            const leagueResponse = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${riotApiKey}`);
            const leagueData = leagueResponse.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');

            if (!leagueData) {
                twitchClient.say(channel, `${summonerName} ${emoticons.Kreygasm} n'a pas encore joué de parties classées en solo cette saison.`);
            } else {
                const tier = leagueData.tier;
                const rank = leagueData.rank;
                const lp = leagueData.leaguePoints;
                twitchClient.say(channel, ` ${summonerName} ${emoticons.Kappa} est actuellement ${tier} ${rank} avec ${lp} LP.`);
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération des données de la ligue pour ${summonerName}:`, error.message);
            twitchClient.say(channel, `Désolé, une erreur est survenue lors de la récupération des données de la ligue pour ${summonerName}.`);
        }
    };
    summonerNames.forEach(getSummonerInfo);
}

async function handleStreak(twitchClient, channel, accountIdentifier) {
    // accountIdentifier can be a number (0 for bibouSummonerName, 1 for "Yoriichı") or a summoner name string
    let targetSummonerName = bibouSummonerName; // Default to bibou's main account
    if (typeof accountIdentifier === 'number') {
        if (accountIdentifier === 1) {
            targetSummonerName = "Yoriichı"; // Specific other account
        }
    } else if (typeof accountIdentifier === 'string' && accountIdentifier.trim() !== '') {
        targetSummonerName = accountIdentifier; // Directly use the provided name
    }

    try {
        const streak = await getMatchHistory(targetSummonerName);
        if (streak && streak.length > 0) {
            twitchClient.say(channel, `Streak de ${targetSummonerName} : ${streak.join(' ')}`);
        } else if (streak && streak[0] === 'Summoner not found') {
            twitchClient.say(channel, `Impossible de trouver l'invocateur : ${targetSummonerName}`);
        } else {
            twitchClient.say(channel, `Impossible de récupérer la streak pour ${targetSummonerName}.`);
        }
    } catch (error) {
        console.error(`Erreur dans handleStreak pour ${targetSummonerName}:`, error.message);
        twitchClient.say(channel, `Une erreur est survenue lors de la récupération de la streak pour ${targetSummonerName}.`);
    }
}

async function fetchChampionSkins(championNameInput) {
    let championKey = championNameInput;
    // Normalize champion name using championNamesMatch
    if (championNamesMatch[championNameInput.toLowerCase()]) {
        championKey = championNamesMatch[championNameInput.toLowerCase()];
    }
    // Further normalization as seen in index.js (e.g. "Kog'Maw" -> "KogMaw")
    championKey = championKey.replace(/[^a-zA-Z0-9]/g, ''); 
    // Capitalize first letter, rest lower case, then handle multi-word names like MissFortune
     if (championKey.includes(' ')) {
        championKey = championKey.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
    } else {
        championKey = championKey.charAt(0).toUpperCase() + championKey.slice(1).toLowerCase();
    }


    try {
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionsResponse.data[0];
        // Construct the URL carefully. Some champions might have specific keys in ddragon.
        // Example: Fiddlesticks key is "FiddleSticks"
        // We might need a more robust mapping if simple capitalization isn't enough.
        // For now, using the processed championKey.
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion/${championKey}.json`);
        const championData = response.data.data[championKey];
        
        if (!championData) {
            console.error(`Champion introuvable dans DDragon: ${championKey} (original: ${championNameInput})`);
            return [];
        }
        const skinNames = championData.skins.map(skin => skin.name === 'default' ? championData.name : skin.name);
        return skinNames;
    } catch (error) {
        console.error(`Erreur lors de la récupération des skins pour ${championKey} (original: ${championNameInput}):`, error.message);
        if (error.response && error.response.status === 404) {
             console.warn(`DDragon data not found for champion key: ${championKey}`);
        }
        return [];
    }
}

async function getStats(username, champName, opponentChamp = "") {
    try {
        const encodedUsername = encodeURIComponent(username);
        let account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedUsername}?api_key=${riotApiKey}`);
        const puuid = account.data.puuid;
        
        const matchListResponse = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=35&api_key=${riotApiKey}`);
        const matches = matchListResponse.data;

        let totalGames = 0;
        let wins = 0;

        for (let i = 0; i < matches.length; i++) {
            const matchId = matches[i];
            const matchDetailsResponse = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = matchDetailsResponse.data;

            if (matchDetails.info.gameMode === "CLASSIC" || matchDetails.info.gameType === "MATCHED_GAME") { // Ensuring it's a relevant game mode
                const playerParticipant = matchDetails.info.participants.find(p => p.puuid === puuid);

                if (!playerParticipant) continue;

                let conditionMet = false;
                if (champName === "" && opponentChamp === "") {
                    conditionMet = true;
                } else if (champName !== "" && opponentChamp === "") {
                    if (playerParticipant.championName.toLowerCase() === champName.toLowerCase()) {
                        conditionMet = true;
                    }
                } else {
                    const opponentParticipant = matchDetails.info.participants.find(p => p.championName.toLowerCase() === opponentChamp.toLowerCase() && p.teamId !== playerParticipant.teamId);
                    if (playerParticipant.championName.toLowerCase() === champName.toLowerCase() && opponentParticipant) {
                        conditionMet = true;
                    }
                }

                if (conditionMet) {
                    totalGames++;
                    if (playerParticipant.win) {
                        wins++;
                    }
                }
            }
        }
        
        const cacheKey = `${username}_${champName}_${opponentChamp}`;
        if (totalGames === 0) {
            winrate[cacheKey] = [NaN, 0]; // Store NaN if no games, but record count as 0
        } else {
            winrate[cacheKey] = [wins / totalGames, totalGames];
        }
        return winrate[cacheKey];

    } catch (error) {
        console.error(`Erreur dans getStats pour ${username}, ${champName}, ${opponentChamp}:`, error.message);
        const cacheKey = `${username}_${champName}_${opponentChamp}`;
        winrate[cacheKey] = [NaN, 0]; // Cache error result
        return winrate[cacheKey];
    }
}

async function getStatistics(username, champName, opponentChamp) {
    const cacheKey = `${username}_${champName}_${opponentChamp}`;
    if (winrate[cacheKey] === undefined) {
        await getStats(username, champName, opponentChamp);
    }
    return winrate[cacheKey]; // Returns [winRateValue, totalGames]
}

async function getSoloQChallengeInfos() {
    try {
        const response = await axios.get("https://soloqchallenge.fr"); // Using axios
        const html = response.data;
        const $ = cheerio.load(html);
        const leaderboard = $('#leaderboard-refresh');
        const participants = leaderboard.find('.ranking-list_grid-setup');
        const top3 = [];
        let bibouData = null; // Using bibouSummonerName from config

        participants.each((i, participant) => {
            const rank = $(participant).find('.ranking').text();
            const name = $(participant).find('.ranking-list_pseudo p').text().trim();
            const elo = $(participant).find('.ranking-list_rank p').text().trim().replace(/\s+/g, '');
            const victories = $(participant).find('.ranking-list_wins').text().trim();
            const defeats = $(participant).find('.ranking-list_losses').text().trim();

            if (top3.length < 3) {
                top3.push({ rank, name, elo, victories, defeats });
            }
            // Check against a normalized version of bibouSummonerName if necessary
            if (name.toLowerCase() === bibouSummonerName.toLowerCase().split('-')[0].trim()) { // Example normalization
                bibouData = { rank, name, elo, victories, defeats };
            }
        });
        return { top3, bibou: bibouData };
    } catch (error) {
        console.error('Erreur lors de la récupération des informations du SoloQ Challenge:', error.message);
        return null;
    }
}

async function getLiveGame(summonerName) {
    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new" // Explicitly set new headless mode
        });
        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'image' || resourceType === 'media') {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(`https://lolpros.gg/player/${encodeURIComponent(summonerName)}`, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for either the live game tab or the "not in game" message, whichever appears first.
        // This requires careful selector choice.
        const liveGameTabSelector = '[aria-controls="#live-game"]'; // Selector for the live game tab button
        await page.waitForSelector(liveGameTabSelector, {visible: true, timeout: 10000});
        await page.click(liveGameTabSelector);
        
        const notInGameSelector = '.text-center.pa-4 > p'; // Example selector for "not in game"
        const playerInGameSelector = '.player-name'; // Example selector for a player name in a live game

        await page.waitForFunction(
            (sel1, sel2) => document.querySelector(sel1) || document.querySelector(sel2),
            { timeout: 15000 }, // Wait up to 15 seconds
            notInGameSelector, playerInGameSelector
        );

        const isNotInGame = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el && (el.innerText.includes('is not in game') || el.innerText.includes('n\'est pas en jeu'));
        }, notInGameSelector);


        if (isNotInGame) {
            console.log(`${summonerName} is not in game.`);
            await browser.close();
            throw new Error('Summoner not in game');
        }

        const liveGameData = await page.evaluate(() => {
            const playerElements = document.querySelectorAll('.team-container .player'); // Target players within teams
            const players = [];
            playerElements.forEach(playerEl => {
                const playerNameEl = playerEl.querySelector('.player-name-display .name');
                const teamTitleEl = playerEl.querySelector('.player-team .title');
                const championIconEl = playerEl.querySelector('.champion-icon img'); // Get the img inside .champion-icon

                if (playerNameEl && championIconEl) {
                    const playerName = playerNameEl.innerText.trim();
                    const teamTitle = teamTitleEl ? teamTitleEl.innerText.trim() : 'Équipe inconnue';
                    const champion = championIconEl.alt.trim(); // Champion name is often in alt text
                     players.push({ playerName, teamTitle, champion });
                }
            });
            return { playerData: players };
        });
        
        await browser.close();
        return liveGameData;

    } catch (error) {
        console.error(`Erreur dans getLiveGame pour ${summonerName}:`, error.message);
        if (browser) {
            await browser.close();
        }
        if (error.message.includes('Summoner not in game')) {
            throw error; // Re-throw specific error for command handler
        }
        throw new Error(`Failed to get live game data for ${summonerName}.`); // General error
    }
}


module.exports = {
    getMatchHistory,
    handleElo,
    handleStreak,
    fetchChampionSkins,
    getStatistics,
    getStats, // Exporting if it might be called directly, or for testing
    getSoloQChallengeInfos,
    getLiveGame,
    getChampionStory, // Added
};

// Ensure championNamesMatch is loaded in this module or passed appropriately
async function getChampionStory(championNameParam) {
    let championKey = championNameParam;
    const championNameLower = championNameParam.toLowerCase();

    if (championNamesMatch[championNameLower]) {
        // Use the key from the mapping, remove special characters for URL, and ensure correct capitalization
        // Example: "Kai'Sa" -> "Kaisa", "Miss Fortune" -> "MissFortune"
        championKey = championNamesMatch[championNameLower]
            .replace(/'/g, '')
            .replace(/\s+/g, '') // Remove spaces
            .replace(/\./g, ''); // Remove dots e.g. Dr. Mundo
        // DDragon usually uses PascalCase for multi-word names if they are combined without space.
        // If the mapping itself is not PascalCase, this might need adjustment or ensure mapping is correct.
        // For single word names, it's usually TitleCase.
        // This part can be tricky due to DDragon's inconsistent champion key naming.
        // For simplicity, we'll assume the mapped key is close or direct.
        // A common pattern is TitleCase for single names, PascalCase for combined (e.g. MissFortune).
        // We will rely on the championNamesMatch to provide the DDragon key directly if it differs significantly.
        // If not, we try to make a best guess.
        if (!championKey.includes(' ') && championKey !== championKey.toLowerCase()) { // Likely PascalCase or TitleCase
             // No change needed if already in a cased format from mapping
        } else {
            // Fallback to simple title casing if mapping is lowercase or has spaces not intended for key
             championKey = championKey.charAt(0).toUpperCase() + championKey.slice(1).toLowerCase();
        }

    } else {
        // Fallback for names not in alias list: try to format as PascalCase or TitleCase
        championKey = championNameParam.replace(/'/g, '').replace(/\s+/g, '').replace(/\./g, '');
        championKey = championKey.charAt(0).toUpperCase() + championKey.slice(1);
         // If it was multi-word without spaces, it would become PascalCase.
         // e.g. "miss fortune" -> "Missfortune", ideally should be "MissFortune"
         // This heuristic is imperfect. A comprehensive mapping is better.
    }
    // Special cases known from DDragon:
    if (championNameLower === "wukong") championKey = "MonkeyKing";
    if (championNameLower === "nunu & willump" || championNameLower === "nunu") championKey = "Nunu";
    if (championNameLower === "renata glasc") championKey = "Renata";


    try {
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionsResponse.data[0];
        
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion/${championKey}.json`);
        const championData = response.data.data[championKey];
        
        if (!championData) {
            return `Désolé, je ne trouve pas d'histoire pour "${championNameParam}" (clé testée: ${championKey}).`;
        }
        return `L'histoire de ${championData.name} : ${championData.blurb}`;
    } catch (error) {
        // console.error(`Error fetching story for ${championKey} (original: ${championNameParam}):`, error.response ? error.response.status : error.message);
        // Try a direct lookup if the processed key failed (e.g. user typed "FiddleSticks")
        try {
            const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
            const latestVersion = versionsResponse.data[0];
            const directResponse = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion/${championNameParam}.json`);
            const directChampionData = directResponse.data.data[championNameParam];
            if (directChampionData) {
                 return `L'histoire de ${directChampionData.name} : ${directChampionData.blurb}`;
            }
        } catch (directError) {
            // Fall through to generic error
        }
        return `Désolé, une erreur est survenue en cherchant l'histoire de "${championNameParam}". Peut-être que le nom du champion est incorrect ou n'est pas encore dans ma base de données de clés DDragon. (Clé testée: ${championKey})`;
    }
}
