// src/commands/hello.js
async function execute(twitchClient, channel, userstate, args, services) {
    twitchClient.say(channel, `Hello @${userstate['display-name']}!`);
}

module.exports = {
    name: 'hello',
    description: 'Greets the user.',
    execute
};
