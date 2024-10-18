chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm fired:', alarm);
    if (alarm.name.startsWith('tabReminder_')) {
      const tabId = parseInt(alarm.name.split('_')[1]);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting tab:', chrome.runtime.lastError);
          return;
        }
        
        chrome.notifications.create(alarm.name, {
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Tab Reminder',
          message: `Time to check: ${tab.title}`,
          requireInteraction: true
        }, (notificationId) => {
          console.log('Notification created:', notificationId);
        });
      });
    }
  });
  
  chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('Notification clicked:', notificationId);
    if (notificationId.startsWith('tabReminder_')) {
      const tabId = parseInt(notificationId.split('_')[1]);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting tab:', chrome.runtime.lastError);
          return;
        }
        
        chrome.tabs.update(tabId, { active: true }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error activating tab:', chrome.runtime.lastError);
          } else {
            chrome.windows.update(tab.windowId, { focused: true });
          }
        });
      });
      
      // Clear the notification after clicking
      chrome.notifications.clear(notificationId);
    }
  });
  