// src/commands/predictionGame.js
// const config = require('../config/config'); // For point settings if directly used here

let predictionState = {
    active: false,
    participants: [], // Array of { username: string, displayName: string, betAmount: number, onWin: boolean (true for 'win', false for 'loss') }
    totWin: 0,        // Total points bet on 'win'
    totLoss: 0,       // Total points bet on 'loss'
    // Odds are calculated at resolution time
};

function startPrediction(twitchClient, channel, userstate) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent lancer une prédiction.");
        return;
    }
    if (predictionState.active) {
        twitchClient.say(channel, "Une prédiction est déjà en cours. Utilisez !stopprediction pour l'arrêter avant d'en lancer une nouvelle.");
        return;
    }

    predictionState.active = true;
    predictionState.participants = [];
    predictionState.totWin = 0;
    predictionState.totLoss = 0;
    twitchClient.say(channel, "Une prédiction a été lancée ! Pour participer, tapez !bet <win/loose> <nombrePts>");
    console.log("Prediction started by:", userstate.username);
}

function stopPrediction(twitchClient, channel, userstate) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent arrêter une prédiction.");
        return;
    }
    if (!predictionState.active) {
        twitchClient.say(channel, "Aucune prédiction n'est active à arrêter.");
        return;
    }

    predictionState.active = false; // Stop further bets
    twitchClient.say(channel, "Allez, on arrête de prédire, c'est enregistré ! Les paris sont fermés. Attendez la résolution avec !result <win/loose>.");
    console.log("Prediction betting stopped by:", userstate.username);
}

async function placeBet(twitchClient, channel, userstate, args, { mongoDbService }) {
    if (!predictionState.active) {
        twitchClient.say(channel, "Aucune prédiction n'est active pour le moment.");
        return;
    }

    if (args.length !== 2) {
        twitchClient.say(channel, `Usage: !bet <win/loose> <montant>`);
        return;
    }

    const betTypeArg = args[0].toLowerCase();
    const amount = parseInt(args[1]);

    if (betTypeArg !== 'win' && betTypeArg !== 'loose' && betTypeArg !== 'lose') { // Allow 'lose' as alias for 'loose'
        twitchClient.say(channel, `Type de pari invalide. Utilisez 'win' ou 'loose'.`);
        return;
    }
    const onWinBet = (betTypeArg === 'win');

    if (isNaN(amount) || amount <= 0) {
        twitchClient.say(channel, `Montant invalide. Veuillez parier un nombre positif de points.`);
        return;
    }

    if (!mongoDbService || typeof mongoDbService.getPoints !== 'function' || typeof mongoDbService.givePoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        console.error("mongoDbService or its functions are not available in !bet command.");
        return;
    }
    
    const username = userstate.username;
    const displayName = userstate['display-name'];

    // Check if user has already bet
    if (predictionState.participants.some(p => p.username === username)) {
        twitchClient.say(channel, `@${displayName}, vous avez déjà parié pour cette prédiction.`);
        return;
    }

    try {
        const userPoints = await mongoDbService.getPoints(username);
        if (userPoints < amount) {
            twitchClient.say(channel, `@${displayName}, vous n'avez pas assez de points. Vous avez ${userPoints} points.`);
            return;
        }

        await mongoDbService.givePoints(username, -amount); // Deduct points immediately

        predictionState.participants.push({ username, displayName, betAmount: amount, onWin: onWinBet });
        if (onWinBet) {
            predictionState.totWin += amount;
        } else {
            predictionState.totLoss += amount;
        }
        twitchClient.say(channel, `@${displayName} a parié ${amount} points sur '${betTypeArg}'.`);
        console.log(`Bet placed by ${displayName}: ${amount} on ${betTypeArg}. Total Win: ${predictionState.totWin}, Total Loss: ${predictionState.totLoss}`);

    } catch (error) {
        console.error(`Error placing bet for ${displayName}:`, error);
        twitchClient.say(channel, `Une erreur est survenue lors de votre pari, @${displayName}.`);
        // Consider refunding points if deduction happened before another error
        // For simplicity, current mongoDbService.givePoints is assumed atomic or idempotent for this scenario
    }
}

