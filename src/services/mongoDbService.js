// src/services/mongoDbService.js
const { MongoClient, ObjectId } = require('mongodb');
const config = require('../config/config.js');

let db;
let channelPointsCollection;
let userCollection; // This will be used by other services/modules later

async function connectToMongoDB() {
    if (db && channelPointsCollection && userCollection) {
        console.log("MongoDB connection already established.");
        return;
    }
    try {
        const client = new MongoClient(config.mongoDB.uri);
        await client.connect();
        db = client.db('biboubot_bd'); // Database name from original index.js
        channelPointsCollection = db.collection('channel_points');
        userCollection = db.collection('user'); 
        console.log("Successfully connected to MongoDB and initialized collections.");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        // Application might not work correctly if DB connection fails.
        // Consider re-throwing the error or using a retry mechanism.
        throw error; // Re-throw to indicate failure to the calling context if any
    }
}

// Establish connection when the module is loaded.
// We wrap this in an immediately invoked function expression (IIFE) to handle the async nature.
(async () => {
    try {
        await connectToMongoDB();
    } catch (error) {
        console.error("MongoDB initial connection failed. Service might not be operational.", error);
        // Exit or retry as per application requirements
    }
})();

// Function to get all channel points or a specific user's points and rank
async function getChannelPoints(username = "") {
    if (!channelPointsCollection) {
        console.error("getChannelPoints: MongoDB not connected.");
        throw new Error("MongoDB not connected");
    }
    try {
        // Query to get all documents in the collection except the username "bibou_bot" and sort them by points
        const allUsersSorted = await channelPointsCollection.find({ username: { $ne: "bibou_bot" } }).sort({ points: -1 }).toArray();
        
        if (username && username !== "") {
            const user = await channelPointsCollection.findOne({ username: username });
            if (user) {
                const index = allUsersSorted.findIndex(doc => doc.username === user.username);
                return { user, rank: index + 1, totalUsers: allUsersSorted.length }; // Return user, their rank, and total users
            } else {
                // If user not found, they have 0 points and are unranked (or last rank + 1)
                return { user: { username: username, points: 0 }, rank: allUsersSorted.length + 1, totalUsers: allUsersSorted.length };
            }
        }
        return allUsersSorted; // Return all users if no specific username is provided
    } catch (err) {
        console.error("Error in getChannelPoints:", err);
        throw err;
    }
}

// Function to give points to a target user
async function givePoints(targetUsername, pointsAmount) {
    if (!channelPointsCollection) {
        console.error("givePoints: MongoDB not connected.");
        throw new Error("MongoDB not connected");
    }
    try {
        // Find the target user
        const user = await channelPointsCollection.findOne({ username: targetUsername });

        // If the user doesn't exist, create them with 0 points
        if (!user) {
            await channelPointsCollection.insertOne({ username: targetUsername, points: 0 });
        }

        // Update the target user's points
        const result = await channelPointsCollection.updateOne(
            { username: targetUsername },
            { $inc: { points: pointsAmount } }
        );
        
        // console.log(`Updated ${result.modifiedCount} document(s) for user ${targetUsername}.`);
        return result;
    } catch (err) {
        console.error(`Error in givePoints for ${targetUsername}:`, err);
        throw err;
    }
}

// Function to get a specific user's points
async function getPoints(username) {
    if (!channelPointsCollection) {
        console.error("getPoints: MongoDB not connected.");
        throw new Error("MongoDB not connected");
    }
    try {
        const user = await channelPointsCollection.findOne({ username: username });
        if (!user) {
            // If user doesn't exist, create them with 0 points and return 0
            await channelPointsCollection.insertOne({ username: username, points: 0 });
            return 0;
        }
        return user.points;
    } catch (err) {
        console.error(`Error in getPoints for ${username}:`, err);
        throw err; // Re-throw the error to be handled by the caller
    }
}

// Export public functions
module.exports = {
    connectToMongoDB, // Exporting connect function might be useful for re-connection attempts or for tests
    getChannelPoints,
    givePoints,
    getPoints,
    // Getter for collections if needed by other modules, though direct operations are preferred via service methods
    getChannelPointsCollection: () => channelPointsCollection,
    getUserCollection: () => userCollection 
};
