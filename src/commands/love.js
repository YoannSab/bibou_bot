// src/commands/love.js
// const config = require('../config/config'); // If emoticons are moved to config

async function execute(twitchClient, channel, userstate, args) {
    const value = Math.floor(Math.random() * 101); // 0-100
    const otherPerson = args.join(' ').trim();
    const senderDisplayName = userstate['display-name'];
    // const kappa = config.emoticons.Kappa || 'Kappa'; // Example if emoticons are in config

    let message;
    if (!otherPerson) {
        message = `${senderDisplayName} aime @Bibou_LoL à ${value}%. <3`;
    } else {
        // Prevent users from using the command on themselves in a way that implies self-love calculation
        if (otherPerson.toLowerCase().startsWith('@') && otherPerson.slice(1).toLowerCase() === userstate.username.toLowerCase()) {
            message = `Tu ne peux pas calculer ton amour propre avec cette commande, @${senderDisplayName}, mais on sait que tu t'aimes fort ! <3`;
        } else if (otherPerson.toLowerCase() === userstate.username.toLowerCase()) {
            message = `Tu ne peux pas calculer ton amour propre avec cette commande, @${senderDisplayName}, mais on sait que tu t'aimes fort ! <3`;
        }
        else {
            message = `${senderDisplayName} aime ${otherPerson} à ${value}%. <3`;
        }
    }
    twitchClient.say(channel, message);
}

module.exports = {
    name: 'love',
    description: 'Calculates the love percentage.',
    execute
};