async function resolvePrediction(twitchClient, channel, userstate, args, { mongoDbService }) {
    if (!userstate.mod && !(userstate.badges && userstate.badges.broadcaster === '1')) {
        twitchClient.say(channel, "Seuls les modérateurs ou le streamer peuvent résoudre une prédiction.");
        return;
    }

    if (args.length !== 1) {
        twitchClient.say(channel, `Usage: !result <win/loose>`);
        return;
    }
    const resultArg = args[0].toLowerCase();
    if (resultArg !== 'win' && resultArg !== 'loose' && resultArg !== 'lose') {
        twitchClient.say(channel, `Résultat invalide. Utilisez 'win' ou 'loose'.`);
        return;
    }
    const isWinOutcome = (resultArg === 'win');

    if (predictionState.active) {
        // If betting was still active, stop it first.
        // This provides flexibility if mods forget !stopprediction
        predictionState.active = false; 
        twitchClient.say(channel, "Les paris pour la prédiction sont maintenant fermés. Résolution en cours...");
    }
    
    if (predictionState.participants.length === 0) {
        twitchClient.say(channel, "Aucun participant à cette prédiction. Pas de points distribués.");
        // Reset state for next round
        predictionState.totWin = 0;
        predictionState.totLoss = 0;
        return;
    }

    let totalPot = predictionState.totWin + predictionState.totLoss;
    let winningSideTotal = isWinOutcome ? predictionState.totWin : predictionState.totLoss;
    let losingSideTotal = isWinOutcome ? predictionState.totLoss : predictionState.totWin;

    if (winningSideTotal === 0) {
        // Everyone on the winning side (if any) gets their bet back.
        // Everyone on the losing side already lost their points.
        // Or, if no one bet on the winning side, all points are "lost" to the house/event.
        // For simplicity, if winningSideTotal is 0, it means no one won.
        // Points were already deducted.
        twitchClient.say(channel, `Personne n'a misé sur le résultat '${resultArg}'. Aucun point n'est distribué en plus.`);
        predictionState.participants = [];
        predictionState.totWin = 0;
        predictionState.totLoss = 0;
        return;
    }
    
    // Calculate payout ratio for winners: they get their bet back + a share of the losing side's bets.
    // PayoutFactor = TotalLosingBets / TotalWinningBets
    const payoutRatio = losingSideTotal / winningSideTotal;

    let resultSummary = `Résultat de la prédiction: ${resultArg.toUpperCase()}! `;
    let winnersFound = false;

    for (const participant of predictionState.participants) {
        if (participant.onWin === isWinOutcome) { // Participant guessed correctly
            winnersFound = true;
            const winnings = participant.betAmount * payoutRatio;
            const totalReturn = participant.betAmount + winnings; // Bet back + share of losses
            try {
                await mongoDbService.givePoints(participant.username, Math.round(totalReturn));
                resultSummary += `@${participant.displayName} gagne ${Math.round(winnings)} points (total ${Math.round(totalReturn)})! `;
                console.log(`Awarded ${Math.round(totalReturn)} to ${participant.displayName}`);
            } catch (error) {
                console.error(`Error awarding points to ${participant.displayName}:`, error);
                resultSummary += `Erreur de points pour @${participant.displayName}. `;
            }
        }
        // If participant guessed incorrectly, their points were already deducted.
    }

    if (!winnersFound) {
        resultSummary += "Personne n'avait parié sur ce résultat.";
    }

    twitchClient.say(channel, resultSummary.trim());

    // Reset state for the next prediction
    predictionState.participants = [];
    predictionState.totWin = 0;
    predictionState.totLoss = 0;
    console.log("Prediction resolved. State reset.");
}

module.exports = {
    startPrediction,
    stopPrediction,
    placeBet,
    resolvePrediction,
    getPredictionState: () => ({ // For API or debugging
        ...predictionState, 
        participants: predictionState.participants.map(p => ({displayName: p.displayName, betAmount: p.betAmount, onWin: p.onWin })) // Avoid exposing full username if not needed
    })
};
