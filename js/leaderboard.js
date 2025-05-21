/****************************************************************
 * leaderboard.js — Firebase leaderboard functionality
 ****************************************************************/

export class Leaderboard {
  constructor(gameConfig) {
    this.db = firebase.firestore();
    this.gameConfig = gameConfig;
    this.leaderboardCollection = this.db.collection('leaderboard');
    this.refreshInterval = null;
    
    // Change default filter values to depth=12, width=5
    this.currentFilterDepth = 12;
    this.currentFilterWidth = 5;
    
    this.setupEventListeners();
    
    // Load leaderboard immediately on page load
    this.loadLiveLeaderboard();
    
    // Set up auto-refresh (every 2 minutes)
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Submit score button
    document.getElementById('submit-score').addEventListener('click', () => {
      this.submitScore();
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
      document.getElementById('leaderboard-modal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === document.getElementById('leaderboard-modal')) {
        document.getElementById('leaderboard-modal').style.display = 'none';
      }
    });
    
    // Setup leaderboard filter controls
    document.getElementById('filter-leaderboard').addEventListener('click', () => {
      const depth = parseInt(document.getElementById('leaderboardDepthSlider').value);
      const width = parseInt(document.getElementById('leaderboardWidthSlider').value);
      
      this.currentFilterDepth = depth;
      this.currentFilterWidth = width;
      
      // Update the UI
      document.getElementById('leaderboardDepthVal').textContent = depth;
      document.getElementById('leaderboardWidthVal').textContent = width;
      
      // Load the filtered leaderboard
      this.loadLiveLeaderboard();
    });

    // Setup sliders to update their value displays
    document.getElementById('leaderboardDepthSlider').addEventListener('input', (e) => {
      document.getElementById('leaderboardDepthVal').textContent = e.target.value;
    });
    
    document.getElementById('leaderboardWidthSlider').addEventListener('input', (e) => {
      document.getElementById('leaderboardWidthVal').textContent = e.target.value;
    });
  }

  startAutoRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Refresh the leaderboard every 2 minutes
    this.refreshInterval = setInterval(() => {
      this.loadLiveLeaderboard();
    }, 120000); // 2 minutes
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
    
    // CRITICAL FIX: Double-check that we're using the current values
    // Get these directly from the CONFIG object, DOM, and game state
    const cost = parseInt(document.getElementById('final-cost').textContent);
    
    // Get current values from multiple sources to ensure correctness
    let depth, width;
    
    // Try to get from final score display which shows actual game values
    const scoreText = document.getElementById('final-score-details');
    if (scoreText && scoreText.textContent) {
      const match = scoreText.textContent.match(/Depth: (\d+), Width: (\d+)/);
      if (match) {
        depth = parseInt(match[1]);
        width = parseInt(match[2]);
      }
    }
    
    // Fallback to slider values if the above failed
    if (!depth || !width) {
      depth = parseInt(document.getElementById('depthVal').textContent);
      width = parseInt(document.getElementById('widthVal').textContent);
    }
    
    // Final fallback to CONFIG if it exists globally
    if ((!depth || !width) && window.CONFIG) {
      depth = window.CONFIG.DEPTH;
      width = window.CONFIG.WIDTH;
    }
    
    // Ensure we have valid numbers
    depth = depth || this.gameConfig.DEPTH || 12;
    width = width || this.gameConfig.WIDTH || 5;
    
    console.log(`Submitting score with depth=${depth}, width=${width}`); // Debugging
    
    // Calculate relative score
    const relativeScore = this.calculateRelativeScore(cost, depth, width);
    
    // Disable the button to prevent multiple submissions
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    messageEl.textContent = ''; // Clear any previous messages
    
    try {
      // Add score to Firestore with the CURRENT game dimensions
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
      
      // Set current filter to match the submitted score dimensions
      this.currentFilterDepth = depth;
      this.currentFilterWidth = width;
      
      // Update sliders to match current filters
      document.getElementById('leaderboardDepthSlider').value = depth;
      document.getElementById('leaderboardDepthVal').textContent = depth;
      document.getElementById('leaderboardWidthSlider').value = width;
      document.getElementById('leaderboardWidthVal').textContent = width;
      
      // Refresh the live leaderboard
      this.loadLiveLeaderboard();
      
    } catch (error) {
      console.error('Error submitting score:', error);
      messageEl.textContent = 'Error submitting score. Please try again.';
      messageEl.style.color = '#f44336';
    } finally {
      // Always reset the button state regardless of success/failure
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Score';
    }
  }

  async loadLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading leaderboard data...</td></tr>';
    
    try {
      // Get scores filtered by current dimensions
      const snapshot = await this.leaderboardCollection
        .where('depth', '==', this.currentFilterDepth)
        .where('width', '==', this.currentFilterWidth)
        .orderBy('relativeScore', 'asc')
        .limit(100)
        .get();
      
      this.populateLeaderboard(snapshot, tableBody);
      
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading leaderboard data. Please try again.</td></tr>';
    }
  }
  
  async loadLiveLeaderboard() {
    const tableBody = document.getElementById('live-leaderboard-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-message">Loading leaderboard data...</td></tr>';
    
    try {
      // Get scores filtered by current dimensions
      const snapshot = await this.leaderboardCollection
        .where('depth', '==', this.currentFilterDepth)
        .where('width', '==', this.currentFilterWidth)
        .orderBy('relativeScore', 'asc')
        .limit(100)
        .get();
      
      this.populateLeaderboard(snapshot, tableBody);
      
      // Update "last updated" timestamp
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      document.getElementById('last-updated').textContent = `Last updated: ${timeString}`;
      
      // Update dimension indicator
      const dimensionIndicator = document.getElementById('dimension-indicator') || 
        document.createElement('div');
      dimensionIndicator.id = 'dimension-indicator';
      dimensionIndicator.className = 'dimension-indicator';
      dimensionIndicator.textContent = `Showing: Depth ${this.currentFilterDepth}, Width ${this.currentFilterWidth}`;
      
      const leaderboardControls = document.querySelector('.leaderboard-controls');
      if (!document.getElementById('dimension-indicator')) {
        leaderboardControls.appendChild(dimensionIndicator);
      }
      
    } catch (error) {
      console.error('Error loading live leaderboard:', error);
      tableBody.innerHTML = '<tr><td colspan="7" class="loading-message">Error loading leaderboard data. Please try again.</td></tr>';
    }
  }
  
  populateLeaderboard(snapshot, tableBody) {
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="7" class="loading-message">No scores for Depth ' + 
        this.currentFilterDepth + ', Width ' + this.currentFilterWidth + ' yet!</td></tr>';
      return;
    }
    
    // Clear the table
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
        <td>${data.cost}</td>
        <td>${data.depth}</td>
        <td>${data.width}</td>
        <td>${formattedDate}</td>
      `;
      
      tableBody.appendChild(row);
      rank++;
    });
  }
  
  // Auto-fill username if previously saved
  autoFillUsername() {
    const savedUsername = localStorage.getItem('ultrametricUsername');
    if (savedUsername) {
      document.getElementById('username-input').value = savedUsername;
    }
  }
  
  // Clean up when page unloads
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  updateGameConfig(newConfig) {
    this.gameConfig = newConfig;
  }
}

// Add window unload handler to clean up the refresh interval
window.addEventListener('beforeunload', () => {
  if (window.leaderboard && typeof window.leaderboard.destroy === 'function') {
    window.leaderboard.destroy();
  }
}); 