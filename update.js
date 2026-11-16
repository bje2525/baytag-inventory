
'use strict';

const BAYTAG_VERSION = '2.1';

async function checkBayTagUpdates() {
  try {
    const response = await fetch(
      './version.json?t=' + Date.now(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Version file unavailable');
    }

    const info = await response.json();

    if (info.releaseStatus !== 'stable') {
      alert('BayTag v2.1 is still in development.');
      return;
    }

    alert('Published BayTag version: ' + info.version);
  } catch (error) {
    alert('Unable to check for updates. Check your internet connection.');
  }
}

