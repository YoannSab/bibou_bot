// src/commands/gift.js
const config = require('../config/config');

async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    if (args.length !== 2 || isNaN(parseInt(args[1]))) {
        twitchClient.say(channel, `Usage: !gift <nom_utilisateur> <montant>`);
        return;
    }

    const targetUser = args[0].startsWith('@') ? args[0].substring(1).toLowerCase() : args[0].toLowerCase();
    const amount = parseInt(args[1]);
    const senderUsername = userstate.username; // Twitch username is already lowercase

    if (amount <= 0) {
        twitchClient.say(channel, `Veuillez entrer un montant positif, @${userstate['display-name']}.`);
        return;
    }

    if (!mongoDbService || typeof mongoDbService.getPoints !== 'function' || typeof mongoDbService.givePoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        console.error("mongoDbService or its functions are not available in !gift command.");
        return;
    }

    try {
        const senderPoints = await mongoDbService.getPoints(senderUsername);
        if (senderPoints < amount) {
            twitchClient.say(channel, `Vous n'avez pas assez de points pour faire ce cadeau, @${userstate['display-name']}. Vous avez ${senderPoints} points.`);
            return;
        }

        // Ensure the target user is not the sender
        if (senderUsername === targetUser) {
            twitchClient.say(channel, `Vous ne pouvez pas vous offrir de points à vous-même, @${userstate['display-name']}.`);
            return;
        }

        await mongoDbService.givePoints(senderUsername, -amount);
        await mongoDbService.givePoints(targetUser, amount); // givePoints handles user creation if not exists
        twitchClient.say(channel, `@${userstate['display-name']} a donné ${amount} points à @${targetUser} !`);
    } catch (error) {
        console.error("Error during !gift command:", error);
        twitchClient.say(channel, "Une erreur est survenue lors du don de points.");
    }
}

module.exports = {
    name: 'gift',
    description: 'Gifts points to another user.',
    execute
};
