/****************************************************************
 * leaderboard.js — Firebase leaderboard functionality
 ****************************************************************/

export class Leaderboard {
  constructor(gameConfig) {
    this.db = firebase.firestore();
    this.gameConfig = gameConfig;
    this.leaderboardCollection = this.db.collection('leaderboard');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Submit score button
    document.getElementById('submit-score').addEventListener('click', () => {
      this.submitScore();
    });

    // Show leaderboard button
    document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
      this.openLeaderboard();
    });

    // Close modal button
    document.querySelector('.close-modal').addEventListener('click', () => {
      document.getElementById('leaderboard-modal').style.display = 'none';
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
      if (e.target === document.getElementById('leaderboard-modal')) {
        document.getElementById('leaderboard-modal').style.display = 'none';
      }
    });
  }

  openLeaderboard() {
    this.loadLeaderboard();
    document.getElementById('leaderboard-modal').style.display = 'block';
  }

  calculateRelativeScore(cost, depth, width) {
    return (cost / depth / Math.log(width)).toFixed(2);
  }

  async submitScore() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim() || 'Anonymous';
    const submitBtn = document.getElementById('submit-score');
    const messageEl = document.getElementById('submission-message');
    
    // Get current game stats
    const cost = parseInt(document.getElementById('final-cost').textContent);
    const depth = this.gameConfig.DEPTH;
    const width = this.gameConfig.WIDTH;
    
    // Calculate relative score
    const relativeScore = this.calculateRelativeScore(cost, depth, width);
    
    // Disable the button to prevent multiple submissions
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
      // Add score to Firestore
      await this.leaderboardCollection.add({
        username: username,
        cost: cost,
        depth: depth,
        width: width,
        relativeScore: parseFloat(relativeScore),
        dateSubmitted: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      messageEl.textContent = 'Score submitted successfully!';
      messageEl.style.color = '#4caf50';
      
      // Store the username in localStorage for future submissions
      localStorage.setItem('ultrametricUsername', username);
      
      // Load the leaderboard after submitting
      this.openLeaderboard();
      
    } catch (error) {
      console.error('Error submitting score:', error);
      messageEl.textContent = 'Error submitting score. Please try again.';
      messageEl.style.color = '#f44336';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Score';
    }
  }

  async loadLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading leaderboard data...</td></tr>';
    
    try {
      // Get top 100 scores ordered by relative score (ascending = better)
      const snapshot = await this.leaderboardCollection
        .orderBy('relativeScore', 'asc')
        .limit(100)
        .get();
      
      if (snapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No scores submitted yet!</td></tr>';
        return;
      }
      
      // Clear the loading message
      tableBody.innerHTML = '';
      
      // Get current user's name
      const currentUser = localStorage.getItem('ultrametricUsername') || '';
      
      // Populate leaderboard
      let rank = 1;
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        
        // Highlight current user's score
        if (data.username === currentUser && currentUser !== 'Anonymous' && currentUser !== '') {
          row.classList.add('user-score');
        }
        
        // Format date
        const date = data.dateSubmitted ? new Date(data.dateSubmitted.toDate()) : new Date();
        const formattedDate = date.toLocaleDateString();
        
        row.innerHTML = `
          <td>${rank}</td>
          <td>${data.username}</td>
          <td>${data.relativeScore}</td>
          <td>${data.depth}</td>
          <td>${data.width}</td>
          <td>${formattedDate}</td>
        `;
        
        tableBody.appendChild(row);
        rank++;
      });
      
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading leaderboard data. Please try again.</td></tr>';
    }
  }
  
  // Auto-fill username if previously saved
  autoFillUsername() {
    const savedUsername = localStorage.getItem('ultrametricUsername');
    if (savedUsername) {
      document.getElementById('username-input').value = savedUsername;
    }
  }
} 