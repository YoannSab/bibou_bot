const tmi = require('tmi.js');
const cheerio = require('cheerio');
const path = "..";
const fs = require('fs');
const puppeteer = require('puppeteer');
const champFile = fs.readFileSync('./champ.json');
const championsList = JSON.parse(champFile);
const championNamesFile = fs.readFileSync('./championNames.json');
const championNamesMatch = JSON.parse(championNamesFile);

const ggPhrasesFile = fs.readFileSync('./gg.json');
var phraseGG = JSON.parse(ggPhrasesFile);
//replace all Bibou by [] in the array
phraseGG = phraseGG.map(function (x) { return x.replace(/Bibou/g, '[]'); });

var champToGuess = {};
//const openai = require('openai');
// read file keys.txt and get the keys in a dict
// Dictionnaire des couleurs
var quotes = [];
var quotesFile = fs.readFileSync('./quotes.txt', 'utf8');
quotes = quotesFile.split('\n');

var giveaway = { "active": false, "participants": new Set(), "winner": "", "motclé": "" };
var votes = { "active": false };

// Dictionnaire des émoticônes
const emoticons = {
    Kappa: 'Kappa',
    PogChamp: 'PogChamp',
    LUL: 'LUL',
    BibleThump: 'BibleThump',
    Kreygasm: 'Kreygasm',
    TriHard: 'TriHard',
};

const username = process.env.TWITCH_USERNAME;
const password = process.env.TWITCH_OAUTH_TOKEN;
const riotApiKey = process.env.RIOT_API_KEY;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI;


/*const keys = JSON.parse(fs.readFileSync('../keys.json', 'utf8'));
const username = keys.twitch_username;
const password = keys.twitch_oauth;
const riotApiKey = keys.riot_api_key;
const spotifyClientId = keys.spotify_client_id;
const spotifyClientSecret = keys.spotify_client_secret;
const spotifyRedirectUri = keys.spotify_redirect_uri;
*/

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

const client = new tmi.Client(options);
async function connect() {
    try{
        await client.connect();
    }
    catch(err){
        console.log(err);
    }
}


const bannedWords = ['biboulpb'];
const axios = require('axios');
const bodyParser = require('body-parser');
// Ton API key Riot Games
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const { get } = require('http');

const clashFile = fs.readFileSync('./clash.json');
const phraseLow = JSON.parse(clashFile);
//wrap in a async function
var allow_music = false;
var lastGuess = 0;
var guessDelay = 60 * 1000;

// Tes identifiants Spotify
const spotifyApi = new SpotifyWebApi({
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: spotifyRedirectUri,
});
process.on('SIGINT', function () {
    fs.writeFileSync(path + '/quotes.txt', quotes.join('\n'));
    client.disconnect();
    process.exit();
});
// Authentification à l'API Spotify
spotifyApi.clientCredentialsGrant()
    .then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
    })
    .catch(err => {
        console.error('Erreur lors de la récupération du jeton d\'accès Spotify :', err);
    });

// ... (ton code actuel pour le chatbot Twitch)

// Configuration du serveur Web pour gérer l'authentification OAuth
const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/api/setDelay', (req, res) => {
    console.log(req);
    guessDelay = req.body.delay * 1000;
    res.send(JSON.stringify({ message: 'Delay set to ' + req.body.delay + ' seconds' }));
    client.action('bibou_LoL', 'Le délai entre deux devinettes est maintenant de ' + req.body.delay + ' secondes');
});
app.get('/connect', (req, res) => {
    connect();
    res.send(JSON.stringify('Connected'));
});

app.get('/api/allowMusic', (req, res) => {
    allow_music = true;
    res.send(JSON.stringify('Music allowed'));
    client.action('bibou_LoL', 'Ajout de musique autorisé');
});
app.get('/api/denyMusic', (req, res) => {
    allow_music = false;
    res.send(JSON.stringify('Music denied'));
    client.action('bibou_LoL', 'Ajout de musique interdit');
});
app.get('/api/giveaway', (req, res) => {
    res.send(JSON.stringify({participants: Array.from(giveaway.participants), winner: giveaway.winner}));
});

app.get('/login', (req, res) => {
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
});

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

const server = app.listen(process.env.PORT || 8888, () => {
    console.log('Le serveur est à l\'écoute sur le port 8888.');
});


function parseCommand(message) {
    const args = message.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    return { command, args };
}

