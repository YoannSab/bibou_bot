// src/commands/streak.js
async function execute(twitchClient, channel, userstate, args, { riotApiService }) {
    let account = 0; // Default to BibouSummonerName (handled by riotApiService.handleStreak)
    if (args.length > 0 && !isNaN(parseInt(args[0]))) {
        account = parseInt(args[0]);
    }
    // The account can also be a string (summoner name) if args[0] is not a number.
    // riotApiService.handleStreak should be designed to handle number or string.
    // If args[0] exists and is not a number, it could be a summoner name.
    else if (args.length > 0 && typeof args[0] === 'string') {
        account = args[0]; 
    }


    if (riotApiService && typeof riotApiService.handleStreak === 'function') {
        await riotApiService.handleStreak(twitchClient, channel, account);
    } else {
        console.error('Riot API service or handleStreak not available.');
        twitchClient.say(channel, "Sorry, the streak command is currently unavailable.");
    }
}

module.exports = {
    name: 'streak',
    description: 'Displays the current game streak for Bibou or specified account.',
    execute
};
