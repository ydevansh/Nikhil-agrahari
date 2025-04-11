const trackedSites = [
    'chat.openai.com',
    'bard.google.com',
    'claude.ai',
    'gemini.google.com',
    'facebook.com',
    'instagram.com',
    'youtube.com'
  ];
  function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }
  function formatTimeInMinutes(seconds) {
    const minutes = Math.ceil(seconds / 60); 
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  function updateStats() {
    chrome.storage.local.get(['siteData', 'totalTimeToday'], (result) => {
      const siteData = result.siteData || {};
      const totalTimeToday = result.totalTimeToday || 0;
      document.getElementById('total-time').textContent = formatTimeInMinutes(totalTimeToday);
      const siteStatsDiv = document.getElementById('site-stats');
      siteStatsDiv.innerHTML = '';
      const progressBarsDiv = document.getElementById('progress-bars');
      progressBarsDiv.innerHTML = '';
      const sortedSites = trackedSites
        .filter(site => siteData[site] > 0)
        .sort((a, b) => siteData[b] - siteData[a]);
      if (sortedSites.length === 0) {
        siteStatsDiv.innerHTML = '<p class="no-data">No site visits recorded today</p>';
      } else {
        const maxTime = Math.max(...Object.values(siteData), 1800); 
        sortedSites.forEach(site => {
          const timeSpent = siteData[site];
          const siteDiv = document.createElement('div');
          siteDiv.className = 'site-stat';
          
          const siteName = document.createElement('div');
          siteName.className = 'site-name';
          siteName.textContent = site;
          
          const siteTime = document.createElement('div');
          siteTime.className = 'site-time';
          siteTime.textContent = formatTime(timeSpent);
          
          siteDiv.appendChild(siteName);
          siteDiv.appendChild(siteTime);
          siteStatsDiv.appendChild(siteDiv);
          const progressBar = document.createElement('div');
          progressBar.className = 'progress-bar';
          
          const progressFill = document.createElement('div');
          progressFill.className = 'progress-fill';
          const percentage = (timeSpent / maxTime) * 100;
          progressFill.style.width = `${percentage}%`;
          if (timeSpent >= 1800) {
            progressFill.classList.add('warning');
          }
          
          const progressLabel = document.createElement('div');
          progressLabel.className = 'progress-label';
          progressLabel.textContent = site;
          
          progressBar.appendChild(progressFill);
          progressBar.appendChild(progressLabel);
          progressBarsDiv.appendChild(progressBar);
        });
      }
    });
  }
  function resetStats() {
    const newSiteData = {};
    trackedSites.forEach(site => {
      newSiteData[site] = 0;
    });
    
    chrome.storage.local.set({
      siteData: newSiteData,
      totalTimeToday: 0
    }, () => {
      updateStats();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    document.getElementById('reset-button').addEventListener('click', resetStats);
  });