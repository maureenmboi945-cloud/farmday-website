const $ = (selector) => document.querySelector(selector);
const load = (key) => {
  try { return JSON.parse(localStorage.getItem(`farmday-${key}`)) || []; }
  catch { return []; }
};

let cows = load('cows');
let tasks = load('tasks');
let notes = load('notes');
let newPhoto = '';

const save = () => {
  localStorage.setItem('farmday-cows', JSON.stringify(cows));
  localStorage.setItem('farmday-tasks', JSON.stringify(tasks));
  localStorage.setItem('farmday-notes', JSON.stringify(notes));
  render();
};

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const isoToday = () => new Date().toISOString().slice(0, 10);
const open = (id) => $(id).showModal();

// Extend the existing cow register with delivery, milk and feed details.
const cowFormGrid = $('#cow-form .form-grid');

cowFormGrid.insertAdjacentHTML('beforeend', `
  <label>Date delivered<input name="delivered" type="date"></label>
  <label>Milk produced per day (litres)<input name="milk" type="number" min="0" step="0.1" placeholder="e.g. 12"></label>
  <label class="wide">Feed type or feeding notes<input name="feedNotes" maxlength="100" placeholder="e.g. Napier grass and dairy meal"></label>
`);

$('.stats').insertAdjacentHTML('beforeend', `
  <article class="stat-card added-stat"><div class="stat-icon blue-icon">L</div><span class="stat-label">MILK PRODUCTION</span><strong id="milk-total">0 <small>litres / day</small></strong><span class="stat-foot">Combined daily yield entered</span></article>
  <article class="stat-card added-stat"><div class="stat-icon peach-icon">D</div><span class="stat-label">DELIVERED IN LAST 30 DAYS</span><strong id="delivery-count">0 <small>cows</small></strong><span class="stat-foot">From delivery dates entered</span></article>
`);

const cowHeader = $('#cow-table').closest('table').querySelector('thead tr');
cowHeader.lastElementChild.remove();
cowHeader.insertAdjacentHTML('beforeend', '<th>DELIVERED</th><th>MILK / DAY</th><th>FEEDING NOTES</th><th></th>');

$('.dashboard-footer').insertAdjacentHTML('beforebegin', `
  <section class="feeding-guide" aria-labelledby="feeding-title">
    <div><p class="eyebrow">FEEDING NOTES</p><h2 id="feeding-title">A steady routine supports a healthy herd.</h2></div>
    <p>Record the forage and supplements each cow receives, along with clean water access. Feed needs vary by animal and milk yield, so ask a local livestock adviser to help balance a ration for your available feeds.</p>
  </section>
`);

document.head.insertAdjacentHTML('beforeend', `<style>
  .feeding-guide{margin-top:17px;padding:22px 24px;background:#edf3e9;border:1px solid #e0e9dc;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}
  .feeding-guide .eyebrow{margin:0 0 7px;color:#70836e}.feeding-guide h2{font:700 16px Manrope,sans-serif;margin:0;color:#294d36}
  .feeding-guide>p{margin:0;color:#6e7a71;font-size:11px;line-height:1.7}.added-stat{min-width:0}.added-stat .stat-icon{font:700 13px Manrope,sans-serif}
  @media(max-width:720px){.feeding-guide{grid-template-columns:1fr;gap:10px;padding:18px}.added-stat{min-height:124px}}
</style>`);

// Display today's date
$('#today-date').textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
});

// AUTOMATIC MORNING, AFTERNOON AND EVENING GREETING
function updateGreeting() {
  const greeting = $('.welcome h1');
  if (!greeting) return;

  const hour = new Date().getHours();
  let message;

  if (hour >= 5 && hour < 12) {
    message = 'Good morning, Edwin ☀';
  } else if (hour >= 12 && hour < 17) {
    message = 'Good afternoon, Edwin 🌤';
  } else {
    message = 'Good evening, Edwin 🌙';
  }

  greeting.textContent = message;
}

// Run immediately and update every minute
updateGreeting();
setInterval(updateGreeting, 60000);

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

