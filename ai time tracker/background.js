// List of websites to track
const trackedSites = [
    'chat.openai.com',
    'bard.google.com',
    'claude.ai',
    'gemini.google.com',
    'facebook.com',
    'instagram.com',
    'youtube.com'
  ];
  
  // State tracking
  let activeTabId = null;
  let startTime = null;
  let currentSite = null;
  let notifiedSites = {};
  
  // Initialize data for a new day
  function initializeDataForToday() {
    const today = new Date().toLocaleDateString();
    
    chrome.storage.local.get(['lastDate', 'siteData'], (result) => {
      // If it's a new day or no data exists, reset the data
      if (!result.lastDate || result.lastDate !== today) {
        const newSiteData = {};
        trackedSites.forEach(site => {
          newSiteData[site] = 0; // Time in seconds
        });
        
        chrome.storage.local.set({
          lastDate: today,
          siteData: newSiteData,
          totalTimeToday: 0
        });
        
        // Reset the notified sites for the new day
        notifiedSites = {};
      }
    });
  }
  
  // Extract domain from URL
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Remove 'www.' if it exists
      const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
      
      // Check if the domain or any of its parts match our tracked sites
      for (const site of trackedSites) {
        if (domain === site || domain.endsWith('.' + site)) {
          return site;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // Update time for the current site
  function updateTime() {
    if (startTime && currentSite) {
      const now = Date.now();
      const timeSpent = Math.floor((now - startTime) / 1000); // Convert to seconds
      startTime = now;
      
      chrome.storage.local.get(['siteData', 'totalTimeToday'], (result) => {
        const siteData = result.siteData || {};
        const prevTime = siteData[currentSite] || 0;
        const newTime = prevTime + timeSpent;
        siteData[currentSite] = newTime;
        
        const totalTimeToday = (result.totalTimeToday || 0) + timeSpent;
        
        chrome.storage.local.set({ 
          siteData: siteData,
          totalTimeToday: totalTimeToday
        });
        
        // Check if we need to send a notification (30 minutes = 1800 seconds)
        if (newTime >= 1800 && !notifiedSites[currentSite]) {
          notifiedSites[currentSite] = true;
          
          chrome.notifications.create('', {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Time Alert',
            message: `You've spent over 30 minutes on ${currentSite} today!`
          });
        }
      });
    }
  }
  
  // Handle tab changes
  function handleTabChange(tabId, url) {
    // Stop timing the previous tab if there was one
    if (startTime && currentSite) {
      updateTime();
    }
    
    // Start timing the new tab if it's a tracked site
    const domain = url ? extractDomain(url) : null;
    
    if (domain) {
      currentSite = domain;
      startTime = Date.now();
      activeTabId = tabId;
    } else {
      currentSite = null;
      startTime = null;
      activeTabId = null;
    }
  }
  
  // Initialize on extension startup
  chrome.runtime.onStartup.addListener(() => {
    initializeDataForToday();
  });
  
  // Initialize when extension is installed
  chrome.runtime.onInstalled.addListener(() => {
    initializeDataForToday();
    
    // Create an alarm to check for date changes (runs every hour)
    chrome.alarms.create('checkDate', { periodInMinutes: 60 });
  });
  
  // Setup alarm listener to check for date changes
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkDate') {
      initializeDataForToday();
    }
  });
  
  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      handleTabChange(tabId, tab.url);
    }
  });
  
  // Listen for tab activation
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      handleTabChange(tab.id, tab.url);
    });
  });
  
  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus, stop timing
      if (startTime && currentSite) {
        updateTime();
        startTime = null;
      }
    } else {
      // Browser gained focus, check active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          handleTabChange(tab.id, tab.url);
        }
      });
    }
  });
  
  // Check every minute to update time for long-running sessions
  setInterval(() => {
    if (startTime && currentSite) {
      updateTime();
    }
  }, 60000); // Check every minute