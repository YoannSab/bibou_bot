//imports
const tmi = require('tmi.js');
const cheerio = require('cheerio');
const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const bodyParser = require('body-parser');
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//data
const BibouSummonerName = "chill falls1";

const champFile = fs.readFileSync('./champ.json');
const championsList = JSON.parse(champFile);
const championNamesFile = fs.readFileSync('./championNames.json');
const championNamesMatch = JSON.parse(championNamesFile);
var phraseGG = JSON.parse(fs.readFileSync('./gg.json'));
phraseGG = phraseGG.map(function (x) { return x.replace(/Bibou/g, '[]'); });
var champToGuess = {};
var giveaway = { active: false, participants: new Set(), winner: "", motclé: "" };
var votes = { active: false};
var prediction = { active: false, participants: [], totWin: 0, totLoss: 0 };
const phraseLow = JSON.parse(fs.readFileSync('./clash.json'));
// Dictionnaire des émoticônes
const emoticons = {
    Kappa: 'Kappa',
    PogChamp: 'PogChamp',
    LUL: 'LUL',
    BibleThump: 'BibleThump',
    Kreygasm: 'Kreygasm',
    TriHard: 'TriHard',
};
var winrate = {};
var winrateDelay = 0//1000 * 60 * 2;
var lastWinrate = 0;

//paramètres
var allow_music = false;
var lastGuess = 0;
var guessDelay = 60 * 1000;
//cost and rewards
var hintCost = 10;
var lowCost = 10;
var guessReward = 20;
var coachingCost = 3000;
var oneVOneCost = 2000;
var oneVOneReward = 300;
var skipsongCost = 30;
var reviewOPGGCost = 150;
var skinCost = 30;
var songrequestCost = 30;
//credentials


const username = process.env.TWITCH_USERNAME;
const password = process.env.TWITCH_OAUTH;
const riotApiKey = process.env.RIOT_API_KEY;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI;
const mongedb_username = process.env.MONGODB_USERNAME;
const mongodb_password = process.env.MONGODB_PASSWORD;


// const keys = JSON.parse(fs.readFileSync('../keys.json', 'utf8'));
// const username = keys.twitch_username;
// const password = keys.twitch_oauth;
// const riotApiKey = keys.riot_api_key;
// const spotifyClientId = keys.spotify_client_id;
// const spotifyClientSecret = keys.spotify_client_secret;
// const spotifyRedirectUri = keys.spotify_redirect_uri;
// const mongedb_username = keys.mongodb_username;
// const mongodb_password = keys.mongodb_password;



//options de connexion
const options = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
    },
    identity: {
        username: username,
        password: password,
    },
    channels: [
        'Bibou_LoL',
    ],
};
//client tmi
const client = new tmi.Client(options);
async function connect() {
    try {
        await client.connect();
    }
    catch (err) {
        console.log(err);
    }
}

// Tes identifiants Spotify
const spotifyApi = new SpotifyWebApi({
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: spotifyRedirectUri,
});

// Authentification à l'API Spotify
spotifyApi.clientCredentialsGrant()
    .then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
    })
    .catch(err => {
        console.error('Erreur lors de la récupération du jeton d\'accès Spotify :', err);
    });

/******************************************* */
/************CONNEXION MONGODB************** */
/******************************************* */
const uri = `mongodb+srv://${mongedb_username}:${mongodb_password}@biboubot.kdbhjnu.mongodb.net/?retryWrites=true&w=majority`;
const clientmongo = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
var collection;
var db;
var userDB;
try {
    clientmongo.connect();
    // Select the database and collection
    db = clientmongo.db('biboubot_bd'); // Replace 'test_db' with your database name
    collection = db.collection('channel_points'); // Replace 'test_collection' with your collection name
    console.log("Connected to MongoDB");
    userDB = db.collection('user');
} catch (e) {
    console.error(e);
}
/******************************************* */
/************FIN CONNEXION MONGODB*********** */
/******************************************* */

/**************************************** */
/************SERVEUR********************* */
/**************************************** */

passport.use(new LocalStrategy(
    async function(username, password, done) {
        try {
            const user = await userDB.findOne({ username: username });
            if (!user) {
                console.log('User not found');
                return done(null, false);
            }
            if (user.password != password) {
                console.log('Incorrect password');
                return done(null, false);
            }
            console.log('User authenticated successfully');
            return done(null, user);
        } catch (err) {
            console.error('Error:', err);
            return done(err);
        }
    }
));


// Configuration du serveur Web pour gérer l'authentification OAuth
const app = express();
const session = require('express-session');
const crypto = require('crypto');
app.engine('.html', require('ejs').renderFile); // Use EJS to render HTML files, for example
app.set('public engine', 'html'); // Use the .html extension for views


const secret = crypto.randomBytes(32).toString('hex');

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

const ObjectId = require('mongodb').ObjectId;
passport.deserializeUser(async function (id, done) {
    const user  = await userDB.findOne({ _id: new ObjectId(id) });
    if(!user) {
        return done(null, false);
    }
    done(null, user);
    });

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public')
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('index', { authenticated: true, username: req.user.username });
    } else {
        res.render('index', { authenticated: false });
    }
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.status(401).send("Vous n'êtes pas autorisé à accéder à cette ressource.");
    }
  }  

app.post('/api/setDelay', isAuthenticated, (req, res) => {
    guessDelay = req.body.delay * 1000;
    res.send(JSON.stringify({ message: 'Delay set to ' + req.body.delay + ' seconds' }));
    try{
        client.action('bibou_LoL', 'Le délai entre deux devinettes est maintenant de ' + req.body.delay + ' secondes');
    }catch(e){
        console.log(e);
    }
});
app.get('/connect', isAuthenticated, (req, res) => {
    try{
        // if not connected, connect
        client.connect();
    }catch(e){
        console.log(e);
    }
});
app.get('/home', (req, res) => {
    res.render('home.html');
});

app.get('/api/allowMusic', isAuthenticated, (req, res) => {
    try{
        allow_music = true;
        res.send(JSON.stringify('Music allowed'));
        //client.action('bibou_LoL', 'Ajout de musique autorisé');
    }catch(e){
        console.log(e);
    }
});
app.get('/api/denyMusic', isAuthenticated, (req, res) => {
    try{
        allow_music = false;
        res.send(JSON.stringify('Music denied'));
        client.action('bibou_LoL', 'Ajout de musique interdit');
    }catch(e){
        console.log(e);
    }
});
app.get('/api/giveaway', isAuthenticated, (req, res) => {
    try{
        res.send(JSON.stringify({ participants: Array.from(giveaway.participants), winner: giveaway.winner }));
    }catch(e){
        console.log(e);
    }
});