$('#add-task').onclick = $('#empty-add').onclick = () => open('#task-dialog');
$('#add-cow').onclick = $('#first-cow').onclick = $('#top-add-cow').onclick = () => open('#cow-dialog');
$('#add-note').onclick = $('#first-note').onclick = () => { populateCowSelect(); open('#note-dialog'); };

$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  tasks.unshift({ id: crypto.randomUUID(), title: data.get('title').trim(), area: data.get('area').trim(), done: false });
  event.currentTarget.reset(); $('#task-dialog').close(); save();
});

$('#cow-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  cows.unshift({
    id: crypto.randomUUID(), name: data.get('name').trim(), breed: data.get('breed').trim(),
    dob: data.get('dob'), feed: Number(data.get('feed')) || 0, problem: data.get('problem').trim(),
    delivered: data.get('delivered'), milk: Number(data.get('milk')) || 0,
    feedNotes: data.get('feedNotes').trim(), photo: newPhoto
  });
  event.currentTarget.reset(); newPhoto = ''; $('#photo-preview').textContent = '🐄'; $('#cow-dialog').close(); save();
});

$('#note-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  notes.unshift({
    id: crypto.randomUUID(), cow: data.get('cow'), problem: data.get('problem').trim(),
    treatment: data.get('treatment').trim(), treatedBy: data.get('treatedBy').trim(),
    date: data.get('date'), details: data.get('details').trim()
  });
  event.currentTarget.reset(); $('#note-dialog').close(); save();
});

function populateCowSelect() {
  const select = $('#note-cow');
  select.innerHTML = cows.length
    ? cows.map((cow) => `<option value="${esc(cow.id)}">${esc(cow.name)}${cow.breed ? ` · ${esc(cow.breed)}` : ''}</option>`).join('')
    : '<option value="Unlisted cow">Unlisted cow (add cow later)</option>';
  $('#note-form [name=date]').value = isoToday();
}

function photoData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 500 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('#cow-photo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    newPhoto = await photoData(file);
    $('#photo-preview').innerHTML = `<img src="${newPhoto}" alt="Cow photo preview">`;
  }
  catch { alert('That photo could not be opened. Try another image.'); }
});

document.addEventListener('change', async (event) => {
  const id = event.target.dataset.photoCow;
  const file = event.target.files[0];
  if (!id || !file) return;
  try {
    const cow = cows.find((item) => item.id === id);
    if (cow) {
      cow.photo = await photoData(file);
      save();
    }
  }
  catch { alert('That photo could not be opened. Try another image.'); }
});

