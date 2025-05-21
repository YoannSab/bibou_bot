// src/botSettings.js

let settings = {
    allowMusic: true,
    guessGameDelay: 60 * 1000, // Default delay for the guessing game in milliseconds
    // Add other runtime settings here
};

function isMusicAllowed() {
    return settings.allowMusic;
}

function setMusicAllowed(allowed) {
    if (typeof allowed === 'boolean') {
        settings.allowMusic = allowed;
        console.log(`Music requests allowed status set to: ${allowed}`);
    } else {
        console.warn("setMusicAllowed expects a boolean value.");
    }
}

function getGuessGameDelay() {
    return settings.guessGameDelay;
}

function setGuessGameDelay(delayMs) {
    if (typeof delayMs === 'number' && delayMs > 0) {
        settings.guessGameDelay = delayMs;
        console.log(`Guess game delay set to: ${delayMs}ms`);
    } else {
        console.warn("setGuessGameDelay expects a positive number value for milliseconds.");
    }
}

module.exports = {
    isMusicAllowed,
    setMusicAllowed,
    getGuessGameDelay,
    setGuessGameDelay,
    // Export a getter for all settings if needed for display or debugging
    // getSettings: () => ({ ...settings }) 
};