app.get('/login-spotify', isAuthenticated,  (req, res) => {
    try{
        const scopes = [
            'user-read-private',
            'user-read-email',
            'user-read-playback-state',
            'user-modify-playback-state',
            'app-remote-control', // Ajoutez cette ligne pour la portée app-remote-control
            'playlist-modify-public',
            'playlist-modify-private'
        ];
        const state = 'some-state';

        res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
    }catch(e){
        console.log(e);
    }
});
app.get('/api/resetWinrate', isAuthenticated, (req, res) => {
    try{
        winrate = {};
        res.send(JSON.stringify('Winrate reset'));
    }catch(e){
        console.log(e);
    }
}
);
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        res.send('Authentification réussie. Tu peux fermer cette fenêtre.');
    } catch (err) {
        console.error('Erreur lors de l\'authentification Spotify :', err);
        res.send('Erreur lors de l\'authentification Spotify.');
    }
});


app.get('/login', function (req, res) {
    res.render('login.html');
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            req.session.save(() => {
                res.redirect('/');
            });
        });
    })(req, res, next);
});

app.get('/api/get_channel_points' , async (req, res) => {
    try {
      const username = req.query.username || "";
      const channelPoints = await getChannelPoints(username);
      res.send(JSON.stringify(channelPoints));
    } catch(e) {
      console.error(e);
      res.status(500).send('Error while retrieving channel points.');
    }
  });
  

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
app.get('/rules', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('rules', { authenticated: true, username: req.user.username });
    } else {
        res.render('rules', { authenticated: false });
    }
});
app.get('/modo', function (req, res) {
    if(req.isAuthenticated()){
        res.render('modo', { authenticated: true, username: req.user.username });
    }else{
        res.redirect('/login');
    }
    
});
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


app.listen(process.env.PORT || 8888, () => {
    console.log('Le serveur est à l\'écoute sur le port 8888.');
});

/******************************************* */
/************FIN SERVEUR********************* */
/******************************************* */





/************************************ */
/**************BOT******************* */
/************************************ */
var commandList = ["elo", "twitter", "lolpro", "opgg", "music", "hello", "winrate", 
                    "songrequest", "low", "love", "guess", "streak", "giveaway", 
                    "prediction", "bet", "result", "skipsong", "enablemusic", "disablemusic",
                    "soloq", "setdelay", "points", "gift", "biboudb", "onevone", "reviewopgg",
                    "coaching", "skin", "vote", "top3", "infos", "hint", "try", "abandon", "story", "twitter"
                ];