function render() {
  const openTasks = tasks.filter((task) => !task.done).length;
  const doneTasks = tasks.length - openTasks;

  $('#cow-count').innerHTML = `${cows.length} <small>${cows.length === 1 ? 'cow' : 'cows'}</small>`;
  $('#remaining-count').innerHTML = `${openTasks} <small>${openTasks === 1 ? 'task' : 'tasks'}</small>`;
  $('#task-foot').textContent = openTasks ? `${doneTasks} completed today` : 'You\'re all caught up';
  $('#followup-count').innerHTML = `${cows.filter((cow) => cow.problem).length} <small>open</small>`;

  const feed = cows.reduce((total, cow) => total + (Number(cow.feed) || 0), 0);
  $('#feed-total').innerHTML = `${feed.toLocaleString()} <small>kg / day</small>`;

  const milk = cows.reduce((total, cow) => total + (Number(cow.milk) || 0), 0);
  $('#milk-total').innerHTML = `${milk.toLocaleString()} <small>litres / day</small>`;

  const today = new Date();
  const recentDeliveries = cows.filter((cow) => {
    if (!cow.delivered) return false;
    const daysAgo = (today - new Date(`${cow.delivered}T00:00:00`)) / 86400000;
    return daysAgo >= 0 && daysAgo <= 30;
  }).length;

  $('#delivery-count').innerHTML = `${recentDeliveries} <small>${recentDeliveries === 1 ? 'cow' : 'cows'}</small>`;

  $('#task-list').innerHTML = tasks.map((task) => `<div class="task-row ${task.done ? 'task-done' : ''}"><input class="task-check" type="checkbox" data-task="${esc(task.id)}" ${task.done ? 'checked' : ''} aria-label="Mark task complete"><div class="task-copy"><strong>${esc(task.title)}</strong><small>${esc(task.area || 'General care')}</small></div><button class="delete-task" data-delete-task="${esc(task.id)}" aria-label="Delete task">×</button></div>`).join('');

  $('#empty-state').hidden = tasks.length > 0;

  const followups = cows.filter((cow) => cow.problem);
  $('#followup-list').innerHTML = followups.map((cow) => `<div class="block-row"><span class="block-dot dot-three"></span><div class="block-info"><strong>${esc(cow.name)}</strong><small>${esc(cow.problem)}</small></div><span class="block-status status-watch">Follow up</span></div>`).join('');

  $('#followup-empty').hidden = followups.length > 0;

  $('#cow-table').innerHTML = cows.map((cow) => `<tr><td><span class="cow-thumb">${cow.photo ? `<img src="${cow.photo}" alt="${esc(cow.name)}">` : '🐄'}</span><br><label class="cow-photo-edit">${cow.photo ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" data-photo-cow="${esc(cow.id)}" hidden></label></td><td>${esc(cow.name)}</td><td>${esc(cow.breed || '—')}</td><td>${cow.dob ? new Date(`${cow.dob}T00:00:00`).toLocaleDateString() : '—'}</td><td>${Number(cow.feed) || 0} kg</td><td><span class="health-pill ${cow.problem ? 'needs-care' : ''}">${cow.problem ? 'Needs care' : 'No issue recorded'}</span></td><td>${cow.delivered ? new Date(`${cow.delivered}T00:00:00`).toLocaleDateString() : '—'}</td><td>${Number(cow.milk) || 0} L</td><td>${esc(cow.feedNotes || '—')}</td><td><button class="row-delete" data-delete-cow="${esc(cow.id)}" aria-label="Delete cow">×</button></td></tr>`).join('');

  $('#cows-empty').hidden = cows.length > 0;

  $('#notes-list').innerHTML = notes.map((note) => {
    const cow = cows.find((item) => item.id === note.cow);
    return `<div class="note-row"><span class="note-icon">♡</span><div class="note-main"><strong>${esc(cow?.name || note.cow)} · ${esc(note.problem)}</strong><p><b>Treatment:</b> ${esc(note.treatment)}</p><p><b>Vet:</b> <span class="vet-label">${esc(note.treatedBy)}</span> · ${note.date ? new Date(`${note.date}T00:00:00`).toLocaleDateString() : ''}</p>${note.details ? `<p>${esc(note.details)}</p>` : ''}</div><button class="row-delete" data-delete-note="${esc(note.id)}" aria-label="Delete note">×</button></div>`;
  }).join('');

  $('#notes-empty').hidden = notes.length > 0;

  $('#progress-text').textContent = `${doneTasks} of ${tasks.length} completed`;
  const percent = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;
  $('#progress-percent').textContent = `${percent}%`;
  $('#progress-fill').style.width = `${percent}%`;

  document.querySelectorAll('[data-task]').forEach((element) => {
    element.onchange = () => {
      const task = tasks.find((item) => item.id === element.dataset.task);
      if (task) task.done = element.checked;
      save();
    };
  });

  document.querySelectorAll('[data-delete-task]').forEach((element) => {
    element.onclick = () => {
      tasks = tasks.filter((task) => task.id !== element.dataset.deleteTask);
      save();
    };
  });

  document.querySelectorAll('[data-delete-cow]').forEach((element) => {
    element.onclick = () => {
      cows = cows.filter((cow) => cow.id !== element.dataset.deleteCow);
      save();
    };
  });

  document.querySelectorAll('[data-delete-note]').forEach((element) => {
    element.onclick = () => {
      notes = notes.filter((note) => note.id !== element.dataset.deleteNote);
      save();
    };
  });
}

render();