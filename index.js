//imports
const tmi = require('tmi.js');
const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
require('dotenv').config({ path: './.env' });

//data
const bibouSummonerName = "B1BZ";

const guessGame = JSON.parse(fs.readFileSync('./champ.json'));
const championNamesMatch = JSON.parse(fs.readFileSync('./championNames.json'));
const stuffs = JSON.parse(fs.readFileSync('./stuff.json'));

const ggs = JSON.parse(fs.readFileSync('./gg.json'));
const ffs = JSON.parse(fs.readFileSync('./clash.json'));
const zens = JSON.parse(fs.readFileSync('./focus.json'));

const champToGuess = { active: false, name: "", hint: 0 };
const giveaway = { active: false, participants: new Set(), winner: "", keyWord: "" };
const votes = { active: false, votes: {} };

//paramètres
let allow_music = true;

//credentials
const username = process.env.TWITCH_USERNAME;
const password = process.env.TWITCH_OAUTH;
const riotApiKey = process.env.RIOT_API_KEY;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI;
const bibouPuuid = process.env.BIBOU_PUUID;

const puuidMatching = {
    [bibouSummonerName]: bibouPuuid,
}
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
connect();

// Tes identifiants Spotify
const spotifyApi = new SpotifyWebApi({
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: spotifyRedirectUri,
});

// Authentification à l'API Spotify
spotifyApi.clientCredentialsGrant()
    .then(data => {
        console.log(`Le jeton d'accès Spotify a été récupéré : ${data.body['access_token']}`);
        spotifyApi.setAccessToken(data.body['access_token']);
    })
    .catch(err => {
        console.error('Erreur lors de la récupération du jeton d\'accès Spotify :', err);
    });

