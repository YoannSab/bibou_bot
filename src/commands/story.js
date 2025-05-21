// src/commands/story.js
async function execute(twitchClient, channel, userstate, args, { riotApiService }) {
    const championName = args.join(' ').trim();
    if (!championName) {
        twitchClient.say(channel, `Veuillez entrer un nom de champion. Exemple: !story Kayn`);
        return;
    }

    if (riotApiService && typeof riotApiService.getChampionStory === 'function') {
        const story = await riotApiService.getChampionStory(championName);
        twitchClient.say(channel, story);
    } else {
        console.error('Riot API service or getChampionStory not available.');
        twitchClient.say(channel, "Sorry, the story command is currently unavailable.");
    }
}

module.exports = {
    name: 'story',
    description: 'Tells a short story (blurb) of a League of Legends champion.',
    execute
};
