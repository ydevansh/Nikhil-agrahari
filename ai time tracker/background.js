
const trackedSites = [
    'chat.openai.com',
    'bard.google.com',
    'claude.ai',
    'gemini.google.com',
    'facebook.com',
    'instagram.com',
    'youtube.com'
  ];
  

  let activeTabId = null;
  let startTime = null;
  let currentSite = null;
  let notifiedSites = {};
  
  function initializeDataForToday() {
    const today = new Date().toLocaleDateString();
    
    chrome.storage.local.get(['lastDate', 'siteData'], (result) => {
      if (!result.lastDate || result.lastDate !== today) {
        const newSiteData = {};
        trackedSites.forEach(site => {
          newSiteData[site] = 0; 
        });
        
        chrome.storage.local.set({
          lastDate: today,
          siteData: newSiteData,
          totalTimeToday: 0
        });

        notifiedSites = {};
      }
    });
  }

  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
  
      const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

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
 
  function updateTime() {
    if (startTime && currentSite) {
      const now = Date.now();
      const timeSpent = Math.floor((now - startTime) / 1000); 
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

  function handleTabChange(tabId, url) {

    if (startTime && currentSite) {
      updateTime();
    }
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

  chrome.runtime.onStartup.addListener(() => {
    initializeDataForToday();
  });

  chrome.runtime.onInstalled.addListener(() => {
    initializeDataForToday();
 
    chrome.alarms.create('checkDate', { periodInMinutes: 60 });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkDate') {
      initializeDataForToday();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      handleTabChange(tabId, tab.url);
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      handleTabChange(tab.id, tab.url);
    });
  });

  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      if (startTime && currentSite) {
        updateTime();
        startTime = null;
      }
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          handleTabChange(tab.id, tab.url);
        }
      });
    }
  });
  setInterval(() => {
    if (startTime && currentSite) {
      updateTime();
    }
  }, 60000); 