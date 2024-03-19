document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/get_channel_points', {
        method: 'GET',
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network error while attempting to get channel points.');
            }
            return response.json();
        })
        .then((data) => {
             console.log('channel points successfully:', data);
              const tableBody = document.querySelector('#table-body');
              
              // loop through the data and create a row for each object
              data.forEach((item, index) => {
                const row = document.createElement('tr');
                
                const positionCell = document.createElement('td');
                positionCell.textContent = index + 1;
                row.appendChild(positionCell);
                
                const pseudoCell = document.createElement('td');
                pseudoCell.textContent = item.username;
                row.appendChild(pseudoCell);
                
                const pointsCell = document.createElement('td');
                pointsCell.textContent = item.points;
                row.appendChild(pointsCell);

                const levelCell = document.createElement('td');
                let level = Math.floor(Math.sqrt(item.points));
                if(isNaN(level) || level == 0) level = "Arf t'es nul"
                levelCell.textContent = level;
                row.appendChild(levelCell);
                tableBody.appendChild(row);
              });
              
        })
        .catch((error) => {
            console.error('Error while getting channel points:', error);
        });
        document.querySelector('#channel_point_form').addEventListener('submit', function (event) {
            event.preventDefault();
            const username = document.querySelector('#username').value;
            const url = `/api/get_channel_points?username=${encodeURIComponent(username)}`;
            fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }})
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network error while attempting to set channel points.');
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if(data != null){
                            console.log('channel points successfully:', data);
                            const tableBody = document.querySelector('#user_score_body');
                            tableBody.innerHTML = '';
                            const row = document.createElement('tr');
                            const positionCell = document.createElement('td');
                            positionCell.textContent = data.index + 1;
                            row.appendChild(positionCell);
                            const pseudoCell = document.createElement('td');
                            pseudoCell.textContent = data.user.username;
                            row.appendChild(pseudoCell);
                            
                            const pointsCell = document.createElement('td');
                            pointsCell.textContent = data.user.points;
                            row.appendChild(pointsCell);
                            
                            tableBody.appendChild(row);
                        }
                        else{
                            const tableBody = document.querySelector('#user_score_body');
                            tableBody.innerHTML = '';
                            const row = document.createElement('tr');
                            const positionCell = document.createElement('td');
                            positionCell.textContent = 'Utilisateur non trouvé';
                            row.appendChild(positionCell);
                            tableBody.appendChild(row);
                        }
                    
                        
                    })
                    .catch((error) => {
                        console.error('Error while setting channel points:', error);
                    });
            });
        
});