client.on('message', async (channel, userstate, message, self) => {
    if (self) return;

    if (giveaway.active && message.toLowerCase() === giveaway.motclé.toLowerCase()) {
        giveaway.participants.add(userstate['display-name']);
    }

    if (message.charAt(0) === '!') {
        const { command, args } = parseCommand(message);
        console.log(command, args);
        if (! commandList.includes(command)) {
            return;
        }
        switch (command) {
            case 'giveaway':
                await handleGiveaway(channel, userstate, args[0]);
                break;
            case 'gg':
                var name = message.substring("!gg".length).trim();
                if (name === "") name = "Bibou";
                client.say(channel, phraseGG[Math.floor(Math.random() * phraseGG.length)].replace("[]", name));
                break;
            case 'winrate':
                await handleWinrate(channel, message);
                break;
          
            case 'music':
                spotifyApi.getMyCurrentPlaybackState()
                    .then(data => {
                        if (!data.body.is_playing) {
                            client.say(channel, 'Aucune musique en cours de lecture.');
                            return;
                        }

                        const trackName = data.body.item.name;
                        const artists = data.body.item.artists.map(artist => artist.name).join(', ');

                        client.say(channel, `La musique en cours de lecture est "${trackName}" par ${artists}.`);
                    })
                    .catch(err => {
                        //console.error('Erreur lors de la récupération des informations sur la musique en cours de lecture :', err);
                        //client.say(channel, 'Bibou a oublié de se connecter à Spotify !');
                    });
                break;

            case 'low':
                var points = 100000 //await getPoints(userstate.username);
                var name = message.substring("!low".length).trim();
                if (name.startsWith("@")) {
                    if (points < lowCost) {
                        client.say(channel, `@${userstate.username} n'a pas assez de points pour faire ça`);
                    } else {
                        client.say(channel, `Yo ${name}, ${phraseLow[Math.floor(Math.random() * phraseLow.length)]}`);
                        // await givePoints(userstate.username, -lowCost);
                        // await givePoints(name.slice(1).toLowerCase(), -lowCost);
                        //client.say(channel, `Pour s'être fait low, ${name} a perdu ${lowCost} points`);
                    }
                } else {
                    client.say(channel, `Yo ${name}, ${phraseLow[Math.floor(Math.random() * phraseLow.length)]}`);
                }
                break;
            case 'songrequest':
                if (allow_music) {
                    const query = message.substring('!songrequest'.length).trim();
                    var points = 100000 //await getPoints(userstate.username);
                    /*
                    if (points < songrequestCost) {
                        //client.say(channel, `Il te manque ${songrequestCost - points} points pour faire ça !`);
                    }
                    */
                
                    if (query.length > 0) {
                        await searchAndQueueSong(query, channel);
                        //await givePoints(userstate.username, -songrequestCost);
                    } else {
                        client.say(channel, 'Veuillez fournir une requête pour la recherche de chansons. Exemple: !songrequest The Beatles');
                    }
                    
                } else {
                    client.say(channel, 'Ajout de musique interdit');
                }
                break;
            case 'guess':
                //choose a random key from champions json
                //allow guess after 30 seconds
                var currentTime = new Date().getTime();
                if (currentTime - lastGuess < guessDelay) {
                    client.say(channel, `Veuillez attendre ${Math.floor((guessDelay - (currentTime - lastGuess)) / 1000)} secondes avant de rejouer`);
                } else {
                    lastGuess = currentTime;
                    const randomChampion = Object.keys(championsList)[Math.floor(Math.random() * Object.keys(championsList).length)];
                    //client.say(channel, `Trouvez le champion ! \n Pour proposer, tapez !try (champion). \n Pour avoir un indice, tapez !hint. Pour abandonner, tapez !abandon \n`);
                    client.say(channel, `-> ${championsList[randomChampion].slice(0, 2)}`);
                    champToGuess = {};
                    champToGuess["name"] = randomChampion;
                    champToGuess["hint"] = 0;
                }
                break;
            case 'hint':
                await handleHint(channel, userstate.username);

                break;
            case 'try':
                await handleTry(channel, userstate, message);
                break;
            case 'abandon':
                if (Object.keys(champToGuess).length !== 0) {
                    client.say(channel, `Le champion à deviner était ${champToGuess["name"]} !`);
                    champToGuess = {};
                } else {
                    //client.say(channel, `Aucun jeu en cours`);
                }
                break;
            case 'streak':
                var account;
                if(isNaN(args[0])){
                    account = 0
                }else{
                    account = parseInt(args[0])
                }
                await handleStreak(channel, account);

                break;
            case 'elo':
                await handleElo(channel);
                break;
            case 'twitter':
                client.say(channel, `Check le twitter de Bibou : https://twitter.com/Bibou_euw`);
                break;
            case 'lolpro':
                client.say(channel, `Check le lol pro de Bibou : https://lolpros.gg/player/bibou`);
                break;
            case 'opgg':
                client.say(channel, `Check l'opgg de Bibou : https://www.op.gg/summoners/euw/chill%20falls1-ADGAP`);
                break;
            case 'love':
                try {
                    const value = Math.floor(Math.random() * 100);
                    var other = args;
                    if (other.length === 0) {
                        client.say(channel, `${userstate['display-name']} aime @Bibou_LoL à ${value}% ${emoticons.Kappa}`);
                    } else {
                        other = other.join(' ');
                        if (other.startsWith("@")) {
                            if (other.slice(1).toLowerCase() == userstate.username) {
                                //client.say(channel, `Tu peux pas t'aimer toi même ${emoticons.Kappa}`)
                            } else {
                                client.say(channel, `${userstate['display-name']} aime ${other} à ${value}% ${emoticons.Kappa}`);
                                //client.say(channel, `Etant aimé, ${other} reçoit ${Math.floor(value / 20)} points ${emoticons.Kappa}`)
                                //await givePoints(other.slice(1).toLowerCase(), Math.floor(value / 20));
                            }
                        } else {
                            client.say(channel, `${userstate['display-name']} aime ${other} à ${value}% ${emoticons.Kappa}`);
                        }
                    }

                } catch (e) {
                    console.log(e);
                    client.say(channel, `Une erreur est survenue ${emoticons.Kappa}`);
                }
                break;
            case 'infos' || 'help':
                client.say(channel, 'Commandes disponibles : !elo, !twitter, !skin <nom du champ>, !lolpro, !opgg, !music, !hello, !winrate champion/championadverse (opt) !songrequest (nom de la chanson), !low @qqun, !game, !love (nom de la personne), !guess, !streak');
                break;
            case 'game':
                await handleGame(channel, message);
                break;
            case 'skin':
                if (!votes.active) {
                    var championName = message.substring('!skin'.length).trim();
                    if (championName.length === 0) {
                        client.say(channel, `Veuillez entrer un nom de champion.`);
                    } else {   
                        await handleSkin(channel, championName, userstate);
                    }
                } else {
                    //client.say(channel, `Un vote est en cours, c'est ${votes.voter} qui décide du skin.`);
                }
                break;
            case 'vote':
                if (votes.active) {
                    /*
                    if (userstate.username === votes.voter) {
                        const vote = parseInt(message.substring('!vote'.length).trim());
                        if (vote > 0) {
                            if (votes[vote]) {
                                votes[vote] += 1;
                            } else {
                                votes[vote] = 1;
                            }
                            return;
                        }
                    }*/
                    var vote;
                    try{
                        vote = parseInt(args[0]);
                    }catch(err){
                        vote = 1;
                    }
                    if (vote > 0) {
                        if (votes[vote]) {
                            votes[vote] += 1;
                        } else {
                            votes[vote] = 1;
                        }
                    } else {
                        client.say(channel, `Veuillez entrer un numéro de skin valide.`);
                    }
                    
                } else {
                    client.say(channel, `Il n'y a pas de vote en cours.`);
                }

                break;
            case 'skipsong':
                // try {
                //     var points = await getPoints(userstate.username);
                //     if (points >= skipsongCost) {
                //         await spotifyApi.skipToNext();
                //         await givePoints(userstate.username, -skipsongCost);
                //         client.say(channel, `La chanson a été passée.`);
                //     } else {
                //         client.say(channel, `Il vous manque ${skipsongCost - points} points pour passer la chanson.`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors du passage de la chanson.`);
                // }

                break;
            case 'enablemusic':
                if (userstate.mod) {
                    allow_music = true;
                    client.say(channel, `La mise en file d'attente de la musique est activée.`);
                } else {
                    client.say(channel, `Seul les modérateurs peuvent activer la musique.`);
                }
                break;
            case 'disablemusic':
                if (userstate.mod) {
                    allow_music = false;
                    client.say(channel, `La mise en file d'attente de la  musique est désactivée.`);
                } else {
                    client.say(channel, `Seul les modérateurs peuvent désactiver la musique.`);
                }
                break;
            case 'soloq':
                // try {
                //     client.say(channel, "Classement complet : https://soloqchallenge.fr/");
                //     [top3, bibou] = await getSoloQChallengeInfos();
                //     const message = top3.map((player, index) => {
                //         return `#${index + 1} ${player.name}/${player.elo}/(${player.victories}W/${player.defeats}L)`;
                //     }).join(", ");

                //     const streak = await getMatchHistory("Michıkatsu");
                //     client.say(channel, `TOP 3 du SOLOQ :     ${message}`);
                //     client.say(channel, `BIBOU  #${bibou.rank}/ ${bibou.elo}/(${bibou.victories}W/${bibou.defeats}L) -> ${streak}`);

                // } catch (error) {
                //     console.error(error);
                //     //client.say(channel, `Il y a eu un problème lors de la récupération des informations du soloqchallenge.`);
                    
                // }
                break;
            case 'setdelay':
                if (userstate.mod) {
                    const delay = parseInt(args[0]);
                    if (delay > 0) {
                        guessDelay = delay;
                        client.say(channel, `Le délai de réponse est maintenant de ${delay} secondes.`);
                    } else {
                        client.say(channel, `Veuillez entrer un délai valide.`);
                    }
                } else {
                    client.say(channel, `Seul les modérateurs peuvent changer le délai de jeu.`);
                }
                break;
            case 'points':
                // try {
                //     var points = await getPoints(userstate.username);
                //     client.say(channel, `@${userstate['display-name']} a ${points} points.`);
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;
            case 'gift':
                // if (args.length === 2 && !isNaN(args[1])) {
                //     try {
                //         var userPoints = await getPoints(userstate.username);
                //         if (parseInt(args[1]) <= 0) {
                //             client.say(channel, `Veuillez entrer un nombre positif.`);
                //             break;
                //         } else if (parseInt(args[1]) > userPoints) {
                //             client.say(channel, `Vous n'avez pas assez de points.`);
                //             break;
                //         } else {
                //             let other;
                //             args[0].charAt(0) === '@' ? other = args[0].substring(1) : other = args[0]
                //             await givePoints(other.toLowerCase(), parseInt(args[1]));
                //             await givePoints(userstate.username, -parseInt(args[1]));
                //             client.say(channel, `@${userstate['display-name']} a donné ${args[1]} points à @${other}.`);
                //         }
                //     } catch (error) {
                //         console.error(error);
                //         client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                //     }
                // } else {
                //     client.say(channel, `Veuillez entrer la commande gift <nom> <nombrePts>.`);
                // }
                break;
            case 'biboudb':
                // if (userstate.mod) {
                //     try {
                //         var fetchedDocuments = await collection.find({}).toArray();
                //         console.log('Fetched documents:', fetchedDocuments);
                //     } catch (error) {
                //         console.error(error);
                //     }
                // } else {
                //     client.say(channel, `Seul les modérateurs peuvent accéder à la base de données.`);
                // }
                break;
            case 'onevone':
                // try {
                //     var points = await getPoints(userstate.username);
                //     if (points >= oneVOneCost) {
                //         client.say(channel, `${userstate['display-name']} a défié @Bibou_LoL pour un 1v1 ! Le combat aura lieu à la fin de la game !`);
                //         await givePoints(userstate.username, -oneVOneCost);
                //     } else {
                //         client.say(channel, `Il te manque ${oneVOneCost - points} points pour pouvoir défier Bibou. Perds pas espoir !`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;
            case 'reviewopgg':
                // try {
                //     var points = await getPoints(userstate.username);
                //     if (points >= reviewOPGGCost) {
                //         client.say(channel, `@{userstate['display-name']} a demandé une review de son opgg !`);
                //         await givePoints(userstate.username, -reviewOPGGCost);
                //     } else {
                //         client.say(channel, `Il te manque ${reviewOPGGCost - points} points pour pouvoir demander une review de ton opgg. Continue de stacker !`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;
            case 'coaching':
                // try {
                //     var points = await getPoints(userstate.username);
                //     if (points >= coachingCost) {
                //         client.say(channel, `${userstate['display-name']} a demandé un coaching ! Ce sera chose faite !`);
                //         await givePoints(userstate.username, -coachingCost);
                //     } else {
                //         client.say(channel, `Il te manque ${coachingCost - points} points pour pouvoir demander un coaching. Tqt ça va le faire !`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;
            case 'prediction':
                // if (userstate.mod) {
                //     client.say(channel, "Une prédictions a été lancée ! Pour participer, tapez !bet <win/loose> <nombrePts> !");
                //     prediction.active = true;
                // } else {
                //     client.say(channel, `Seul les modérateurs peuvent lancer une prédictions.`);
                // }
                break;
            case "stopprediction":
                // try {
                //     if (userstate.mod) {

                //         client.say(channel, "Allez, on arrête de prédire, c'est enregistré !");
                //         prediction.active = false;
                //     } else {
                //         client.say(channel, `Seul les modérateurs peuvent stopper une prédictions.`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;
            case 'bet':
                // if (prediction.active) {
                //     if (args.length === 2 && !isNaN(args[1]) && (args[0] === 'win' || args[0] === 'loose' || args[0] === 'lose')) {
                //         try {
                //             var userPoints = await getPoints(userstate.username);
                //             if (parseInt(args[1]) <= 0) {
                //                 client.say(channel, `Veuillez entrer un nombre positif ${userstate['display-name']}.`);
                //                 break;
                //             } else if (parseInt(args[1]) > userPoints) {
                //                 client.say(channel, `Vous n'avez pas assez de points ${userstate["display-name"]}.`);
                //                 break;
                //             } else {
                //                 if (args[0] === 'win') {
                //                     prediction.totWin += parseInt(args[1]);
                //                     if (prediction.participants.find(participant => participant.username === userstate.username)) {
                //                         prediction.participants.find(participant => participant.username === userstate.username).bet += parseInt(args[1]);
                //                     } else {
                //                         prediction.participants.push({ username: userstate.username, bet: parseInt(args[1]), win: true });
                //                     }
                //                 } else if (args[0] === 'loose') {
                //                     prediction.totLoss += parseInt(args[1]);
                //                     if (prediction.participants.find(participant => participant.username === userstate.username)) {
                //                         prediction.participants.find(participant => participant.username === userstate.username).bet += parseInt(args[1]);
                //                     } else {
                //                         prediction.participants.push({ username: userstate.username, bet: parseInt(args[1]), win: false });
                //                     }
                //                 }
                //             }
                //         } catch (error) {
                //             console.error(error);
                //             client.say(channel, `Il y a eu un problème lors du bet.`);
                //         }
                //     } else {
                //         client.say(channel, `Veuillez entrer la commande !bet <win/loose> <nombrePts>.`);
                //     }
                // } else {
                //     client.say(channel, `Il n'y a pas de prédictions en cours.`);
                // }
                break;
            case 'result':
                // try {
                //     if (userstate.mod) {
                //         console.log(prediction)
                //         if (args.length === 1 && (args[0] === 'win' || args[0] === 'loose')) {
                //             prediction.active = false;
                //             var win = args[0] === 'win';
                //             prediction["winOdds"] = prediction.totLoss === 0 ? 1 : prediction.totWin / prediction.totLoss;
                //             prediction["looseOdds"] = prediction.totWin === 0 ? 1 : prediction.totLoss / prediction.totWin;
                //             for (let i = 0; i < prediction.participants.length; i++) {
                //                 if (prediction.participants[i].win === win) {
                //                     let amount = prediction.participants[i].bet * (win ? prediction.looseOdds : prediction.winOdds);
                //                     await givePoints(prediction.participants[i].username, amount);
                //                 } else {
                //                     await givePoints(prediction.participants[i].username, -prediction.participants[i].bet);
                //                 }
                //             }
                //             prediction.totWin = 0;
                //             prediction.totLoss = 0;
                //             prediction.participants = [];
                //         } else {
                //             client.say(channel, `Veuillez entrer la commande !result <win/loose>.`);
                //         }
                //     } else {
                //         client.say(channel, `Seul les modérateurs peuvent stopper une prédictions.`);
                //     }
                // } catch (error) {
                //     console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }

                break;
            case 'top3':
                // try {
                //     // Get the top 3 users with the most points
                //     const topThreeUsers = await collection.find().sort({ points: -1 }).limit(4).toArray();

                //     // Print the top 3 users and their points

                //     message = 'Top 3 des viewers:';
                //     // ignore the first user because it's the bot
                //     for (let i = 1; i < topThreeUsers.length; i++) {
                //         message += ` ${i}. ${topThreeUsers[i].username} (${topThreeUsers[i].points} points)`;
                //     }
                //     client.say(channel, message);
                // } catch (error) {
                //     //console.error(error);
                //     client.say(channel, `Il y a eu un problème lors de la récupération des points.`);
                // }
                break;

            default:
                var commands = ["!elo", "!twitter", "!lolpro", "!opgg", "!music", "!songrequest", "!factlol", "!infos", "!low", "!game", "!idee", "!love", "!story", "!guess", "!streak", "!winrate", "!skipsong", "!skin", "!vote", "!guess", "!hint", "!abandon", "!soloq", "!giveaway", "!points", "!soloq", "!prediction", "!bet", "!result", "!top3"];
                // compute proximity of the command to the commands in the array with my function
                var proximity = commands.map(function (comm) {
                    return jaroWinklerDistance(comm, message);
                });
                // find the index of the command with the highest proximity
                var index = proximity.indexOf(Math.max.apply(null, proximity));
                // get the command with the highest proximity
                var closestCommand = commands[index];
                client.say(channel, `Commande inconnue, voulez-vous dire ${closestCommand} ?`);

                break;
        }
    }

    await givePoints(userstate.username, 1);

    // Fetch documents
});

