
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('connect-button').addEventListener('click', function () {
        fetch('/connect', {
            method: 'GET', // Use GET or POST method, depending on your needs
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network error while attempting to connect.');
                }
                return response.json();
            })
            .then((data) => {
                console.log('Connected successfully:', data);
            })
            .catch((error) => {
                console.error('Error while connecting:', error);
            });
    });

    document.getElementById('allowMusic').addEventListener('click', function () {
        fetch('/api/allowMusic', {
            method: 'GET', // Use GET or POST method, depending on your needs
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network error while attempting to allow music.');
                }
                return response.json();
            })
            .then((data) => {
                console.log('allow music successfully:', data);
            })
            .catch((error) => {
                console.error('Error while allowing music:', error);
            });
    });
    document.getElementById('disallowMusic').addEventListener('click', function () {
        fetch('/api/denyMusic', {
            method: 'GET', // Use GET or POST method, depending on your needs
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network error while attempting to deny music.');
                }
                return response.json();
            })
            .then((data) => {
                console.log('deny music successfully:', data);
            })
            .catch((error) => {
                console.error('Error while denying music:', error);
            });
    });
    document.getElementById('giveawayForm').addEventListener('submit', fetchGiveaway);


});
function fetchGiveaway(event) {
    event.preventDefault();
    fetch('/api/giveaway', {
      method: 'GET'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network error while attempting to fetch giveaway.');
      }
      return response.json();
    })
    .then(data => {
      giveaway = data;
      console.log('Fetched giveaway:', giveaway);
      // access the HTML elements and fill them with the data
      const participantsList = document.getElementById('nomsParticipants');
      const winnerName = document.getElementById('nomGagnant');
      if(giveaway.participants.length != 0){
        participantsList.innerHTML = '';
        for (let participant of Array.from(giveaway.participants)) {
          const li = document.createElement('li');
          li.innerHTML = participant;
          participantsList.appendChild(li);
        }
        document.getElementById('participants').style.display = 'block';
        winnerName.textContent = giveaway.winner;
        document.getElementById('gagnant').style.display = 'block';
    }else{
        document.getElementById('erreurMessage').textContent = 'Aucun giveway terminé';
    }
      
    })
    .catch(error => {
      console.error('Error while fetching giveaway:', error);
    });
  }
  

function setDelay(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const dureeInput = document.getElementById('duree');
    const duree = dureeInput.value;
    fetch('/api/setDelay', {
        method: 'POST',
        body: JSON.stringify({ delay: duree }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(data => console.log(data.message))
        .catch(error => console.error(error));
}


