
const puppeteer = require('puppeteer');

const summonerName = 'Nisqy';

async function getLiveGame(summonerName) {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
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
        console.log(1);
        // Accédez à l'élément parent avec la classe "player-name-display"
        const playerNameDisplay = element.closest('.player');

        // Trouvez l'élément frère avec la classe "player-team"
        const playerTeamElement = playerNameDisplay.nextElementSibling;

        // Vérifiez si la classe "hide" est absente et récupérez le titre de l'équipe
        let teamTitle = 'Équipe inconnue';
        if (playerTeamElement && playerTeamElement.classList.contains('player-team') && !playerTeamElement.classList.contains('hide')) {
          const teamDetails = playerTeamElement.querySelector('.team-details');
          const titleElement = teamDetails.querySelector('.title');
          teamTitle = titleElement.innerText.trim();
        }

        return { playerName, teamTitle };
      });

      return { playerData };
    });

    console.log(liveGameData);

  } catch (error) {
    console.error(error);
  }
}

getLiveGame(summonerName);
