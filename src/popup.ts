document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const themeSwitch = document.getElementById('themeSwitch') as HTMLInputElement | null;
  const compactSwitch = document.getElementById('compactSwitch') as HTMLInputElement | null;
  const infoBtn = document.getElementById('infoBtn') as HTMLButtonElement | null;
  const infoBox = document.getElementById('infoBox') as HTMLDivElement | null;
  const toggleBtn = document.getElementById('toggleExtension') as HTMLButtonElement | null;

  // Set initial theme based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    body.classList.add('night');
    if (themeSwitch) themeSwitch.checked = true;
  }

  // Theme switch handler
  if (themeSwitch) {
    themeSwitch.addEventListener('change', () => {
      body.classList.toggle('night', themeSwitch.checked);
    });
  }

  // Info box toggle
  if (infoBtn && infoBox) {
    infoBtn.addEventListener('click', () => {
      infoBox.hidden = !infoBox.hidden;
    });
  }

  // Compact switch handler
  if (compactSwitch) {
    // Load saved compact mode preference
    chrome.storage.local.get(['panierclairCompact'], result => {
      const compact = result.panierclairCompact !== undefined ? result.panierclairCompact : false;
      compactSwitch.checked = compact;
    });

    compactSwitch.addEventListener('change', () => {
      const isCompact = compactSwitch.checked;
      chrome.storage.local.set({ panierclairCompact: isCompact });

      // Send message to content script to apply compact mode
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'panierclair-compact', compact: isCompact });
        }
      });
    });
  }

  // Activation toggle button
  if (toggleBtn) {
    chrome.storage.local.get(['panierclairEnabled'], result => {
      const enabled = result.panierclairEnabled !== undefined ? result.panierclairEnabled : true;
      toggleBtn.textContent = enabled ? 'Désactiver' : 'Activer';
      toggleBtn.dataset.enabled = enabled ? 'true' : 'false';
    });

    toggleBtn.addEventListener('click', () => {
      const currentlyEnabled = toggleBtn.dataset.enabled === 'true';
      const newEnabled = !currentlyEnabled;
      chrome.storage.local.set({ panierclairEnabled: newEnabled });
      toggleBtn.textContent = newEnabled ? 'Désactiver' : 'Activer';
      toggleBtn.dataset.enabled = newEnabled ? 'true' : 'false';
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'panierclair-toggle', enabled: newEnabled });
        }
      });
    });
  }
});
