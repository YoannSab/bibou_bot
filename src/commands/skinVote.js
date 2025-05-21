// src/commands/skinVote.js
const fs = require('fs');
const path = require('path');

let championNamesMatch = {};
try {
    // Path relative to project root
    const championNamesFilePath = path.join('./data/championNames.json'); 
    championNamesMatch = JSON.parse(fs.readFileSync(championNamesFilePath, 'utf-8'));
} catch (error) {
    console.error("Failed to load championNames.json for skinVote:", error);
}

let votesState = {
    active: false,
    skinChoices: [], // Array of skin names
    championName: "",
    currentVotes: {}, // e.g., { "1": 10, "2": 5 }
    voters: new Set() // To track who has voted, potentially for one-vote-per-user
};

const VOTE_DURATION = 45000; // 45 seconds

function resetVoteState() {
    votesState.active = false;
    votesState.skinChoices = [];
    votesState.championName = "";
    votesState.currentVotes = {};
    votesState.voters.clear();
}

async function handleSkinCommand(twitchClient, channel, userstate, args, { riotApiService }) {
    if (votesState.active) {
        twitchClient.say(channel, `Un vote pour les skins de ${votesState.championName} est déjà en cours. Attendez la fin ou tapez !vote <numéro>.`);
        return;
    }

    const championNameArg = args.join(' ').trim();
    if (!championNameArg) {
        twitchClient.say(channel, "Veuillez spécifier un nom de champion. Usage: !skin <champion>");
        return;
    }

    let championKey = championNameArg.toLowerCase();
    if (championNamesMatch[championKey]) {
        championKey = championNamesMatch[championKey];
    }
    // Further normalization might be needed if riotApiService.fetchChampionSkins expects a very specific format
    // For now, we pass what we get after alias mapping.

    if (!riotApiService || typeof riotApiService.fetchChampionSkins !== 'function') {
        twitchClient.say(channel, "Désolé, le service pour récupérer les skins n'est pas disponible.");
        console.error("riotApiService.fetchChampionSkins is not available in skinVote.js");
        return;
    }

    const skins = await riotApiService.fetchChampionSkins(championKey);

    if (!skins || skins.length === 0) {
        twitchClient.say(channel, `Aucun skin trouvé pour ${championNameArg} ou le champion n'existe pas.`);
        return;
    }

    resetVoteState(); // Reset before starting a new vote
    votesState.active = true;
    votesState.skinChoices = skins;
    votesState.championName = championNameArg; // Store the user-provided name for messages

    let skinMessage = `Skins pour ${votesState.championName}: `;
    skins.forEach((skin, index) => {
        skinMessage += `${index + 1}: ${skin} | `;
    });
    skinMessage = skinMessage.slice(0, -3); // Remove trailing " | "
    twitchClient.say(channel, skinMessage);
    twitchClient.say(channel, `Votez pour votre skin préféré avec !vote <numéro> pendant les ${VOTE_DURATION / 1000} prochaines secondes !`);

    setTimeout(() => endSkinVote(twitchClient, channel), VOTE_DURATION);
}

function endSkinVote(twitchClient, channel) {
    if (!votesState.active) {
        // Vote might have been ended prematurely or by another mechanism
        return;
    }

    let winningSkinIndex = -1;
    let maxVotes = 0;
    let tied = false;

    if (Object.keys(votesState.currentVotes).length === 0) {
        twitchClient.say(channel, `Aucun vote enregistré pour les skins de ${votesState.championName}. Le skin par défaut sera utilisé.`);
        resetVoteState();
        return;
    }

    for (const skinIndexNum in votesState.currentVotes) {
        const voteCount = votesState.currentVotes[skinIndexNum];
        if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winningSkinIndex = parseInt(skinIndexNum, 10) - 1; // Adjust for 0-based index
            tied = false;
        } else if (voteCount === maxVotes) {
            tied = true;
        }
    }
    
    let winnerMessage;
    if (tied || winningSkinIndex < 0 || winningSkinIndex >= votesState.skinChoices.length) {
        // Default to the first skin in case of a tie or error
        winnerMessage = `Égalité ou erreur dans les votes pour ${votesState.championName}! Le skin par défaut (${votesState.skinChoices[0]}) sera choisi.`;
        if (winningSkinIndex < 0 && votesState.skinChoices.length > 0) winningSkinIndex = 0; // Ensure a valid default if no votes
    } else {
         winnerMessage = `Le vote est terminé ! Le skin gagnant pour ${votesState.championName} est : ${votesState.skinChoices[winningSkinIndex]} avec ${maxVotes} vote(s).`;
    }
    twitchClient.say(channel, winnerMessage);
    resetVoteState();
}

async function handleVoteCommand(twitchClient, channel, userstate, args) {
    if (!votesState.active) {
        twitchClient.say(channel, "Il n'y a pas de vote de skin en cours.");
        return;
    }

    const voteNumber = parseInt(args[0], 10);
    if (isNaN(voteNumber) || voteNumber <= 0 || voteNumber > votesState.skinChoices.length) {
        twitchClient.say(channel, `Vote invalide. Veuillez voter avec un numéro entre 1 et ${votesState.skinChoices.length}.`);
        return;
    }

    // Simple vote counting: one vote per user for a specific number.
    // If a user votes for '1' then '2', they contribute to both.
    // If they vote for '1' twice, their vote for '1' is counted once if we check voters.
    // Current simple implementation: just increment.
    // For one-vote-per-user for the whole poll:
    // if (votesState.voters.has(userstate.username)) {
    //     twitchClient.say(channel, `@${userstate['display-name']}, vous avez déjà voté.`);
    //     return;
    // }
    // votesState.voters.add(userstate.username);

    votesState.currentVotes[voteNumber] = (votesState.currentVotes[voteNumber] || 0) + 1;
    twitchClient.say(channel, `@${userstate['display-name']}, votre vote pour le skin #${voteNumber} (${votesState.skinChoices[voteNumber-1]}) a été enregistré !`);
}

module.exports = {
    handleSkinCommand,
    handleVoteCommand,
    // getVotesState: () => ({ ...votesState, participants: Array.from(votesState.voters) }) // If API needed later
};
