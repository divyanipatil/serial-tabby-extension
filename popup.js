document.addEventListener('DOMContentLoaded', () => {
    loadTabs();
    document.getElementById('searchInput').addEventListener('input', searchTabs);
    document.getElementById('setReminderBtn').addEventListener('click', handleSetReminder);
    document.getElementById('cancelReminderBtn').addEventListener('click', closeReminderModal);
  });
  
  let currentTabId = null;
  
  function loadTabs() {
    chrome.tabs.query({}, (tabs) => {
      chrome.alarms.getAll((alarms) => {
        const tabsWithAlarms = new Set(alarms.map(alarm => parseInt(alarm.name.split('_')[1])));
        
        const tabGroupsDiv = document.getElementById('tabGroups');
        tabGroupsDiv.innerHTML = '';
        
        // Section for tabs with active reminders
        const activeRemindersSection = document.createElement('div');
        activeRemindersSection.className = 'tab-section';
        activeRemindersSection.innerHTML = '<h2>Active Reminders</h2>';
        
        // Section for tabs without reminders
        const otherTabsSection = document.createElement('div');
        otherTabsSection.className = 'tab-section';
        otherTabsSection.innerHTML = '<h2>Other Tabs</h2>';
        
        const otherTabsGroups = {};
        
        tabs.forEach(tab => {
          const tabDiv = createTabElement(tab);
          if (tabsWithAlarms.has(tab.id)) {
            activeRemindersSection.appendChild(tabDiv);
          } else {
            const domain = new URL(tab.url).hostname;
            if (!otherTabsGroups[domain]) {
              otherTabsGroups[domain] = document.createElement('div');
              otherTabsGroups[domain].className = 'tab-group';
              otherTabsGroups[domain].innerHTML = `<h3>${domain}</h3>`;
            }
            otherTabsGroups[domain].appendChild(tabDiv);
          }
        });
        
        tabGroupsDiv.appendChild(activeRemindersSection);
        
        // Add domain groups to the other tabs section
        for (const domainGroup of Object.values(otherTabsGroups)) {
          otherTabsSection.appendChild(domainGroup);
        }
        
        tabGroupsDiv.appendChild(otherTabsSection);
      });
    });
  }
  
  function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab';
    tabDiv.innerHTML = `
      <img src="${tab.favIconUrl || 'default-favicon.png'}" alt="Favicon">
      <span class="tab-title">${tab.title}</span>
      <span class="reminder-timer" id="timer-${tab.id}"></span>
      <button class="reminder-btn" data-tab-id="${tab.id}">Set Reminder</button>
    `;
    
    tabDiv.addEventListener('click', (event) => {
      if (!event.target.classList.contains('reminder-btn')) {
        activateTab(tab.id);
      }
    });
    
    const reminderBtn = tabDiv.querySelector('.reminder-btn');
    reminderBtn.addEventListener('click', () => openReminderModal(tab.id));
    
    updateReminderTimer(tab.id);
    
    return tabDiv;
  }
  
  function activateTab(tabId) {
    chrome.tabs.update(tabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error activating tab:', chrome.runtime.lastError);
      } else {
        window.close();
      }
    });
  }
  
  function searchTabs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeRemindersSection = document.querySelector('.tab-section:first-child');
    const otherTabsSection = document.querySelector('.tab-section:last-child');
    let activeRemindersVisible = false;
    let otherTabsVisible = false;
  
    // Search in Active Reminders section
    const activeReminders = activeRemindersSection.querySelectorAll('.tab');
    activeReminders.forEach(tab => {
      const tabTitle = tab.querySelector('.tab-title').textContent.toLowerCase();
      if (tabTitle.includes(searchTerm)) {
        tab.style.display = 'flex';
        activeRemindersVisible = true;
      } else {
        tab.style.display = 'none';
      }
    });
  
    // Search in Other Tabs section
    const otherTabGroups = otherTabsSection.querySelectorAll('.tab-group');
    otherTabGroups.forEach(group => {
      let groupVisible = false;
      const tabs = group.querySelectorAll('.tab');
      tabs.forEach(tab => {
        const tabTitle = tab.querySelector('.tab-title').textContent.toLowerCase();
        if (tabTitle.includes(searchTerm)) {
          tab.style.display = 'flex';
          groupVisible = true;
          otherTabsVisible = true;
        } else {
          tab.style.display = 'none';
        }
      });
      group.style.display = groupVisible ? 'block' : 'none';
    });
  
    // Show/hide sections based on search results
    activeRemindersSection.style.display = activeRemindersVisible ? 'block' : 'none';
    otherTabsSection.style.display = otherTabsVisible ? 'block' : 'none';
  }
  
  function openReminderModal(tabId) {
    currentTabId = tabId;
    document.getElementById('reminderModal').style.display = 'block';
  }
  
  function closeReminderModal() {
    document.getElementById('reminderModal').style.display = 'none';
    currentTabId = null;
  }
  
  function handleSetReminder() {
    const relativeTime = document.getElementById('relativeTime').value;
    const relativeUnit = document.getElementById('relativeUnit').value;
    const absoluteTime = document.getElementById('absoluteTime').value;
  
    if (relativeTime) {
      setRelativeReminder(currentTabId, relativeTime, relativeUnit);
    } else if (absoluteTime) {
      setAbsoluteReminder(currentTabId, absoluteTime);
    } else {
      alert('Please set either a relative or absolute time for the reminder.');
      return;
    }
  
    closeReminderModal();
    loadTabs(); // Reload tabs to reflect the new organization
  }
  
  function setRelativeReminder(tabId, time, unit) {
    let delayInMinutes;
    switch (unit) {
      case 'seconds':
        delayInMinutes = time / 60;
        break;
      case 'minutes':
        delayInMinutes = Number(time);
        break;
      case 'hours':
        delayInMinutes = time * 60;
        break;
    }
  
    const when = Date.now() + delayInMinutes * 60000;
    chrome.alarms.create(`tabReminder_${tabId}`, { when });
    console.log(`Alarm set for tab ${tabId} at ${new Date(when)}`);
    alert(`Reminder set for ${time} ${unit} from now.`);
  }
  
  function setAbsoluteReminder(tabId, time) {
    const [hours, minutes] = time.split(':');
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
  
    if (reminderTime <= new Date()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
  
    chrome.alarms.create(`tabReminder_${tabId}`, { when: reminderTime.getTime() });
    console.log(`Alarm set for tab ${tabId} at ${reminderTime}`);
    alert(`Reminder set for ${time}.`);
  }
  
  function updateReminderTimer(tabId) {
    chrome.alarms.get(`tabReminder_${tabId}`, (alarm) => {
      if (alarm) {
        const timerElement = document.getElementById(`timer-${tabId}`);
        if (timerElement) {
          const updateTimer = () => {
            const remainingTime = Math.max(0, Math.floor((alarm.scheduledTime - Date.now()) / 1000));
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            const seconds = remainingTime % 60;
            timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (remainingTime > 0) {
              requestAnimationFrame(updateTimer);
            } else {
              timerElement.textContent = '';
            }
          };
          updateTimer();
        }
      }
    });
  }
  
  // Update timers every time the popup is opened
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => updateReminderTimer(tab.id));
  });
  