client.on('connected', (address, port) => {
    client.action("bibou_lol", "*** Je suis connecté ! ***");
});
client.on('disconnected', (reason) => {
    client.action("bibou_lol", "Je suis déconnecté !");
});
client.on('subscription', (channel, username, method, message, userstate) => {
    client.action("bibou_lol", `Merci ${username} pour l'abonnement !`);
});
client.on('resub', (channel, username, months, message, userstate, methods) => {
    client.action("bibou_lol", `Merci ${username} pour le ${months}ème mois d'abonnement !`);
});
client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
    client.action("bibou_lol", `Merci ${username} pour l'abonnement offert à ${recipient} !`);
});
client.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => {
    client.action("bibou_lol", `Merci ${username} pour les ${numbOfSubs} abonnements offerts !`);
});
client.on('cheer', (channel, userstate, message) => {
    client.action("bibou_lol", `Merci ${userstate["display-name"]} pour le ${userstate.bits} bits !`);
});
client.on('raided', (channel, username, viewers) => {
    client.action("bibou_lol", `Merci ${username} pour le raid de ${viewers} viewers !`);
});
client.on('hosted', (channel, username, viewers, autohost) => {
    client.action("bibou_lol", `Merci ${username} pour l'host de ${viewers} viewers !`);
});
/************************************ */
/**************FIN BOT************* */
/************************************ */

