// src/bot/commandHandler.js
const spotifyService = require('../services/spotifyService');
const riotApiService = require('../services/riotApiService');
const mongoDbService = require('../services/mongoDbService');
const botSettings = require('../botSettings');
const { jaroWinklerDistance } = require('../utils/helpers');

const services = {
    spotifyService,
    riotApiService,
    mongoDbService,
    botSettings
};

// Manually import commands
const twitterCommand = require('../commands/twitter');
const opggCommand = require('../commands/opgg');
const lolproCommand = require('../commands/lolpro');
const ggCommand = require('../commands/gg');
const musicCommand = require('../commands/music');
const eloCommand = require('../commands/elo');
const songrequestCommand = require('../commands/songrequest');
const skipsongCommand = require('../commands/skipsong');
const pointsCommand = require('../commands/points');
const giveawayCommand = require('../commands/giveaway');
const lowCommand = require('../commands/low');
const guessCommand = require('../commands/guess');
const hintCommand = require('../commands/hint');
const tryCommand = require('../commands/try');
const abandonCommand = require('../commands/abandon');
const streakCommand = require('../commands/streak');
const winrateCommand = require('../commands/winrate');
const skinCommand = require('../commands/skin');
const voteCommand = require('../commands/vote');
const setdelayCommand = require('../commands/setdelay');
const enablemusicCommand = require('../commands/enablemusic');
const disablemusicCommand = require('../commands/disablemusic');
const giftCommand = require('../commands/gift');
const onevoneCommand = require('../commands/onevone');
const reviewopggCommand = require('../commands/reviewopgg');
const coachingCommand = require('../commands/coaching');
const loveCommand = require('../commands/love');
const infosCommand = require('../commands/infos');
const storyCommand = require('../commands/story');
const predictionCommand = require('../commands/prediction');         // New
const stoppredictionCommand = require('../commands/stopprediction'); // New
const betCommand = require('../commands/bet');                   // New
const resultCommand = require('../commands/result');             // New
const helloCommand = require('../commands/hello');               // New
const top3Command = require('../commands/top3');                 // New


const commands = {
    'twitter': twitterCommand,
    'opgg': opggCommand,
    'lolpro': lolproCommand,
    'gg': ggCommand,
    'music': musicCommand,
    'elo': eloCommand,
    'songrequest': songrequestCommand,
    'skipsong': skipsongCommand,
    'points': pointsCommand,
    'giveaway': giveawayCommand,
    'low': lowCommand,
    'guess': guessCommand,
    'hint': hintCommand,
    'try': tryCommand,
    'abandon': abandonCommand,
    'streak': streakCommand,
    'winrate': winrateCommand,
    'skin': skinCommand,
    'vote': voteCommand,
    'setdelay': setdelayCommand,
    'enablemusic': enablemusicCommand,
    'disablemusic': disablemusicCommand,
    'gift': giftCommand,
    'onevone': onevoneCommand,
    '1v1': onevoneCommand, 
    'reviewopgg': reviewopggCommand,
    'coaching': coachingCommand,
    'love': loveCommand,
    'infos': infosCommand,
    'help': infosCommand,
    'commands': infosCommand,
    'story': storyCommand,
    'prediction': predictionCommand,         // New
    'stopprediction': stoppredictionCommand, // New
    'bet': betCommand,                   // New
    'result': resultCommand,             // New
    'hello': helloCommand,               // New
    'top3': top3Command,                 // New
};

function parseCommand(message) {
    if (typeof message !== 'string' || typeof message.slice !== 'function') {
        console.error('Invalid message format for parseCommand:', message);
        return { command: '', args: [] };
    }
    const args = message.slice(1).trim().split(/ +/g);
    const commandName = args.shift().toLowerCase();
    return { command: commandName, args };
}

async function handleCommand(twitchClient, channel, userstate, message) {
    if (commands.giveaway && typeof commands.giveaway.processMessage === 'function') {
        try {
            if (commands.giveaway.processMessage(userstate, message)) {
                return; 
            }
        } catch (error) {
            console.error("Error processing message for giveaway:", error);
        }
    }

    if (typeof message !== 'string' || !message.startsWith('!')) return;

    const { command, args } = parseCommand(message);

    const commandExecutor = commands[command];
    if (commandExecutor && typeof commandExecutor.execute === 'function') {
        try {
            await commandExecutor.execute(twitchClient, channel, userstate, args, services);
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            twitchClient.say(channel, `Oops! An error occurred with the !${command} command.`);
        }
    } else {
        console.log(`Unknown command: !${command}`);
        const commandNames = Object.keys(commands);
        let bestMatch = null;
        let highestSimilarity = 0.7; 

        for (const cmdName of commandNames) {
            const similarity = jaroWinklerDistance(`!${command}`, `!${cmdName}`);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = cmdName;
            }
        }

        if (bestMatch) {
            twitchClient.say(channel, `Commande inconnue: !${command}. Vouliez-vous dire !${bestMatch} ?`);
        }
    }
}

// For API or other modules that might need giveaway or prediction state
const predictionGame = require('../commands/predictionGame'); // Import to re-export state getter

module.exports = {
    handleCommand,
    parseCommand,
    getGiveawayState: (commands.giveaway && typeof commands.giveaway.getGiveawayState === 'function') 
                      ? commands.giveaway.getGiveawayState 
                      : () => ({ active: false, participants: [], winner: "", motclé: "N/A (giveaway cmd not loaded)" }),
    getPredictionState: (predictionGame && typeof predictionGame.getPredictionState === 'function')
                      ? predictionGame.getPredictionState
                      : () => ({ active: false, participants: [], totWin: 0, totLoss: 0 }) // Fallback
};
