// photos.js — progress photo upload (resized to base64), gallery, before/after compare.
import { getData, mutate, todayKey, prettyDate, uid } from './storage.js';
import { toast, onScreenShow, openModal, closeModal } from './ui.js';
import { checkBadges } from './badges.js';

const MAX_DIM = 600;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
        else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

let selectedForCompare = [];

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

export function renderPhotos() {
  const data = getData();
  const grid = document.getElementById('photo-grid');
  selectedForCompare = [];

  if (!data.photos.length) {
    grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1">No photos yet. Tap "Add photo" to upload your first one.</p>';
    return;
  }

  const sorted = [...data.photos].sort((a, b) => (a.date < b.date ? 1 : -1));
  grid.innerHTML = sorted.map((p) =>
    '<div class="photo-thumb" data-photo-id="' + p.id + '">' +
    '<img src="' + p.dataUrl + '" alt="Progress photo" loading="lazy" />' +
    '<span class="photo-date">' + p.date.slice(5) + '</span>' +
    '</div>'
  ).join('');
}

function openPhotoModal(photo) {
  const box = openModal(
    '<p class="modal-title">' + prettyDate(photo.date) + '</p>' +
    '<img src="' + photo.dataUrl + '" alt="" style="width:100%;border-radius:12px;max-height:60vh;object-fit:contain" />' +
    '<div class="modal-actions">' +
    '<button class="btn btn-ghost" data-modal-close>Close</button>' +
    '<button class="btn btn-danger" id="delete-photo-btn">Delete</button>' +
    '</div>'
  );
  box.querySelector('#delete-photo-btn').onclick = () => {
    mutate((d) => { d.photos = d.photos.filter((p) => p.id !== photo.id); });
    closeModal();
    renderPhotos();
    toast('Photo deleted');
  };
}

function openCompareModal(p1, p2) {
  openModal(
    '<p class="modal-title">Before &amp; After</p>' +
    '<div class="compare-view">' +
    '<figure><img src="' + p1.dataUrl + '" alt="" /><figcaption>' + prettyDate(p1.date) + '</figcaption></figure>' +
    '<figure><img src="' + p2.dataUrl + '" alt="" /><figcaption>' + prettyDate(p2.date) + '</figcaption></figure>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-modal-close>Close</button></div>'
  );
}

async function handlePhotoUpload(file) {
  if (!file || !file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }
  try {
    const dataUrl = await resizeImage(file);
    mutate((d) => { d.photos.push({ id: uid(), date: todayKey(), dataUrl }); });
    checkBadges();
    toast('Photo saved', 'success');
    renderPhotos();
  } catch (e) {
    toast('Could not save photo — try a smaller image', 'error');
  }
}

export function initPhotos() {
  onScreenShow('photos', renderPhotos);

  document.getElementById('photo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePhotoUpload(file);
    e.target.value = '';
  });

  document.getElementById('compare-btn').addEventListener('click', () => {
    const data = getData();
    if (data.photos.length < 2) { toast('Need at least 2 photos to compare', 'error'); return; }
    toast('Tap 2 photos to compare');
    selectedForCompare = [];
    document.getElementById('photo-grid').dataset.comparing = '1';
  });

  document.getElementById('photo-grid').addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-photo-id]');
    if (!thumb) return;
    const id = thumb.dataset.photoId;
    const data = getData();
    const photo = data.photos.find((p) => p.id === id);
    if (!photo) return;

    if (document.getElementById('photo-grid').dataset.comparing === '1') {
      if (selectedForCompare.includes(id)) return;
      selectedForCompare.push(id);
      thumb.classList.add('selected');
      if (selectedForCompare.length === 2) {
        delete document.getElementById('photo-grid').dataset.comparing;
        const photos = selectedForCompare.map((sid) => data.photos.find((p) => p.id === sid));
        const sorted = photos.sort((a, b) => (a.date < b.date ? -1 : 1));
        openCompareModal(sorted[0], sorted[1]);
        selectedForCompare = [];
        document.querySelectorAll('.photo-thumb.selected').forEach((t) => t.classList.remove('selected'));
      }
      return;
    }
    openPhotoModal(photo);
  });

  renderPhotos();
}