/************************************ */
/**************FUNCTIONS************* */
/************************************ */
function parseCommand(message) {
    const args = message.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    return { command, args };
}
async function handleSkin(channel, championName, userstate) {
    const skins = await fetchChampionSkins(championName);
    /*
    (async () => {
        if (skins.length !== 0) {
            // assigne un index a chaque skin
            const skinIndex = skins.map((skin, index) => index);
            // met 1 : skin[0], 2 : skin[1], etc...
            const skinNumber = skinIndex.map((index) => index + 1);
            //envoie au chat le nom du champion et le nom de la skin avec le numéro du skin sans boucle for
            message = "";
            skins.forEach((skin, index) => {
                message += `${skinNumber[index]} : ${skin} `;
            });
            client.say(channel, `Skins de ${championName} : ${message}`);
            client.say(channel, `Quel skin choisis tu ? @${userstate["display-name"]} ? Tu as 20 secondes pour voter !`);
            votes.active = true;
            votes["voter"] = userstate.username;

            setTimeout(() => {
                // trouve le skin avec le plus de vote
                console.log(votes);
                if (Object.keys(votes).length === 2) {
                    client.say(channel, `T'as pas voté frerot !`);
                } else if (Object.keys(votes).length === 3) {
                    //find the key of the vote
                    const voteWinner = Object.keys(votes).find(key => key !== 'active' && key !== 'voter');
                    client.say(channel, `Le skin gagnant est ${skins[voteWinner - 1]}`);
                } else {
                    client.say(channel, `Trop de votes ! On annule !`);
                }
                votes = { "active": false, "voter": "" };
            }, 20000);
        } else {
            client.say(channel, `Le champion ${championName} n'existe pas !`);
        }
    })();   
    */

    (async () => {
        const skins = await fetchChampionSkins(championName);
        if (skins.length !== 0) {
            // assigne un index a chaque skin
            const skinIndex = skins.map((skin, index) => index);
            // met 1 : skin[0], 2 : skin[1], etc...
            const skinNumber = skinIndex.map((index) => index + 1);
            //envoie au chat le nom du champion et le nom de la skin avec le numéro du skin sans boucle for
            message = "";
            skins.forEach((skin, index) => {
                message += `${skinNumber[index]} : ${skin} `;
            });
            client.say(channel, `Skins de ${championName} : ${message}`);
            votes.active = true;
            client.say(channel, `Vous avez 45s pour voter pour skin avec !vote <numéro du skin>`);
            setTimeout(() => {
                // trouve le skin avec le plus de vote
                console.log(votes);
                if (Object.keys(votes).length === 1) {
                    client.say(channel, `Le skin gagnant est ${skins[0]}`);
                } else if (Object.keys(votes).length === 2) {
                    //find the key of the vote
                    const voteWinner = Object.keys(votes).find(key => key !== 'active');
                    client.say(channel, `Le skin gagnant est ${skins[voteWinner - 1]}`);
                } else {
                    const voteWinner = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
                    if (voteWinner > skins.length) {
                        client.say(channel, `Le skin gagnant est ${skins[0]}`);
                    } else {
                        client.say(channel, `Le skin gagnant est ${skins[voteWinner - 1]}`);
                    }
                    votes = { active: false };
                }
            }, 45000);
        } else {
            client.say(channel, `Il y a eu un problème avec la récupération des skins.`);
        }
    })();
}
async function getChannelPoints(username = ""){
    try {
        // query to get all documents in the collection expect the username "bibou_bot" and sort them by points
        var res = await collection.find({ username: { $ne: "bibou_bot" } }).sort({ points: -1 }).toArray();
        if (username !== "") {
            // Find the user with the given username in the collection
            const user = await collection.findOne({ username : username});
            console.log(user);
            if (user) {
              // Get the index of the user in the sorted array of all documents
              const index = res.findIndex(doc => doc.username === user.username);
              console.log(index);
              // Return the user object and index
              return { user, index };
            } else {
              // Return null if user is not found
              return null;
            }
        }
        return res;
    }catch(err){
        console.log(err);
        return null;
    }
}
async function givePoints(target, points) {
    try {
        // Recherche de l'utilisateur cible dans la collection
        const user = await collection.findOne({ username: target });

        // Si l'utilisateur n'existe pas, on l'ajoute à la collection avec e bon nombre de points
        if (!user) {
            await collection.insertOne({ username: target, points: 0 });
        }
        // Mise à jour du nombre de points de l'utilisateur cible
        const result = await collection.updateOne(
            { username: target },
            { $inc: { points: points } }
        );
        console.log(`Updated ${result.modifiedCount} document(s)`);

        // Fermeture de la connexion à la base de données MongoDB
    } catch (err) {
        console.log(err);
    }
}