const app = express();
app.get('/login-spotify', (req, res) => {
    try {
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
    } catch (e) {
        console.log(e);
    }
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
const commandList = ["elo", "x", "music", "winrate", "queue",
    "guess", "streak", "giveaway", "enablemusic", "disablemusic", "stuff",
    "skin", "command", "help", "hint", "abandon", "gg", "ff", "zen" // pour arêter focus / run down plaindre / !lucian et 
];

const viewerCommandList = ["elo", "x", "music", "winrate", "queue", "stuff",
    "guess", "streak", "command", "help", "hint", "abandon", "gg", "ff", "zen"
];

client.on('message', async (channel, userstate, message, self) => {
    if (self) return;

    if (giveaway.active && message.toLowerCase() === giveaway.keyWord.toLowerCase()) {
        giveaway.participants.add(userstate['display-name']);
    }

    if (votes.active) {
        const vote = parseInt(message.trim());
        if (!isNaN(vote)) {
            if (votes.votes[vote]) {
                votes.votes[vote] += 1;
            } else {
                votes.votes[vote] = 1;
            }
        }
    }

    if (champToGuess.active) {
        await handleTry(channel, userstate, message)
    }

    if (message.charAt(0) === '!') {
        const { command, args } = parseCommand(message);
        console.log(command, args);
        switch (command) {
            case 'giveaway':
                await handleGiveaway(channel, userstate, args[0]);
                break;

            case 'gg':
                client.say(channel, ggs[Math.floor(Math.random() * ggs.length)]);
                break;

            case 'ff':
                client.say(channel, ffs[Math.floor(Math.random() * ffs.length)]);
                break;

            case 'zen':
                client.say(channel, zens[Math.floor(Math.random() * zens.length)]);
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
                        console.error('Erreur lors de la récupération des informations sur la musique en cours de lecture :', err);
                        client.say(channel, 'Bibou a oublié de se connecter à Spotify !');
                    });
                break;

            case 'queue':
                if (allow_music) {
                    const query = message.substring('!queue'.length).trim();
                    if (query.length > 0) {
                        await searchAndQueueSong(query, channel);
                    } else {
                        client.say(channel, 'Fourni une chanson. Exemple : !queue the beatles help');
                    }
                } else {
                    client.say(channel, 'Ajout de musique interdit');
                }
                break;

            case 'guess':
                if (!champToGuess.active) {
                    const randomChampion = Object.keys(guessGame)[Math.floor(Math.random() * Object.keys(guessGame).length)];
                    client.say(channel, `-> ${guessGame[randomChampion].slice(0, 2)}`);
                    champToGuess.name = randomChampion;
                    champToGuess.hint = 0;
                    champToGuess.active = true;
                }
                break;

            case 'hint':
                await handleHint(channel, userstate.username);
                break;

            case 'abandon':
                if (champToGuess.active) {
                    client.say(channel, `Le champion à deviner était ${champToGuess["name"]} !`);
                    champToGuess.active = false;
                }
                break;

            case 'streak':
                await handleStreak(channel);
                break;

            case 'elo':
                await handleElo(channel);
                break;

            case 'x':
                client.say(channel, `Check le x de Bibou : https://x.com/Bibou_euw`);
                break;

            case 'lolpro':
                client.say(channel, `Check le lol pro de Bibou : https://lolpros.gg/player/bibou`);
                break;

            case 'command':
            case 'help':
                client.say(channel, `Commandes disponibles : ${viewerCommandList.map(cmd => '!' + cmd).join(', ')}`);
                break;

            case 'game':
                await handleGame(channel, message);
                break;

            case 'skin':
                if (!votes.active) {
                    const championName = message.substring('!skin'.length).trim();
                    if (championName.length === 0) {
                        client.say(channel, `Veuillez entrer un nom de champion.`);
                    } else {
                        await handleSkin(channel, championName, userstate);
                    }
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
            
            case 'stuff':
                const championName = args.join(" ").trim();
                if (!championName) {
                    client.say(channel, `Veuillez entrer un nom de champion. Exemple : !stuff mf`);
                    break;
                }
                const champNameAttempt = championNamesMatch[championName] ?? championName;
                if (stuffs[champNameAttempt]) {
                    const twitterLink = stuffs[champNameAttempt];
                    client.say(channel, `Stuff de ${champNameAttempt} -> ${twitterLink}`);
                }
                break;
        }
    }
});

client.on('connected', (address, port) => {
    client.action("bibou_lol", "*** Je suis connecté ! ***");
});
// client.on('disconnected', (reason) => {
//     client.action("bibou_lol", "Je suis déconnecté !");
// });
// client.on('subscription', (channel, username, method, message, userstate) => {
//     client.action("bibou_lol", `Merci ${username} pour l'abonnement !`);
// });
// client.on('resub', (channel, username, months, message, userstate, methods) => {
//     client.action("bibou_lol", `Merci ${username} pour le ${months}ème mois d'abonnement !`);
// });
// client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
//     client.action("bibou_lol", `Merci ${username} pour l'abonnement offert à ${recipient} !`);
// });
// client.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => {
//     client.action("bibou_lol", `Merci ${username} pour les ${numbOfSubs} abonnements offerts !`);
// });
// client.on('cheer', (channel, userstate, message) => {
//     client.action("bibou_lol", `Merci ${userstate["display-name"]} pour le ${userstate.bits} bits !`);
// });
// client.on('raided', (channel, username, viewers) => {
//     client.action("bibou_lol", `Merci ${username} pour le raid de ${viewers} viewers !`);
// });
// client.on('hosted', (channel, username, viewers, autohost) => {
//     client.action("bibou_lol", `Merci ${username} pour l'host de ${viewers} viewers !`);
// });
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
    if (skins.length !== 0) {
        //envoie au chat le nom du champion et le nom de la skin avec le numéro du skin sans boucle for
        message = "";
        skins.forEach((skin, index) => {
            message += `${index + 1} -> ${skin} `;
        });
        client.say(channel, `Skins de ${championName} : ${message}`);
        votes.active = true;
        client.say(channel, `Vous avez 45s pour voter pour skin en envoyant le numéro du skin dans le chat.`);
        setTimeout(() => {
            // trouve le skin avec le plus de vote
            console.log(votes);
            let voteWinner = null;
            if (Object.keys(votes.votes).length === 0) {
                voteWinner = 1;
            } else {
                voteWinner = Object.keys(votes.votes).reduce((a, b) => votes.votes[a] > votes.votes[b] ? a : b);
                if (voteWinner > skins.length || voteWinner < 1) {
                    voteWinner = 1;
                }
                client.say(channel, `Le skin gagnant est ${skins[voteWinner - 1]}`);
                votes.active = false;
                votes.votes = {};
            }
        }, 45000);
    } else {
        client.say(channel, `Il y a eu un problème avec la récupération des skins.`);
    }
};

