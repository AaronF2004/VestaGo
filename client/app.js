const API_URL = "https://vestago.onrender.com/api/listings";

// State
let currentFilter = 'all';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let likedIds = JSON.parse(localStorage.getItem('likedListings')) || [];

// DOM Elements
const listingsGrid = document.getElementById('listingsGrid');
const filterTabs = document.querySelectorAll('.filter-tab');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Modals
const listingModal = document.getElementById('listingModal');
const detailModal = document.getElementById('detailModal');
const authModal = document.getElementById('authModal');
const detailContent = document.getElementById('detailContent');

// User Dropdown Elements
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const loggedInMenu = document.getElementById('loggedInMenu');
const loggedOutMenu = document.getElementById('loggedOutMenu');
const userNameDisplay = document.getElementById('userNameDisplay');

// Form Elements
const listingForm = document.getElementById('listingForm');
const listingIdInput = document.getElementById('listingId');
const titleInput = document.getElementById('titleInput');
const typeInput = document.getElementById('typeInput');
const priceInput = document.getElementById('priceInput');
const locationInput = document.getElementById('locationInput');
const imageInput = document.getElementById('imageInput');
const descInput = document.getElementById('descInput');
const modalTitle = document.getElementById('modalTitle');

// 1. Initial State Setup
syncAuthUI();

function syncAuthUI() {
  if (currentUser) {
    loggedOutMenu.style.display = 'none';
    loggedInMenu.style.display = 'block';
    userNameDisplay.innerText = `Hello, ${currentUser.name}`;
  } else {
    loggedOutMenu.style.display = 'block';
    loggedInMenu.style.display = 'none';
  }
}

// User Menu Toggle
userMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
  userDropdown.classList.remove('show');
});

// 2. Auth Actions (Simulated Real Authentication)
window.openAuthModal = function(mode) {
  userDropdown.classList.remove('show');
  document.getElementById('authModalTitle').innerText = mode;
  document.getElementById('authSubmitBtn').innerText = mode;
  authModal.classList.add('show');
};

document.getElementById('closeAuthModalBtn').onclick = () => authModal.classList.remove('show');

document.getElementById('authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('authName').value.trim();
  currentUser = { name, email: document.getElementById('authEmail').value };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  authModal.classList.remove('show');
  syncAuthUI();
});

window.logoutUser = function() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  syncAuthUI();
  userDropdown.classList.remove('show');
};

// 3. READ: Fetch and Display Listings
async function fetchListings(query = '') {
  try {
    let url = `${API_URL}?type=${currentFilter}`;
    if (query) url += `&search=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    const listings = await res.json();
    renderListings(listings);
  } catch (error) {
    console.error('Failed to load listings:', error);
    listingsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Could not connect to backend. Make sure your server is running.</p>`;
  }
}