async function getPoints(username) {
    // Fetch documents
    var fetchedDocuments = await collection.find({ username: username }).toArray();
    if (fetchedDocuments.length === 0) {
        await collection.insertOne({ username: username, points: 0 });
        return 0;
    } else {
        return fetchedDocuments[0].points;
    }
}
async function handleGiveaway(channel, userstate, name) {
    // check if the user is a mod or the broadcaster
    if (userstate.mod || userstate['display-name'] === channel.slice(1)) {
        if (name === undefined) name = "Bibou";
        client.say(channel, "Pour participer au giveaway, envoyez " + name + " dans le chat dans les prochaines 45s !");
        giveaway.motclé = name;
        giveaway.participants = new Set();
        giveaway.active = true;
        setTimeout(() => {
            console.log(giveaway);
            giveaway.active = false;
            giveaway.winner = Array.from(giveaway.participants)[Math.floor(Math.random() * giveaway.participants.size)];
            client.say(channel, "Le giveaway est terminé ! Merci à tous pour votre participation ! Le Gagnant est : " + giveaway.winner);
        }, 1000 * 45);
    } else {
        client.say(channel, "Seuls les modos peuvent lancer un giveaway !");
    }
}

async function handleWinrate(channel, command) {
    var currentTime = new Date().getTime();
    if (currentTime - lastWinrate < winrateDelay) {
        client.say(channel, `Merci de patienter ${Math.round((winrateDelay - (currentTime - lastWinrate)) / 1000)} secondes avant de faire cette commande`);
    } else {
        lastWinrate = currentTime;
        [champName, oppChamp] = command.substring("!winrate".length).trim().split("/");
        if (champName === undefined) champName = "";
        if (oppChamp === undefined) oppChamp = "";
        //if its in the key of championNamesMatch, we replace it with the correct name
        if (championNamesMatch[champName] !== undefined) champName = championNamesMatch[champName];
        if (championNamesMatch[oppChamp] !== undefined) oppChamp = championNamesMatch[oppChamp];
        console.log("champions : ", champName, oppChamp);
        stats = await getStatistics(BibouSummonerName, champName, oppChamp);
        if (stats === undefined) {
            client.say(channel, "Problème de récupération des stats");
        }
        else {
            wr = stats[0];
            nbGame = stats[1];
            if (nbGame === 0)
                client.say(channel, "Bibou n'a pas joué recemment ce matchup");
            else {
                client.say(channel, `Bibou a un winrate de ${(wr*100).toFixed(1)}% ${champName !== "" ? "avec " +champName:"" } ${oppChamp !== "" ? "contre " + oppChamp : ""} sur ses ${nbGame} dernières parties`);
            }
        }
    }

}

async function handleHint(channel, username) {
    try {
        if (Object.keys(champToGuess).length === 0) {
            //client.say(channel, `Aucun champion n'est en cours de devinette !`);
        } else {
            var points = 100000//await getPoints(username);
            if (points < hintCost) {
                //client.say(channel, `Vous n'avez pas assez de points pour demander un indice !`);
            } else {
                //await givePoints(username, -hintCost);
                if (champToGuess["hint"] === 0) {
                    client.say(channel, `Voici un indice : ${championsList[champToGuess["name"]][2]}`);
                    champToGuess["hint"] = 1;
                
                } else {
                    client.say(channel, `Vous avez déjà utilisé tous les indices !`);
                }
            }
        }
    } catch (err) {
        //console.log(err);
    }
}
async function handleTry(channel, userstate, message) {
    if (Object.keys(champToGuess).length !== 0) {
        var champName = message.substring('!try'.length).trim();
        if (championNamesMatch[champName] !== undefined) {
            champName = championNamesMatch[champName];
        }
        if (champName.toLowerCase() === `${champToGuess["name"].toLowerCase()}`) {
            //await givePoints(userstate.username, guessReward);
            client.say(channel, `Bravo ${userstate.username} ! Vous avez trouvé le champion ${champToGuess["name"]}`); // ! Vous gagnez ${guessReward} points !`);
            champToGuess = {};
        }
        else {
            const messageRefus = ["N'importe quoi ! ", "T'es nul", "Mouais pas ouf", "Essaie encore", "Il y a quelque chose", "Franchement c'est pas loin", "T'es tout proche !", "Tqt c'est juste une faute de frappe"];
            distance = jaroWinklerDistance(champName.toLowerCase(), champToGuess["name"].toLowerCase());
            let message = "";
            switch (true) {
                case (distance > 90):
                    message = messageRefus[messageRefus.length - 1];
                    client.say(channel, `${message} ${userstate['display-name']} : ${distance}%`);
                    break;
                    /*
                case (distance > 70):
                    message = messageRefus[messageRefus.length - 2];
                    break;
                case (distance > 50):
                    message = messageRefus[messageRefus.length - 3];
                    break;
                case (distance > 30):
                    message = messageRefus[messageRefus.length - 4];
                    break;
                default:
                    message = messageRefus[Math.floor(Math.random() * 2)];
                    break;
                    */
            }
            
        }
    }
}

