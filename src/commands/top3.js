// src/commands/top3.js
async function execute(twitchClient, channel, userstate, args, { mongoDbService }) {
    if (!mongoDbService || typeof mongoDbService.getChannelPoints !== 'function') {
        twitchClient.say(channel, "Désolé, le service de points est actuellement indisponible.");
        return;
    }
    try {
        // getChannelPoints without arguments returns all users, sorted.
        const allUsers = await mongoDbService.getChannelPoints(); 
        
        if (!allUsers || allUsers.length === 0) {
            twitchClient.say(channel, "Pas encore de données pour le top 3. Soyez les premiers !");
            return;
        }
        
        // Filter out the bot's own account if it might appear in points.
        // Assuming twitchClient.getUsername() returns the bot's username in lowercase.
        const botUsername = twitchClient.getUsername().toLowerCase(); 
        const filteredUsers = allUsers.filter(user => user.username.toLowerCase() !== botUsername);

        let topUsersMessage = 'Top 3 des viewers: ';
        const count = Math.min(filteredUsers.length, 3);

        if (count === 0) {
             topUsersMessage = "Personne n'a de points pour le moment (en dehors du bot peut-être) !";
        } else {
            for (let i = 0; i < count; i++) {
                // Use displayName if available and different, otherwise username
                const nameToDisplay = filteredUsers[i].displayName || filteredUsers[i].username;
                topUsersMessage += `${i + 1}. ${nameToDisplay} (${filteredUsers[i].points} points) `;
            }
        }
        twitchClient.say(channel, topUsersMessage.trim());
    } catch (error) {
        console.error("Error fetching top3:", error);
        twitchClient.say(channel, "Une erreur est survenue en récupérant le top 3.");
    }
}

module.exports = {
    name: 'top3',
    description: 'Displays the top 3 viewers by points.',
    execute
};
