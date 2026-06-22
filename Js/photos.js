// photos.js — progress photos. Resized & stored as base64 DataURLs in localStorage.
import { getData, mutate, todayKey, prettyDate, uid } from './storage.js';
import { toast, onScreenShow, openModal, closeModal, confirmModal } from './ui.js';
import { checkBadges } from './badges.js';

const MAX_DIM = 640; // resize to keep storage manageable

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let compareSelection = [];

export function initPhotos() {
  onScreenShow('photos', renderPhotos);

  document.getElementById('photo-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      mutate((d) => { d.photos.push({ id: uid(), date: todayKey(), dataUrl }); });
      checkBadges();
      toast('Photo saved 📸', 'success');
      renderPhotos();
    } catch (err) {
      toast('Could not save photo', 'error');
    }
    e.target.value = '';
  });

  document.getElementById('compare-btn').addEventListener('click', () => {
    if (compareSelection.length < 2) { toast('Tap two photos to compare them', 'error'); return; }
    openCompareModal(compareSelection[0], compareSelection[1]);
  });
}

function renderPhotos() {
  const data = getData();
  const grid = document.getElementById('photo-grid');
  compareSelection = [];

  if (!data.photos.length) {
    grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Upload your first photo to get started.</p>';
    return;
  }

  const sorted = [...data.photos].sort((a, b) => (a.date < b.date ? 1 : -1));
  grid.innerHTML = sorted.map((p) => `
    <div class="photo-thumb" data-photo-id="${p.id}">
      <img src="${p.dataUrl}" alt="Progress photo ${p.date}" loading="lazy" />
      <span class="photo-date">${p.date.slice(5)}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.photo-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => handlePhotoClick(thumb, thumb.dataset.photoId));
    thumb.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const ok = await confirmModal({ title: 'Delete photo?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true });
      if (!ok) return;
      mutate((d) => { d.photos = d.photos.filter((p) => p.id !== thumb.dataset.photoId); });
      renderPhotos();
    });
  });
}

function handlePhotoClick(thumb, photoId) {
  const idx = compareSelection.indexOf(photoId);
  if (idx >= 0) {
    compareSelection.splice(idx, 1);
    thumb.classList.remove('selected');
  } else if (compareSelection.length < 2) {
    compareSelection.push(photoId);
    thumb.classList.add('selected');
  } else {
    const prev = document.querySelector('.photo-thumb.selected');
    if (prev) { prev.classList.remove('selected'); compareSelection.shift(); }
    compareSelection.push(photoId);
    thumb.classList.add('selected');
  }
}

function openCompareModal(id1, id2) {
  const data = getData();
  const p1 = data.photos.find((p) => p.id === id1);
  const p2 = data.photos.find((p) => p.id === id2);
  if (!p1 || !p2) return;
  openModal(`
    <p class="modal-title">Before & After</p>
    <div class="compare-view">
      <figure><img src="${p1.dataUrl}" alt="Before" /><figcaption>${prettyDate(p1.date)}</figcaption></figure>
      <figure><img src="${p2.dataUrl}" alt="After" /><figcaption>${prettyDate(p2.date)}</figcaption></figure>
    </div>
    <button class="btn btn-ghost btn-block" data-modal-close style="margin-top:8px">Close</button>
  `);
}