async function handleStreak(channel, account) {
    // Fonction pour récupérer l'historique des parties
    var streak;
    if(account == 1){
        streak = await getMatchHistory("Yoriichı");
        client.say(channel, `Streak de Yoriichı : ${streak}`);
    }else{
        streak = await getMatchHistory(BibouSummonerName);
        client.say(channel, `Streak de Bibou : ${streak}`);
    }    
}
async function getMatchHistory(username) {
    var histo = [];
    try {
        // Récupération de l'ID du compte à partir du nom d'utilisateur et du serveur
        const account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${username}?api_key=${riotApiKey}`);
        const accountId = account.data.puuid;
        console.log(`ID du compte de ${username} : ${accountId}`);

        // Récupération des 20 dernières parties
        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${accountId}/ids?start=0&count=20&api_key=${riotApiKey}`);
        const matches = matchList.data;

        // Traitement de chaque partie
        let nb = 0;
        for (let i = 0; i < matches.length; i++) {
            if (nb === 5) break;
            const matchId = matches[i];
            //console.log(`Récupération des détails de la partie ${matchId}...`);

            // Récupération des détails de la partie
            const match = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = match.data;
            if (matchDetails.info.gameMode === "CLASSIC") { // 420 est l'identifiant de la file d'attente pour les parties classées solo/duo
                // Récupération du résultat de la partie (victoire ou défaite)
                let result = '';
                const participant = matchDetails.info.participants.find(p => p.summonerName === username);
                if (participant) {
                    result = participant.win ? '✅' : '❌';
                } else {
                    result = 'E'; // Cas où le joueur n'est pas dans la partie
                }

                // Envoi du message dans le chat
                histo.push(result);
                //console.log(message);
                //client.say(channel, message);
                nb++;
            }
        }
        return histo;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des parties :', error);
    }
}
async function handleElo(channel) {
    const summonerNames = [BibouSummonerName] //'Yoriichı'];

    const getSummonerInfo = async (summonerName) => {
        try {
            const encodedSummonerName = encodeURIComponent(summonerName);
            // Récupère les informations du compte
            const summonerResponse = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedSummonerName}?api_key=${riotApiKey}`);
            const summonerId = summonerResponse.data.id;

            // Récupère les informations de la ligue
            const leagueResponse = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${riotApiKey}`);
            const leagueData = leagueResponse.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');

            if (!leagueData) {
                client.say(channel, `${summonerName} ${emoticons.Kreygasm} n'a pas encore joué de parties classées en solo cette saison.`);
            } else {
                const tier = leagueData.tier;
                const rank = leagueData.rank;
                const lp = leagueData.leaguePoints;

                client.say(channel, ` ${summonerName} ${emoticons.Kappa} est actuellement ${tier} ${rank} avec ${lp} LP.`);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données de la ligue :', error);
            client.say(channel, 'Désolé, une erreur est survenue lors de la récupération des données de la ligue.');
        }
    };
    summonerNames.forEach(getSummonerInfo);
}
async function handleStory(channel, message) {
    const championName = message.substring('!story'.length).trim();
    if (championName.length === 0) {
        client.say(channel, `Veuillez ajouter un champion. Exemple: !story Kayn`);
    }
    else {
        if (championNamesMatch[championName] !== undefined) championName = championNamesMatch[championName];
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionsResponse.data[0];
        const championsResponse = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion.json`);
        const championData = Object.values(championsResponse.data.data).find(
            (champion) => champion.name.toLowerCase() === championName.toLowerCase()
        );
        if (!championData) {
            client.say(channel, `Désolé, je ne connais pas le champion ${championName}.`);
            return;
        }
        client.say(channel, `Voici l'histoire de ${championData.name} : ${championData.blurb}`);
    }
}
async function handleGame(channel, message) {
    var summonerName = message.substring('!game'.length).trim();
    if (summonerName.length === 0)
        summonerName = "Bibou";
    (async () => {
        try {
            const liveGameData = await getLiveGame(summonerName);

            if (liveGameData && liveGameData.playerData) {
                const proPlayers = liveGameData.playerData
                    .filter((player) => player.teamTitle !== 'Équipe inconnue')
                    .map((player) => `${player.playerName} (${player.teamTitle}) sur ${player.champion}`)
                    .join(', ');

                const proMessage = proPlayers.length > 0 ? `Pro dans la game : ${proPlayers}` : "Aucun joueur pro dans la game.";

                client.say(channel, proMessage);
            }
        } catch (error) {
            if (error.message == "Summoner not in game") {
                client.say(channel, `${summonerName} n'est pas en game.`);
            }else{
                console.error('Erreur lors de la récupération des données de la partie en direct', error);
                client.say(channel, `Désolé, une erreur est survenue.`);
            }
        }
    })();
}

async function fetchChampionSkins(championName) {
    try {
        // Récupérer les données statiques des champions
        console.log(championName);
        if (championNamesMatch[championName] !== undefined) {

            championName = championNamesMatch[championName].replace(/'/g, '');
            console.log(championName);
            championName = championName.charAt(0).toUpperCase() + championName.slice(1).toLowerCase();
            console.log(championName);
            // si le nom contient un espace, on le replace par rien et on met la première lettre de chauqe moi en majuscule
            if (championName.includes(' ')) {
                console.log(championName);
                //trouve le début du deuxieme moit
                var index = championName.indexOf(' ') + 1;
                //met la première lettre du deuxieme mot en majuscule
                championName = championName.charAt(0).toUpperCase() + championName.substring(1, index) + championName.charAt(index).toUpperCase() + championName.substring(index + 1);
                championName = championName.replace(' ', '');
            }
        }
        console.log(championName);
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionsResponse.data[0];
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion/${championName}.json`);
        const championData = response.data.data[championName];
        if (!championData) {
            console.error('Champion introuvable');
            return [];
        }
        const skinNames = championData.skins.map(skin => skin.name);
        // Récupérer les noms de tous les skins du champion
        //console.log(`Skins pour ${championName}:`, skinNames);
        return skinNames;
        //console.log(`Skins pour ${championName}:`, skinNames);
    } catch (error) {
        console.error('Erreur lors de la récupération des données', error);
        return [];
    }
}


// Fonction pour extraire une fact aléatoire sur League of Legends depuis la page "League of Legends Wiki"
async function getRandomFact() {
    try {
        // Récupérer la page "Random" sur "League of Legends Wiki"
        const response = await fetch('https://www.techmaish.com/50-interesting-league-legends-facts-people-dont-know/');
        const html = await response.text();
        // generate random number between 0 and 50
        const random = Math.floor(Math.random() * 50);
        // Utiliser la librairie "cheerio" pour extraire la fact aléatoire depuis la page HTML
        const $ = cheerio.load(html);
        const lis = $('ol li');
        var fact = lis[random].children[0].data;
        return lis[random].children[0].data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getSoloQChallengeInfos() {
    try {
        const response = await fetch("https://soloqchallenge.fr")
        const html = await response.text();
        const $ = cheerio.load(html);
        const leaderboard = $('#leaderboard-refresh');
        const participants = leaderboard.find('.ranking-list_grid-setup');
        const top3 = [];
        let bibou = null;

        participants.each((i, participant) => {
            if (top3.length === 3 && bibou) return;

            const rank = $(participant).find('.ranking').text();
            const name = $(participant).find('.ranking-list_pseudo p').text().trim();
            const elo = $(participant).find('.ranking-list_rank p').text().trim().replace(/\s+/g, '');
            const victories = $(participant).find('.ranking-list_wins').text().trim();
            const defeats = $(participant).find('.ranking-list_losses').text().trim();

            if (top3.length < 3) {
                top3.push({ rank, name, elo, victories, defeats });
            }

            if (name.toLowerCase() === 'bibou') {
                bibou = { rank, name, elo, victories, defeats };
            }
        });

        console.log('Top 3 players:');
        console.log(top3);

        if (bibou) {
            console.log("Bibou's info:");
            console.log(bibou);
        } else {
            console.log('Bibou not found in the table.');
        }

        return [top3, bibou];
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getLiveGame(summonerName) {

    const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
                req.abort();
            } else {
                req.continue();
            }
        });
        await page.goto(`https://lolpros.gg/player/${encodeURIComponent(summonerName)}`);

        // Cliquez sur l'onglet "live game"
        await page.click('[aria-controls="#live-game"]');

        // Attendez que le contenu de l'onglet soit chargé ou que "Summoner not in game" apparaisse
        const notInGameElement = 'p[data-v-6176f300=""]';
        const playerNameElement = '.player-name';
        const elementFound = await Promise.race([
            page.waitForSelector(notInGameElement, { visible: true, timeout: 2000 }).then(() => 'notInGame'),
            page.waitForSelector(playerNameElement, { visible: true, timeout: 2000 }).then(() => 'playerName'),
        ]);

        if (elementFound === 'notInGame') {
            console.log('Summoner not in game');
            throw new Error('Summoner not in game');
        }

        const liveGameData = await page.evaluate(() => {
            const playerNamesElements = document.querySelectorAll('.player-name');
            const playerData = Array.from(playerNamesElements).map((element) => {
                const playerName = element.innerText.trim();
                // Accédez à l'élément parent avec la classe "player-name-display"
                const playerNameDisplay = element.closest('.player');
                const championDisplay = playerNameDisplay.previousElementSibling;
                // Trouvez l'élément frère avec la classe "player-team"
                const playerTeamElement = playerNameDisplay.nextElementSibling;

                // Vérifiez si la classe "hide" est absente et récupérez le titre de l'équipe
                let teamTitle = 'Équipe inconnue';
                if (playerTeamElement && playerTeamElement.classList.contains('player-team') && !playerTeamElement.classList.contains('hide')) {
                    const teamDetails = playerTeamElement.querySelector('.team-details');
                    const titleElement = teamDetails.querySelector('.title');
                    teamTitle = titleElement.innerText.trim();
                }
                let champion = 'Champion inconnu';
                if (championDisplay) {
                    const championDetails = championDisplay.querySelector('.champion');
                    const titleElement = championDetails.querySelector('.hint--top');
                    champion = titleElement.getAttribute('aria-label');
                }
                return { playerName, teamTitle, champion };
            });

            return { playerData };
        });

        await page.close();
        await browser.close();

        return liveGameData;
}

async function searchAndQueueSong(query, channel) {
    try {
        const result = await spotifyApi.searchTracks(query);
        const firstTrack = result.body.tracks.items[0];

        if (firstTrack) {
            const trackUri = firstTrack.uri;
            await spotifyApi.addToQueue(trackUri);
            client.say(channel, `Track ajouté à la liste d'attente : ${firstTrack.name} par ${firstTrack.artists[0].name}`);
        } else {
            console.log('Aucune chanson trouvée pour la requête:', query);
            client.say(channel, 'Aucune chanson trouvée pour la requête : ' + query);
        }
    } catch (error) {
        //console.error('Erreur lors de la recherche et de la mise en file d\'attente d\'une chanson:', error);
        client.say(channel, 'Bibou a oublié de se connecter à Spotify !');
    }
}

function jaroWinklerDistance(s1, s2) {
    // Calcul de la longueur des deux chaînes
    const len1 = s1.length;
    const len2 = s2.length;

    // Calcul de la distance maximale
    const maxDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

    // Initialisation des variables
    let matches = 0;
    let transpositions = 0;
    let prevPos = -1;

    // Création des tableaux de booléens pour les lettres déjà comparées
    const s1Matched = new Array(len1).fill(false);
    const s2Matched = new Array(len2).fill(false);

    // Recherche des caractères identiques dans les deux chaînes
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - maxDistance);
        const end = Math.min(i + maxDistance + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matched[j]) {
                continue;
            }
            if (s1[i] !== s2[j]) {
                continue;
            }
            s1Matched[i] = true;
            s2Matched[j] = true;
            matches++;
            break;
        }
    }

    // Si aucune lettre ne correspond, la distance est de 0
    if (matches === 0) {
        return 0;
    }

    // Recherche des transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matched[i]) {
            continue;
        }
        while (!s2Matched[k]) {
            k++;
        }
        if (s1[i] !== s2[k]) {
            transpositions++;
        }
        prevPos = k;
        k++;
    }

    // Calcul de la distance de Jaro
    const jaroDistance =
        (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Calcul de la distance de Jaro-Winkler
    const jaroWinklerDistance =
        jaroDistance +
        Math.min(0.1, 1 / Math.max(len1, len2)) *
        (prevPos > 0 ? prevPos : 0) *
        (1 - jaroDistance);

    // Conversion en pourcentage et retour du résultat
    return Math.round(jaroWinklerDistance * 100);
}