client.on('message', async (channel, userstate, message, self) => {
    if (self) return;
    const { command, args } = parseCommand(message);
    console.log(command, args);

    if (giveaway.active) {
        console.log(giveaway.motclé);
        if (message.toLowerCase() === giveaway.motclé.toLowerCase()) {
            giveaway.participants.add(userstate['display-name']);
        }
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
        case 'factlol':
            // Récupérer une fact aléatoire sur League of Legends depuis "League of Legends Wiki"
            const fact = await getRandomFact();
            // Envoyer la fact aléatoire sur League of Legends dans le chat
            if (fact) {
                client.say(channel, `${fact}`);
            } else {
                client.say(channel, "Désolé, je n'ai pas pu récupérer de fact aléatoire sur League of Legends !");
            }
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
                    console.error('Erreur lors de la récupération des informations sur la musique en cours de lecture :', err);
                });
            break;
        case 'hello':
            if (args.length > 0) {
                client.say(channel, `Hello ${args.join(' ')} !`);
            } else {
                client.say(channel, `Hello ${userstate['display-name']} !`);
            }
            break;
        case 'low':
            if (args.length > 0) {
                client.say(channel, `Yo ${args.join(' ')}, ${phraseLow[Math.floor(Math.random() * phraseLow.length)]}`);
            } else {
                client.say(channel, `Yo @Bibou_LoL, ${phraseLow[Math.floor(Math.random() * phraseLow.length)]}`);
            }
            break;
        case 'songrequest':
            if (allow_music) {
                const query = message.substring('!songrequest'.length).trim();
                if (query.length > 0) {
                    await searchAndQueueSong(query, channel);
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
                client.say(channel, `Trouvez le champion ! \n Pour proposer, tapez !try (champion). \n Pour avoir un indice, tapez !hint. Pour abandonner, tapez !abandon \n`);
                client.say(channel, `-> ${championsList[randomChampion].slice(0, 2)}`);
                champToGuess = {};
                champToGuess["name"] = randomChampion;
                champToGuess["hint"] = 0;
            }
            break;
        case 'hint':
            await handleHint(channel);

            break;
        case 'try':
            await handleTry(channel, userstate, message);
            break;
        case 'abandon':
            if (Object.keys(champToGuess).length !== 0) {
                client.say(channel, `Le champion à deviner était ${champToGuess["name"]} !`);
                champToGuess = {};
            } else {
                client.say(channel, `Aucun jeu en cours`);
            }
            break;
        case 'streak':
            await handleStreak(channel, userstate, message);
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
            client.say(channel, `Check l'opgg de Bibou : https://euw.op.gg/summoner/userName=AKR%20Bibou \nCheck l'opgg de Yoriichı : https://euw.op.gg/summoner/userName=Yoriichı`);
            break;
        case 'love':
            const value = Math.floor(Math.random() * 100);
            const other = args;
            if (other.length === 0) {
                client.say(channel, `${userstate['display-name']} aime @Bibou_LoL à ${value}% ${emoticons.Kappa}`);
            } else {
                client.say(channel, `@${userstate['display-name']} aime ${other.join(' ')} à ${value}% ${emoticons.Kappa}`);
            }
            break;
        case 'infos':
            client.say(channel, 'Commandes disponibles : !elo, !twitter, !skin <nom du champ>, !lolpro, !opgg, !music, !hello, !winrate champion/championadverse (opt) !songrequest (nom de la chanson), !factlol, !low @qqun, !game, !idee, !love (nom de la personne), !story (nom du champion), !guess, !streak');
            break;
        case 'idee':
            client.say(channel, 'Donne ton idée de commande : https://forms.gle/WMQprchNg8gQvYrc9');
            break;
        case 'story':
            await handleStory(channel, message);
            break;
        case 'game':
            await handleGame(channel, message);
            break;

        case 'skin':
            var championName = message.substring('!skin'.length).trim();
            if (championName.length === 0) {
                client.say(channel, `Veuillez entrer un nom de champion.`);
            } else {
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
            break;
        case 'vote':
            if (votes.active) {
                const vote = parseInt(message.substring('!vote'.length).trim());
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
            try {
                await spotifyApi.skipToNext();
                if (userstate["display-name"].toLowerCase() === "bibou_lol" || userstate["display-name"].toLowerCase() === "akr_gabin") {
                    client.say(channel, `La chanson a été passée.`);
                } else {
                    client.say(channel, `Seul Bibou et Gabin, peuvent passer la chanson.`);
                }
            } catch (error) {
                console.error(error);
                client.say(channel, `Il y a eu un problème lors du passage de la chanson.`);
            }

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
            try {
                client.say(channel, "Classement complet : https://soloqchallenge.fr/");
                [top3, bibou] = await getSoloQChallengeInfos();
                const message = top3.map((player, index) => {
                    return `#${index + 1} ${player.name} (${player.victories}W/${player.defeats}L)`;
                  }).join(", ");
                  
                client.say(channel, `TOP 3 du SOLOQ :     ${message}`);

                const streak = await getMatchHistory("Michıkatsu");
                client.say(channel, `BIBOU  #${bibou.rank}e (${bibou.victories}W/${bibou.defeats}L) -> ${streak}`);

            } catch (error) {
                console.error(error);
                client.say(channel, `Il y a eu un problème lors de la récupération des informations du soloqchallenge.`);
            }

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
        default:
            if (message.startsWith("!")) {
                var commands = ["!elo", "!twitter", "!lolpro", "!opgg", "!music", "!hello", "!songrequest", "!factlol", "!low", "!game", "!idee", "!love", "!story", "!guess", "!streak", "!winrate", "!skipsong", "!skin", "!vote", "!guess", "!hint", "!abandon", "!soloq"];
                // compute proximity of the command to the commands in the array with my function
                var proximity = commands.map(function (comm) {
                    return jaroWinklerDistance(comm, message);
                });
                // find the index of the command with the highest proximity
                var index = proximity.indexOf(Math.max.apply(null, proximity));
                // get the command with the highest proximity
                var closestCommand = commands[index];
                client.say(channel, `Commande inconnue, voulez-vous dire ${closestCommand} ?`);
            }
            break;
    }
});

client.on('connected', (address, port) => {
    client.action("bibou_lol", "Je suis connecté !");
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
        if (oppChamp === undefined) oppChamp = "";
        //if its in the key of championNamesMatch, we replace it with the correct name
        if (championNamesMatch[champName] !== undefined) champName = championNamesMatch[champName];
        if (championNamesMatch[oppChamp] !== undefined) oppChamp = championNamesMatch[oppChamp];
        console.log(champName, oppChamp);
        stats = await getStatistics("AKR Bibou-Yoriichı", champName, oppChamp);
        if (stats === undefined) {
            client.say(channel, "Problème de récupération des stats");
        }
        else {
            wr = stats[0];
            nbGame = stats[1];
            if (nbGame === 0)
                client.say(channel, "Bibou n'a pas joué recemment ce matchup");
            else {
                client.say(channel, `Bibou a un winrate de ${wr}% avec ${champName} ${oppChamp !== "" ? "contre " + oppChamp : ""} sur ses ${nbGame} dernières parties`);
            }
        }
    }

}

async function handleHint(channel) {
    if (Object.keys(champToGuess).length === 0) {
        client.say(channel, `Aucun champion n'est en cours de devinette !`);
    } else {
        if (champToGuess["hint"] === 0) {
            client.say(channel, `Voici un indice : ${championsList[champToGuess["name"]][2]}`);
            champToGuess["hint"] = 1;
        } else if (champToGuess["hint"] === 1) {
            client.say(channel, `Voici un indice : ${championsList[champToGuess["name"]][3]}`);
            champToGuess["hint"] = 2;
        } else if (champToGuess["hint"] === 2) {
            const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
            const latestVersion = versionsResponse.data[0];
            const championsResponse = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion.json`);
            const championData = Object.values(championsResponse.data.data).find(
                (champion) => champion.name.toLowerCase() === champToGuess["name"].toLowerCase()
            );
            if (!championData) {
                client.say(channel, `Désolé, je ne connais pas le champion ${champToGuess["name"]}.`);
                return;
            }
            // take  ${championData.blurb} and replace all occurence of champion name by "____"
            const blurb = championData.blurb.replace(new RegExp(champToGuess["name"], 'g'), '[Champion]');
            client.say(channel, `Voici l'indice final : ${blurb}`);
            champToGuess["hint"] = 3;
        } else {
            client.say(channel, `Vous avez déjà utilisé tous les indices !`);
        }
    }
}
async function handleTry(channel, userstate, message) {
    if (Object.keys(champToGuess).length !== 0) {
        var champName = message.substring('!try'.length).trim();
        if (championNamesMatch[champName] !== undefined) {
            champName = championNamesMatch[champName];
        }
        if (champName.toLowerCase() === `${champToGuess["name"].toLowerCase()}`) {
            client.say(channel, `Bravo ! ${userstate['display-name']} c'était bien ${champToGuess["name"]} !`);
            champToGuess = {};
        }
        else {
            const messageRefus = ["N'importe quoi ! ", "T'es nul", "Mouais pas ouf", "Essaie encore", "Il y a quelque chose", "Franchement c'est pas loin", "T'es tout proche !", "Tqt c'est juste une faute de frappe"];
            distance = jaroWinklerDistance(champName.toLowerCase(), champToGuess["name"].toLowerCase());
            let message = "";
            switch (true) {
                case (distance > 90):
                    message = messageRefus[messageRefus.length - 1];
                    break;
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
            }
            client.say(channel, `${message} ${userstate['display-name']} : ${distance}%`);
        }
    }
}

async function handleStreak(channel) {
    // Fonction pour récupérer l'historique des parties

    var streak = await getMatchHistory("AKR Bibou");
    client.say(channel, `Streak de AKR Bibou : ${streak}`);
    streak = await getMatchHistory("Yoriichı");
    client.say(channel, `Streak de Yoriichı : ${streak}`);
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
    const summonerNames = ['AKR Bibou', 'Yoriichı'];

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
            } else {
                throw new Error('Erreur lors de la récupération des données de la partie en direct');

            }
        } catch (error) {
            var summonerNames = ["AKR Bibou", "Yoriichı"]
            try {
                var summoner;
                var gameId;
                try {
                    summoner = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerNames[0]}?api_key=${riotApiKey}`);
                    gameId = await axios.get(`https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summoner.data.id}?api_key=${riotApiKey}`);
                } catch (error) {
                    summoner = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerNames[0]}?api_key=${riotApiKey}`);
                    gameId = await axios.get(`https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summoner.data.id}?api_key=${riotApiKey}`);
                }
                const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
                const latestVersion = versionsResponse.data[0];

                const championsResponse = await axios.get(
                    `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion.json`
                );

                const players = gameId.data.participants.map(async (participant) => {
                    const player = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${participant.summonerId}?api_key=${riotApiKey}`);
                    const championData = Object.values(championsResponse.data.data).find(
                        (champion) => champion.key == participant.championId
                    );
                    return `${player.data.name} (${championData.name})`;
                });

                Promise.all(players).then((playerList) => {
                    client.say(channel, `Joueurs dans la partie: ${playerList.join(', ')}`);
                });
            } catch (error) {
                client.say(channel, `Il y a eu un problème lors de la récupération de la partie :'(.`);
                console.error(error);
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
        const table = $('#tablaclasificacion');
        const rows = table.find('tr');
        const top3 = [];
        let bibou = null;
        rows.each((i, row) => {
            if (i === 0 || (top3.length === 3 && bibou)) return;
            const cells = $(row).find("td");

            const rank = $(cells[0]).text();
            const name = $(cells[2]).text().trim();
            const victories = $(cells[9]).text();
            const defeats = $(cells[10]).text();

            if (top3.length < 3) {
                top3.push({ rank, name, victories, defeats });
            }

            if (name.toLowerCase() === "bibou") {
                bibou = { rank, name, victories, defeats };
            }
        });
        console.log("Top 3 players:");
        console.log(top3);

        if (bibou) {
            console.log("Bibou's info:");
            return [top3, bibou]
        } else {
            console.log("Bibou not found in the table.");
            return [top3, null]
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getLiveGame(summonerName) {
    try {
        const browser = await puppeteer.launch({ headless: true });
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
        const notInGameElement = 'p[data-v-6315f91d=""]';
        const playerNameElement = '.player-name';
        const elementFound = await Promise.race([
            page.waitForSelector(notInGameElement, { visible: true, timeout: 5000 }).then(() => 'notInGame'),
            page.waitForSelector(playerNameElement, { visible: true, timeout: 5000 }).then(() => 'playerName'),
        ]);

        if (elementFound === 'notInGame') {
            console.log('Summoner not in game');
            throw new Error('Summoner not in game');
            return;
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


    } catch (error) {
        console.error(error);
    }
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
        console.error('Erreur lors de la recherche et de la mise en file d\'attente d\'une chanson:', error);
        client.say(channel, 'Erreur lors de la recherche et de la mise en file d\'attente d\'une chanson.');
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
var winrate = {};
var winrateDelay = 1000 * 60 * 2;
var lastWinrate = 0;
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
        [bibou, yorichii] = username.split("-");
        var account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${bibou}?api_key=${riotApiKey}`);
        const bibouId = account.data.puuid;
        account = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${yorichii}?api_key=${riotApiKey}`);
        const yorichiiId = account.data.puuid;
        // Récupération des 500 dernières parties
        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${bibouId}/ids?start=0&count=35&api_key=${riotApiKey}`);
        const matchList2 = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${yorichiiId}/ids?start=0&count=35&api_key=${riotApiKey}`);
        var matches = matchList.data;
        matches = matches.concat(matchList2.data);
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
                // Check if the game contains both currentChamp and opponentChampId
                const bibou = matchDetails.info.participants.find(participant => participant.championName === champName);
                if (opponentChamp === "") {
                    if (bibou) {
                        (i < 35 ? totalGamesBibou++ : totalGamesYorichii++);
                        if (bibou.win) {
                            (i < 35 ? bibouWins++ : yorichiiWins++);
                        }
                    }

                } else {
                    const oppponent = matchDetails.info.participants.find(participant => participant.championName === opponentChamp);

                    if (bibou && oppponent) {
                        (i < 35 ? totalGamesBibou++ : totalGamesYorichii++);
                        // Check if bibou won the game
                        if (bibou.win) {
                            (i < 35 ? bibouWins++ : yorichiiWins++);
                        }
                    }
                }

            }
        }
        var winRateBibou = (totalGamesBibou === 0 ? NaN : bibouWins / totalGamesBibou);
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
