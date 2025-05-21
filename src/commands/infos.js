// src/commands/infos.js
async function execute(twitchClient, channel, userstate, args) {
    const commandList = [
        "!elo", "!twitter", "!lolpro", "!opgg", "!music", "!songrequest <chanson>", 
        "!low <utilisateur>", "!love <personne>", "!guess", "!try <champion>", "!hint", "!abandon",
        "!streak [nom_invocateur_ou_0_pour_bibou_1_pour_yoriichi]", "!winrate <champion>[/adversaire]", "!skin <champion>", "!vote <numero>",
        "!points", "!gift <utilisateur> <montant>", "!onevone", "!reviewopgg", "!coaching",
        "!skipsong", "!gg [nom]", "!story <champion>", "!setdelay <secondes>", "!enablemusic", "!disablemusic"
        // Add more as they are refactored
    ].join(', ');
    twitchClient.say(channel, `Commandes disponibles : ${commandList}. Pour plus de détails sur une commande spécifique, on ajoutera peut-être !help <commande> plus tard!`);
}

module.exports = {
    name: 'infos', // or 'help'
    description: 'Lists available commands.',
    execute,
    aliases: ['help', 'commands'] // Add alias for commandHandler if it supports it
};