async function getStatistics(username, champName, opponentChamp) {
    try {
        if (winrate[champName + "," + opponentChamp] === undefined) {
            await getStats(username, champName, opponentChamp);
        }
        console.log(winrate);
        return winrate[champName + "," + opponentChamp];
    } catch (error) {
        console.error(error);
    }
}
async function getStats(username, champName, opponentChamp = "") {
    // Récupération de l'ID du compte à partir du nom d'utilisateur et du serveur
    try {
        let bibou = username //[bibou, yorichii] = username.split("-");
        let account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${bibou}?api_key=${riotApiKey}`);
        const bibouId = account.data.puuid;
        // account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${yorichii}?api_key=${riotApiKey}`);
        // const yorichiiId = account.data.puuid;
        // Récupération des 500 dernières parties
        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${bibouId}/ids?start=0&count=35&api_key=${riotApiKey}`);
        //const matchList2 = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${yorichiiId}/ids?start=0&count=35&api_key=${riotApiKey}`);
        let matches = matchList.data;
        //matches = matches.concat(matchList2.data);
        // Traitement de chaque partie
        let totalGamesBibou = 0;
        let bibouWins = 0;
        let totalGamesYorichii = 0;
        let yorichiiWins = 0;
        for (let i = 0; i < matches.length; i++) {
            const matchId = matches[i];
            // Retrieving match details
            const match = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = match.data;
            if (matchDetails.info.gameMode === "CLASSIC") {
                const bibou = matchDetails.info.participants.find(participant => participant.puuid === bibouId);
                if (champName === "" && opponentChamp === "") {
                        totalGamesBibou++;
                        if (bibou.win) {
                            bibouWins++;
                        }
                    }
                else if (champName !== "" && opponentChamp === "") {
                    if (bibou.championName === champName) {
                        totalGamesBibou++;
                        if (bibou.win) {
                            bibouWins++;
                        }
                    }
                }
                else{
                    const opponent = matchDetails.info.participants.find(participant => participant.championName === opponentChamp);
                    if (bibou.championName === champName && opponent) {
                        totalGamesBibou++;
                        if (bibou.win) {
                            bibouWins++;
                        }
                    }
                }
            }
        }
        let winRateBibou = (totalGamesBibou === 0 ? NaN : bibouWins / totalGamesBibou);
        var winRateYorichii = (totalGamesYorichii === 0 ? NaN : yorichiiWins / totalGamesYorichii);
        console.log(winRateBibou, winRateYorichii, totalGamesBibou, totalGamesYorichii);
        if (isNaN(winRateBibou) && isNaN(winRateYorichii)) {
            winrate[champName + "," + opponentChamp] = [NaN, 0];
        } else if (isNaN(winRateBibou)) {
            winrate[champName + "," + opponentChamp] = [winRateYorichii, totalGamesYorichii];
        } else if (isNaN(winRateYorichii)) {
            winrate[champName + "," + opponentChamp] = [winRateBibou, totalGamesBibou];
        } else {
            winrate[champName + "," + opponentChamp] = [Math.round(((winRateBibou + winRateYorichii) / 2 + Number.EPSILON) * 100), totalGamesBibou + totalGamesYorichii];
        }

    } catch (error) {
        console.log(error);
    }
    return;
}
