const trackingParams = new URLSearchParams(window.location.search);
const trackingCorrelationId = trackingParams.get('cid') || '';
const trackingCampaignId = trackingParams.get('campaign') || 'test';

document.querySelector('#complete')?.addEventListener('click', async function () {
  this.textContent = 'Orientação concluída';
  this.disabled = true;
  this.style.opacity = '.7';
  if (!trackingCorrelationId) return;
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'orientation_complete', correlation_id: trackingCorrelationId, campaign_id: trackingCampaignId })
    });
  } catch (error) {
    // A orientação continua mesmo quando o servidor local está offline.
  }
});