async function handleGiveaway(channel, userstate, name) {
    // check if the user is a mod or the broadcaster
    if (userstate.mod || userstate['display-name'] === channel.slice(1)) {
        if (name === undefined) name = "Bibou";
        client.say(channel, "Pour participer au giveaway, envoyez " + name + " dans le chat dans les prochaines 45s !");
        giveaway.keyWord = name;
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

    let [champName, oppChamp] = command.substring("!winrate".length).trim().split("/");
    champName = champName ? championNamesMatch[champName.trim()] ?? champName.trim() : "";
    oppChamp = oppChamp ? championNamesMatch[oppChamp.trim()] ?? oppChamp.trim() : "";

    console.log("champions : ", champName, oppChamp);
    stats = await getStats(champName, oppChamp);
    if (!stats) {
        client.say(channel, "La clé api a trop chauffé, attendons un peu...");
    }
    else {
        wr = stats[0];
        nbGame = stats[1];
        if (nbGame === 0)
            client.say(channel, "Bibou n'a pas joué recemment ce matchup");
        else {
            client.say(channel, `Bibou a un winrate de ${(wr * 100).toFixed(1)}% ${champName !== "" ? "avec " + champName : ""} ${oppChamp !== "" ? "contre " + oppChamp : ""} sur ses ${nbGame} dernières parties`);
        }
    }


}

async function handleHint(channel, username) {
    try {
        if (champToGuess.active) {
            if (champToGuess.hint < 2) {
                client.say(channel, `Voici un indice : ${guessGame[champToGuess.name][champToGuess.hint + 2]}`);
                champToGuess.hint++;
            } else {
                client.say(channel, `Vous avez déjà utilisé tous les indices !`);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function handleTry(channel, userstate, message) {
    if (champToGuess.active) {
        let champName = message.trim();
        champName = championNamesMatch[champName] ?? champName;
        const distance = jaroWinklerDistance(champName.toLowerCase(), champToGuess.name.toLowerCase());
        console.log(`Distance entre ${champName} et ${champToGuess.name} : ${distance}`);
        if (distance >= 90) {
            client.say(channel, `Bravo ${userstate.username} ! C'était bien ${champToGuess.name}`);
            champToGuess.active = false;
        }
    }
}

async function handleStreak(channel) {
    const streak = await getMatchHistory(bibouSummonerName);
    client.say(channel, `Streak de Bibou : ${streak}`);
}

async function getMatchHistory(username) {
    const histo = [];
    try {
        // Récupération des 20 dernières parties
        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuidMatching[username]}/ids?start=0&count=20&api_key=${riotApiKey}`);
        const matches = matchList.data;

        // Traitement de chaque partie
        let nb = 0;
        for (let i = 0; i < matches.length; i++) {
            if (nb === 5) break;
            const matchId = matches[i];

            // Récupération des détails de la partie
            const match = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = match.data;
            if (matchDetails.info.gameMode === "CLASSIC") {
                // Récupération du résultat de la partie (victoire ou défaite)
                let result = '';
                const participant = matchDetails.info.participants.find(p => p.puuid === puuidMatching[username]);
                if (participant) {
                    result = participant.win ? '✅' : '❌';
                    histo.push(result);
                    nb++;
                }
            }
        }
        return histo;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des parties :', error);
    }
}

async function handleElo(channel) {
    const summonerNames = [bibouSummonerName] //'Yoriichı'];

    const getSummonerInfo = async (summonerName) => {
        try {
            // Récupère les informations de la ligue
            const leagueResponse = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuidMatching[summonerName]}?api_key=${riotApiKey}`);
            const leagueData = leagueResponse.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');

            if (!leagueData) {
                client.say(channel, `${summonerName} n'a pas encore joué de parties classées en solo cette saison.`);
            } else {
                const tier = leagueData.tier;
                const rank = leagueData.rank;
                const lp = leagueData.leaguePoints;

                client.say(channel, ` biboulolGG ${summonerName} est ${tier} ${rank} ${lp} LP.`);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données de la ligue :', error);
            client.say(channel, 'Désolé, une erreur est survenue lors de la récupération des données de la ligue.');
        }
    };
    summonerNames.forEach(getSummonerInfo);
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
            } else {
                console.error('Erreur lors de la récupération des données de la partie en direct', error);
                client.say(channel, `Désolé, une erreur est survenue.`);
            }
        }
    })();
}

async function fetchChampionSkins(championName) {
    try {
        championName = championName.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
        // Récupérer les données statiques des champions
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionsResponse.data[0];
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion/${championName}.json`);
        const championData = response.data.data[championName];
        if (!championData) {
            console.error('Champion introuvable');
            return [];
        }
        const skinNames = championData.skins.map(skin => skin.name);
        return skinNames;
    } catch (error) {
        console.error('Erreur lors de la récupération des données', error);
        return [];
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

async function getStats(champName, opponentChamp = "") {
    // Récupération de l'ID du compte à partir du nom d'utilisateur et du serveur
    try {

        const matchList = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(bibouPuuid)}/ids?start=0&count=50&api_key=${riotApiKey}`);
        const matches = matchList.data;

        // Traitement de chaque partie
        let totalGames = 0;
        let bibouWins = 0;
        for (let i = 0; i < matches.length; i++) {
            const matchId = matches[i];
            // Retrieving match details
            const match = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
            const matchDetails = match.data;
            if (matchDetails.info.gameMode === "CLASSIC") {
                const bibou = matchDetails.info.participants.find(participant => participant.puuid === bibouPuuid);
                if (!champName && !opponentChamp) {
                    totalGames++;
                    bibouWins += bibou.win ? 1 : 0;

                }
                else if (champName && !opponentChamp) {
                    if (bibou.championName === champName) {
                        totalGames++;
                        bibouWins += bibou.win ? 1 : 0;

                    }
                }
                else {
                    const opponent = matchDetails.info.participants.find(participant => participant.championName === opponentChamp);
                    if (bibou.championName === champName && opponent) {
                        totalGames++;
                        bibouWins += bibou.win ? 1 : 0;
                    }
                }
            }
        }
        return [totalGames ? bibouWins / totalGames : 0, totalGames];

    } catch (error) {
        console.log(error);
    }
    return;
}
