// src/web/server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const path = require('path');
const ejs = require('ejs');
const crypto = require('crypto'); // For generating session secret

const config = require('../config/config.js');
// mongoDbService is called to ensure connection is attempted when module loads.
// We will get the collection via the exported getter.
const mongoDbService = require('../services/mongoDbService.js'); 
const { ObjectId } = require('mongodb'); // For deserializeUser

const app = express();

// Middleware Setup
app.engine('.html', ejs.renderFile); 
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, '../../public'));
app.use(express.static(path.join(__dirname, '../../public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Setup
const sessionSecret = config.server.sessionSecret || crypto.randomBytes(32).toString('hex');
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: process.env.NODE_ENV === 'production' } // Example for HTTPS
}));

// Passport.js Setup
app.use(passport.initialize());
app.use(passport.session());

// Passport LocalStrategy
passport.use(new LocalStrategy(
    async function(username, password, done) {
        const userCollection = mongoDbService.getUserCollection();
        if (!userCollection) {
            return done(new Error('User collection not available. MongoDB might not be connected.'));
        }
        try {
            const user = await userCollection.findOne({ username: username });
            if (!user) {
                console.log('User not found:', username);
                return done(null, false, { message: 'User not found.' });
            }
            // IMPORTANT: Plain text password comparison is insecure! 
            // This is from the original code. In a real app, hash passwords.
            if (user.password !== password) { 
                console.log('Incorrect password for user:', username);
                return done(null, false, { message: 'Incorrect password.' });
            }
            console.log('User authenticated successfully:', username);
            return done(null, user);
        } catch (err) {
            console.error('Error in LocalStrategy:', err);
            return done(err);
        }
    }
));

// Passport Serialization
passport.serializeUser(function (user, done) {
    done(null, user._id); // Store only the user ID in the session
});

// Passport Deserialization
passport.deserializeUser(async function (id, done) {
    const userCollection = mongoDbService.getUserCollection();
    if (!userCollection) {
        return done(new Error('User collection not available for deserialization.'));
    }
    try {
        const user = await userCollection.findOne({ _id: new ObjectId(id) });
        if (!user) {
            return done(null, false); // User not found
        }
        done(null, user); // User found, attach to req.user
    } catch (err) {
        done(err);
    }
});

// Function to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).render('login', { error: "Vous n'êtes pas autorisé à accéder à cette ressource. Veuillez vous connecter."});
}

// Cache control middleware (from original index.js)
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Function to start the server
async function startServer() {
    try {
        // Ensure MongoDB is connected before starting the server fully
        await mongoDbService.connectToMongoDB(); // Ensure connection is ready
        app.listen(config.server.port, () => {
            console.log(`Server is listening on port ${config.server.port}`);
        });
    } catch (error) {
        console.error("Failed to start server due to MongoDB connection issues:", error);
        process.exit(1); // Exit if critical services like DB are not available
    }
}

module.exports = {
    app,
    startServer,
    isAuthenticated, 
    passport, // Export passport if it's needed by other parts like test setups or specific route configurations
};