function renderListings(listings) {
  if (!listings.length) {
    listingsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No listings found.</p>`;
    return;
  }

  listingsGrid.innerHTML = listings
    .map((item) => {
      const isLiked = likedIds.includes(item._id);
      return `
      <article class="card" onclick="openDetailModal('${item._id}')">
        <div class="card-img-wrapper">
          <span class="badge-tag">${item.type === 'hotel' ? 'Stay' : 'Dining'}</span>
          <button class="heart-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(event, '${item._id}')">
            <i class="fa-solid fa-heart"></i>
          </button>
          <img 
            src="${item.image}" 
            alt="${item.title}" 
            class="card-img" 
            onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"
          />
        </div>
        <div class="card-content">
          <div class="card-header-row">
            <span class="card-title">${item.title}</span>
            <span>★ ${item.rating || '4.8'} (${item.reviewsCount || 1})</span>
          </div>
          <p class="card-location">${item.location}</p>
          <p class="card-price">
            <strong>₹${Number(item.price).toLocaleString()}</strong> ${item.type === 'hotel' ? '/ night' : '/ avg meal'}
          </p>
          
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-card" onclick="openEditModal('${item._id}')">Edit</button>
            <button class="btn-card btn-delete" onclick="deleteListing('${item._id}')">Delete</button>
          </div>
        </div>
      </article>
    `;
    })
    .join('');
}

// 4. Detail View Modal & Live Star Rating System
window.openDetailModal = async function(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const item = await res.json();

    detailContent.innerHTML = `
      <img src="${item.image}" alt="${item.title}" class="detail-img" onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"/>
      <h2 class="detail-title">${item.title}</h2>
      <p class="detail-location"><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
      
      <div class="detail-badges">
        <span class="pill-badge">★ ${item.rating} (${item.reviewsCount} reviews)</span>
        <span class="pill-badge"><i class="fa-solid fa-medal"></i> Superhost</span>
        <span class="pill-badge">${item.type === 'hotel' ? 'Entire Place' : 'Table Reservation'}</span>
      </div>

      <p class="detail-desc">${item.description}</p>

      <!-- Rating Submission Section -->
      <div class="rating-section">
        <strong>Rate this experience:</strong>
        <div class="star-rating-box" id="starBox">
          ${[1, 2, 3, 4, 5].map(num => `
            <i class="fa-solid fa-star star-rate-icon" data-val="${num}" onclick="submitRating('${item._id}',${num})"></i>
          `).join('')}
        </div>
      </div>

      <!-- Checkout Box -->
      <div class="checkout-box">
        <div>
          <h3>₹${Number(item.price).toLocaleString()} <span style="font-size:0.85rem; font-weight:normal;">${item.type === 'hotel' ? '/ night' : '/ person'}</span></h3>
          <small>Free cancellation available</small>
        </div>
        <button class="submit-btn" style="width: auto; padding: 10px 24px;" onclick="alert('Booking confirmed successfully!')">
          ${item.type === 'hotel' ? 'Reserve Stay' : 'Book Table'}
        </button>
      </div>
    `;

    detailModal.classList.add('show');
  } catch (err) {
    console.error('Failed to load listing details:', err);
  }
};

window.submitRating = async function(id, score) {
  try {
    const res = await fetch(`${API_URL}/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score })
    });
    if (res.ok) {
      alert(`Thanks for rating ${score} stars!`);
      detailModal.classList.remove('show');
      fetchListings();
    }
  } catch (err) {
    console.error('Error submitting rating:', err);
  }
};

// Wishlist / Heart Toggle
window.toggleLike = function(e, id) {
  e.stopPropagation();
  if (likedIds.includes(id)) {
    likedIds = likedIds.filter(itemId => itemId !== id);
  } else {
    likedIds.push(id);
  }
  localStorage.setItem('likedListings', JSON.stringify(likedIds));
  fetchListings(searchInput.value);
};

// 5. Create / Edit CRUD Handlers
listingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    type: typeInput.value,
    price: Number(priceInput.value),
    location: locationInput.value.trim(),
    image: imageInput.value.trim(),
    description: descInput.value.trim()
  };

  const id = listingIdInput.value;
  const isEditing = Boolean(id);

  try {
    const url = isEditing ? `${API_URL}/${id}` : API_URL;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      listingModal.classList.remove('show');
      fetchListings();
    }
  } catch (err) {
    console.error('Error submitting form:', err);
  }
});

window.openEditModal = async function(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const data = await res.json();

    listingIdInput.value = data._id;
    titleInput.value = data.title;
    typeInput.value = data.type;
    priceInput.value = data.price;
    locationInput.value = data.location;
    imageInput.value = data.image;
    descInput.value = data.description;

    modalTitle.innerText = 'Edit Listing';
    listingModal.classList.add('show');
  } catch (err) {
    console.error('Failed to get item details:', err);
  }
};

window.deleteListing = async function(id) {
  if (!confirm('Are you sure you want to delete this listing?')) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (res.ok) fetchListings();
  } catch (err) {
    console.error('Failed to delete listing:', err);
  }
};

window.openCreateModal = function() {
  listingForm.reset();
  listingIdInput.value = '';
  modalTitle.innerText = 'Host a New Place';
  listingModal.classList.add('show');
};

// Modal Close Triggers
document.getElementById('closeModalBtn').onclick = () => listingModal.classList.remove('show');
document.getElementById('closeDetailModalBtn').onclick = () => detailModal.classList.remove('show');
document.getElementById('openCreateModalBtn').onclick = openCreateModal;

window.onclick = (e) => {
  if (e.target === listingModal) listingModal.classList.remove('show');
  if (e.target === detailModal) detailModal.classList.remove('show');
  if (e.target === authModal) authModal.classList.remove('show');
};

// Filter Navigation Tabs
filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    fetchListings(searchInput.value);
  });
});

searchBtn.addEventListener('click', () => fetchListings(searchInput.value));
searchInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') fetchListings(searchInput.value);
});

// Initial Load
fetchListings();