(() => {
  const form = document.getElementById('carForm');
  const rows = document.getElementById('carRows');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('formError');

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.errors && data.errors.join('; ')) || data.error || `HTTP ${res.status}`);
    return data;
  }

  function render(cars) {
    if (!cars.length) {
      rows.innerHTML = '<tr><td colspan="9">No cars yet.</td></tr>';
      return;
    }
    rows.innerHTML = cars.map((c) => `
      <tr>
        <td>${esc(c.Id)}</td><td>${esc(c.Make)}</td><td>${esc(c.Model)}</td><td>${esc(c.Year)}</td>
        <td>${c.Price == null ? '' : esc(Number(c.Price).toFixed(2))}</td>
        <td>${esc(c.Mileage)}</td><td>${esc(c.Color)}</td><td>${esc(c.Vin)}</td>
        <td><button class="btn danger" data-id="${esc(c.Id)}">Delete</button></td>
      </tr>`).join('');
  }

  async function load() {
    try {
      render(await api('/api/cars'));
      statusEl.textContent = 'Connected';
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
      rows.innerHTML = '<tr><td colspan="9">Could not load cars. Check the database settings in .env.</td></tr>';
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorEl.textContent = '';
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await api('/api/cars', { method: 'POST', body: JSON.stringify(body) });
      form.reset();
      await load();
    } catch (e) {
      errorEl.textContent = e.message;
    }
  });

  rows.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-id]');
    if (!btn || !confirm('Delete this car?')) return;
    try {
      await api(`/api/cars/${btn.dataset.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    }
  });

  load();
})();
