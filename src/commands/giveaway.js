// src/commands/giveaway.js
let giveawayState = {
    active: false,
    participants: new Set(),
    winner: "",
    motclé: ""
};

async function execute(twitchClient, channel, userstate, args) {
    // Logic from handleGiveaway (mod check, setting up giveaway.motclé, timeout)
    if (userstate.mod || (userstate.badges && userstate.badges.broadcaster === '1')) { // More robust check for broadcaster
        const keyword = args[0] || "Bibou"; // Default keyword
        twitchClient.say(channel, `Pour participer au giveaway, envoyez ${keyword} dans le chat dans les prochaines 45s !`);
        giveawayState.motclé = keyword.toLowerCase();
        giveawayState.participants.clear();
        giveawayState.active = true;
        giveawayState.winner = "";

        setTimeout(() => {
            giveawayState.active = false;
            if (giveawayState.participants.size > 0) {
                giveawayState.winner = Array.from(giveawayState.participants)[Math.floor(Math.random() * giveawayState.participants.size)];
                twitchClient.say(channel, `Le giveaway est terminé ! Merci à tous pour votre participation ! Le Gagnant est : @${giveawayState.winner}`);
            } else {
                twitchClient.say(channel, "Le giveaway est terminé ! Personne n'a participé.");
            }
            // Reset for next time (optional, or keep winner for display)
            // giveawayState.motclé = ""; 
        }, 45 * 1000);
    } else {
        twitchClient.say(channel, "Seuls les modos ou le streamer peuvent lancer un giveaway !");
    }
}

function processMessage(userstate, message) {
    if (giveawayState.active && message.toLowerCase() === giveawayState.motclé) {
        giveawayState.participants.add(userstate['display-name']); // Store display name
        console.log(`${userstate['display-name']} joined the giveaway. Participants: ${Array.from(giveawayState.participants)}`);
        return true; // Message was processed for giveaway
    }
    return false; // Message not related to active giveaway
}

function getGiveawayState() { // For the API endpoint
    return { ...giveawayState, participants: Array.from(giveawayState.participants) };
}

module.exports = {
    name: 'giveaway',
    description: 'Starts a giveaway or manages an ongoing one.',
    execute,
    processMessage, // Export this to be called by the main message handler
    getGiveawayState // Export for the API
};
