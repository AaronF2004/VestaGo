const BASE_URL = "https://vestago.onrender.com/api/listings";

// Point this to your backend address
//const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/listings`;
const AUTH_URL = `${BASE_URL}/api/auth`;

// Global State
let currentFilter = 'all';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let authToken = localStorage.getItem('authToken') || null;
let likedIds = JSON.parse(localStorage.getItem('likedListings')) || [];
let userBookings = JSON.parse(localStorage.getItem('userBookings')) || [];
let activeAuthMode = 'Log In';
let selectedRatingScore = 5;
let pendingCancelBookingId = null;

// DOM Elements
const listingsGrid = document.getElementById('listingsGrid');
const filterTabs = document.querySelectorAll('.filter-tab');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const loggedInMenu = document.getElementById('loggedInMenu');
const loggedOutMenu = document.getElementById('loggedOutMenu');
const userNameDisplay = document.getElementById('userNameDisplay');
const utilityControls = document.getElementById('utilityControls');

// Search & Controls
const heroSearchForm = document.getElementById('heroSearchForm');
const searchWhere = document.getElementById('searchWhere');
const sortSelect = document.getElementById('sortSelect');

// Modals
const listingModal = document.getElementById('listingModal');
const detailModal = document.getElementById('detailModal');
const authModal = document.getElementById('authModal');
const filterModal = document.getElementById('filterModal');
const receiptModal = document.getElementById('receiptModal');
const confirmCancelModal = document.getElementById('confirmCancelModal');
const detailContent = document.getElementById('detailContent');
const receiptContent = document.getElementById('receiptContent');
const btnCancelBookingModal = document.getElementById('btnCancelBookingModal');
const btnConfirmCancelBooking = document.getElementById('btnConfirmCancelBooking');
const appToast = document.getElementById('appToast');
const toastMsg = document.getElementById('toastMsg');

// Form Elements
const listingForm = document.getElementById('listingForm');
const listingIdInput = document.getElementById('listingId');
const titleInput = document.getElementById('titleInput');
const typeInput = document.getElementById('typeInput');
const priceInput = document.getElementById('priceInput');
const locationInput = document.getElementById('locationInput');
const photosInput = document.getElementById('photosInput');
const amenitiesInput = document.getElementById('amenitiesInput');
const descInput = document.getElementById('descInput');
const modalTitle = document.getElementById('modalTitle');

// Auth Form Elements
const authForm = document.getElementById('authForm');
const nameFieldGroup = document.getElementById('nameFieldGroup');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authErrorMsg = document.getElementById('authErrorMsg');

// Initial Auth Sync
syncAuthUI();

function syncAuthUI() {
  if (currentUser && authToken) {
    loggedOutMenu.style.display = 'none';
    loggedInMenu.style.display = 'block';
    userNameDisplay.innerText = `Welcome, ${currentUser.name}`;
  } else {
    loggedOutMenu.style.display = 'block';
    loggedInMenu.style.display = 'none';
  }
}

// Toast Alert System
function showToast(message) {
  toastMsg.innerText = message;
  appToast.classList.add('show');
  setTimeout(() => {
    appToast.classList.remove('show');
  }, 3500);
}

// User Menu Toggle
userMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
  userDropdown.classList.remove('show');
});

// Authentication Handlers
window.openAuthModal = function (mode) {
  activeAuthMode = mode;
  userDropdown.classList.remove('show');
  document.getElementById('authModalTitle').innerText = mode;
  document.getElementById('authSubmitBtn').innerText = mode;
  authErrorMsg.style.display = 'none';

  if (mode === 'Log In') {
    nameFieldGroup.style.display = 'none';
    authName.removeAttribute('required');
  } else {
    nameFieldGroup.style.display = 'flex';
    authName.setAttribute('required', 'true');
  }
  authModal.classList.add('show');
};

document.getElementById('closeAuthModalBtn').onclick = () => authModal.classList.remove('show');

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.style.display = 'none';

  const endpoint = activeAuthMode === 'Sign Up' ? `${AUTH_URL}/signup` : `${AUTH_URL}/login`;
  const payload = {
    email: authEmail.value.trim(),
    password: authPassword.value
  };
  if (activeAuthMode === 'Sign Up') payload.name = authName.value.trim();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      authErrorMsg.innerText = data.message || 'Authentication failed';
      authErrorMsg.style.display = 'block';
      return;
    }

    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('authToken', authToken);

    syncAuthUI();
    authModal.classList.remove('show');
    authForm.reset();
    showToast(`Welcome back, ${currentUser.name}!`);
    fetchListings();
  } catch (err) {
    authErrorMsg.innerText = 'Server error. Try again.';
    authErrorMsg.style.display = 'block';
  }
});

window.logoutUser = function () {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  syncAuthUI();
  userDropdown.classList.remove('show');
  currentFilter = 'all';
  updateActiveTabUI();
  showToast('Logged out successfully');
  fetchListings();
};

// Skeletons
function renderSkeletons() {
  listingsGrid.innerHTML = Array(8).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text" style="width: 70%;"></div>
      <div class="skeleton-text" style="width: 40%;"></div>
    </div>
  `).join('');
}

// Fetch Listings or Load Bookings
async function fetchListings() {
  if (currentFilter === 'bookings') {
    renderBookings();
    return;
  }

  utilityControls.style.display = 'flex';
  renderSkeletons();

  try {
    let queryParams = new URLSearchParams();

    if (currentFilter !== 'all') queryParams.append('type', currentFilter);
    if (searchWhere.value.trim()) queryParams.append('search', searchWhere.value.trim());
    if (sortSelect.value) queryParams.append('sort', sortSelect.value);

    const minP = document.getElementById('filterMinPrice')?.value;
    const maxP = document.getElementById('filterMaxPrice')?.value;
    const minR = document.getElementById('filterMinRating')?.value;

    if (minP) queryParams.append('minPrice', minP);
    if (maxP) queryParams.append('maxPrice', maxP);
    if (minR) queryParams.append('minRating', minR);

    const res = await fetch(`${API_URL}?${queryParams.toString()}`);
    const listings = await res.json();
    renderListings(listings);
  } catch (error) {
    console.error('Failed to load listings:', error);
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Failed to load listings</h3>
        <p>Make sure your server is online.</p>
      </div>`;
  }
}

function resolveImage(img) {
  if (!img) return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${BASE_URL}${img}`;
}

// Render Listings Grid
function renderListings(listings) {
  if (!listings || listings.length === 0) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-house-chimney-crack"></i>
        <h3>No listings found</h3>
        <p>Try adjusting your search criteria or filters.</p>
      </div>`;
    return;
  }

  listingsGrid.innerHTML = listings.map((item) => {
    const isLiked = likedIds.includes(item._id);
    const coverImage = resolveImage(item.images && item.images.length ? item.images[0] : item.image);
    const isOwner = currentUser && item.owner && (item.owner._id === currentUser.id || item.owner === currentUser.id);

    return `
      <article class="card" onclick="openDetailModal('${item._id}')" tabindex="0" role="button" aria-label="${item.title}">
        <div class="card-img-wrapper">
          <span class="badge-tag" onclick="event.stopPropagation(); openDetailModal('${item._id}')">
            ${item.type === 'hotel' ? 'Stay' : 'Dining'}
          </span>
          <button class="heart-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(event, '${item._id}')" aria-label="Save listing">
            <i class="fa-solid fa-heart"></i>
          </button>
          <img 
            src="${coverImage}" 
            alt="${item.title}" 
            class="card-img" 
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"
          />
        </div>
        <div class="card-content">
          <div class="card-header-row">
            <span class="card-title">${item.title}</span>
            <span><i class="fa-solid fa-star star-gold"></i> ${item.rating || '4.8'} (${item.reviewsCount || 1})</span>
          </div>
          <p class="card-location">${item.location}</p>
          <p class="card-price">
            <strong>₹${Number(item.price).toLocaleString()}</strong> ${item.type === 'hotel' ? '/ night' : '/ avg meal'}
          </p>
          
          ${isOwner ? `
            <div class="card-actions" onclick="event.stopPropagation()">
              <button class="btn-card" onclick="openEditModal('${item._id}')">Edit</button>
              <button class="btn-card btn-delete" onclick="deleteListing('${item._id}')">Delete</button>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');
}

// Open Listing Detail Modal
window.openDetailModal = async function (id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const item = await res.json();
    const images = (item.images && item.images.length) ? item.images : [item.image || ''];
    selectedRatingScore = 5;

    const reviewsMarkup = item.reviews && item.reviews.length > 0 
      ? item.reviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <span class="review-author">${r.userName}</span>
              <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div style="margin-bottom: 4px;">
              ${Array(r.rating).fill('<i class="fa-solid fa-star star-gold"></i>').join('')}
            </div>
            <p class="review-text">${r.comment}</p>
          </div>
        `).join('')
      : '<p style="color: var(--text-muted); font-size: 0.9rem;">No reviews yet. Be the first to share your thoughts!</p>';

    detailContent.innerHTML = `
      <div class="gallery-grid">
        <img src="${resolveImage(images[0])}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"/>
        <div class="gallery-sub">
          <img src="${resolveImage(images[1] || images[0])}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"/>
          <img src="${resolveImage(images[2] || images[0])}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'"/>
        </div>
      </div>

      <h2 class="detail-title">${item.title}</h2>
      <p class="detail-location"><i class="fa-solid fa-location-dot"></i> ${item.location}</p>

      <div class="detail-badges">
        <span class="pill-badge"><i class="fa-solid fa-star star-gold"></i> ${item.rating} (${item.reviewsCount} reviews)</span>
        <span class="pill-badge"><i class="fa-solid fa-medal"></i> Superhost</span>
        <span class="pill-badge">${item.type === 'hotel' ? 'Entire Stay' : 'Table Reservation'}</span>
        <span class="pill-badge">Hosted by ${item.owner?.name || 'Local Host'}</span>
      </div>

      <p class="detail-desc">${item.description}</p>

      <h4>What this place offers</h4>
      <div class="amenities-list">
        ${(item.amenities || ['Wifi', 'Air Conditioning']).map(a => `<span class="pill-badge"><i class="fa-solid fa-check"></i> ${a}</span>`).join('')}
      </div>

      <div class="map-placeholder">
        <i class="fa-solid fa-map-location-dot" style="font-size: 2rem; margin-bottom: 8px;"></i>
        <p>Location Map for <strong>${item.location}</strong></p>
      </div>

      <!-- Reviews Section -->
      <div class="review-section">
        <h3>Guest Reviews & Ratings</h3>
        
        <form class="review-form" onsubmit="handleReviewSubmit(event, '${item._id}')">
          <label style="font-weight: 600; font-size: 0.9rem;">Your Rating:</label>
          <div class="star-rating-box" id="modalStarBox">
            ${[1, 2, 3, 4, 5].map(n => `
              <i class="fa-solid fa-star star-rate-icon ${n <= 5 ? 'active' : ''}" data-val="${n}" onclick="setRating(${n})"></i>
            `).join('')}
          </div>

          <textarea id="reviewCommentInput" rows="3" placeholder="Share your experience with this place..." required></textarea>
          <button type="submit" class="submit-btn" style="width: auto; padding: 8px 20px; font-size: 0.9rem;">Post Review</button>
        </form>

        <div class="reviews-list">
          ${reviewsMarkup}
        </div>
      </div>

      <!-- Checkout Box -->
      <div class="checkout-box">
        <div>
          <h3>₹${Number(item.price).toLocaleString()} <span style="font-size:0.85rem; font-weight:normal;">${item.type === 'hotel' ? '/ night' : '/ guest'}</span></h3>
          <small>Free cancellation before 48 hours</small>
        </div>
        <button class="submit-btn" style="width: auto; padding: 12px 28px;" onclick="initiateBooking('${item._id}', '${item.title.replace(/'/g, "\\'")}', '${item.type}', ${item.price}, '${item.location.replace(/'/g, "\\'")}', '${resolveImage(images[0])}')">
          ${item.type === 'hotel' ? 'Reserve Stay' : 'Book Table'}
        </button>
      </div>
    `;

    detailModal.classList.add('show');
  } catch (err) {
    console.error('Failed to load item detail:', err);
  }
};

window.setRating = function (score) {
  selectedRatingScore = score;
  const stars = document.querySelectorAll('#modalStarBox .star-rate-icon');
  stars.forEach(star => {
    const val = Number(star.getAttribute('data-val'));
    if (val <= score) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
};

window.handleReviewSubmit = async function (e, id) {
  e.preventDefault();
  const comment = document.getElementById('reviewCommentInput').value.trim();
  const userName = currentUser ? currentUser.name : 'Guest Traveler';

  try {
    const res = await fetch(`${API_URL}/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: selectedRatingScore,
        comment,
        userName
      })
    });

    if (res.ok) {
      await openDetailModal(id);
      showToast('Thank you! Review published.');
      fetchListings();
    } else {
      showToast('Failed to submit review');
    }
  } catch (err) {
    console.error('Error submitting review:', err);
  }
};

// Booking Receipt Engine
window.initiateBooking = function (listingId, title, type, price, location, image) {
  if (!currentUser) {
    showToast('Please log in first to make a reservation');
    openAuthModal('Log In');
    return;
  }

  const bookingId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
  const taxes = Math.round(price * 0.12);
  const totalAmount = price + taxes;
  const bookingDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const newBooking = {
    id: bookingId,
    listingId,
    title,
    type,
    price,
    taxes,
    totalAmount,
    location,
    image,
    userEmail: currentUser.email,
    userName: currentUser.name,
    bookingDate,
    status: 'Confirmed'
  };

  userBookings.unshift(newBooking);
  localStorage.setItem('userBookings', JSON.stringify(userBookings));

  detailModal.classList.remove('show');
  showReceipt(newBooking);
  showToast('Reservation confirmed!');
};

function showReceipt(booking) {
  receiptContent.innerHTML = `
    <div class="receipt-row">
      <span>Booking Ref:</span>
      <strong>${booking.id}</strong>
    </div>
    <div class="receipt-row">
      <span>Guest:</span>
      <strong>${booking.userName} (${booking.userEmail})</strong>
    </div>
    <div class="receipt-row">
      <span>Experience:</span>
      <strong>${booking.title}</strong>
    </div>
    <div class="receipt-row">
      <span>Category:</span>
      <strong>${booking.type === 'hotel' ? 'Hotel Stay' : 'Dining Reservation'}</strong>
    </div>
    <div class="receipt-row">
      <span>Location:</span>
      <strong>${booking.location}</strong>
    </div>
    <div class="receipt-row">
      <span>Date Booked:</span>
      <strong>${booking.bookingDate}</strong>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row">
      <span>Base Price:</span>
      <span>₹${Number(booking.price).toLocaleString()}</span>
    </div>
    <div class="receipt-row">
      <span>GST & Platform Taxes (12%):</span>
      <span>₹${Number(booking.taxes).toLocaleString()}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row" style="font-size: 1.05rem;">
      <strong>Total Paid:</strong>
      <strong style="color: var(--primary);">₹${Number(booking.totalAmount).toLocaleString()}</strong>
    </div>
  `;

  btnCancelBookingModal.onclick = () => promptCancelBooking(booking.id);
  receiptModal.classList.add('show');
}

window.closeReceiptModal = function () {
  receiptModal.classList.remove('show');
};

// Custom Cancellation Flow
window.promptCancelBooking = function (bookingId) {
  pendingCancelBookingId = bookingId;
  confirmCancelModal.classList.add('show');
};

window.closeConfirmModal = function () {
  pendingCancelBookingId = null;
  confirmCancelModal.classList.remove('show');
};

btnConfirmCancelBooking.onclick = function () {
  if (!pendingCancelBookingId) return;

  userBookings = userBookings.filter(b => b.id !== pendingCancelBookingId);
  localStorage.setItem('userBookings', JSON.stringify(userBookings));

  confirmCancelModal.classList.remove('show');
  receiptModal.classList.remove('show');
  pendingCancelBookingId = null;

  showToast('Booking cancelled. 100% refund credited.');

  if (currentFilter === 'bookings') {
    renderBookings();
  }
};

// Render "My Bookings" Tab
function renderBookings() {
  utilityControls.style.display = 'none';

  if (!currentUser) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-lock"></i>
        <h3>Login Required</h3>
        <p>Please log in to view your booked stays and table reservations.</p>
        <button class="submit-btn" style="max-width: 200px; margin: 16px auto;" onclick="openAuthModal('Log In')">Log In Now</button>
      </div>`;
    return;
  }

  const myBookings = userBookings.filter(b => b.userEmail === currentUser.email);

  if (!myBookings.length) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-receipt"></i>
        <h3>No active bookings yet</h3>
        <p>Explore stays and bistros to make your first reservation!</p>
      </div>`;
    return;
  }

  listingsGrid.innerHTML = myBookings.map(b => `
    <article class="booking-card">
      <div class="booking-card-header">
        <span class="booking-badge">${b.status}</span>
        <small style="color: var(--text-muted);">${b.id}</small>
      </div>
      <div class="card-img-wrapper" style="aspect-ratio: 16 / 9;">
        <img src="${b.image}" alt="${b.title}" class="card-img" />
      </div>
      <div>
        <h3 style="font-size: 1.05rem; margin-bottom: 4px;">${b.title}</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-location-dot"></i> ${b.location}</p>
        <p style="margin-top: 8px; font-size: 0.95rem;">
          <strong>Total: ₹${Number(b.totalAmount).toLocaleString()}</strong>
        </p>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button class="btn-card" onclick='showReceipt(${JSON.stringify(b)})'>View Receipt</button>
        <button class="btn-card btn-delete" onclick="promptCancelBooking('${b.id}')">Cancel</button>
      </div>
    </article>
  `).join('');
}

window.showMyBookingsTab = function () {
  userDropdown.classList.remove('show');
  currentFilter = 'bookings';
  updateActiveTabUI();
  renderBookings();
};

function updateActiveTabUI() {
  filterTabs.forEach((tab) => {
    if (tab.dataset.filter === currentFilter) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Wishlist Handler
window.toggleLike = function (e, id) {
  e.stopPropagation();
  if (likedIds.includes(id)) {
    likedIds = likedIds.filter(itemId => itemId !== id);
  } else {
    likedIds.push(id);
  }
  localStorage.setItem('likedListings', JSON.stringify(likedIds));
  fetchListings();
};

// Create / Edit Form Submission
listingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!authToken) {
    showToast('Please log in first.');
    openAuthModal('Log In');
    return;
  }

  const id = listingIdInput.value;
  const isEditing = Boolean(id);
  const formData = new FormData();

  formData.append('title', titleInput.value.trim());
  formData.append('type', typeInput.value);
  formData.append('price', priceInput.value);
  formData.append('location', locationInput.value.trim());
  formData.append('description', descInput.value.trim());
  formData.append('amenities', amenitiesInput.value.trim());

  if (photosInput.files.length > 0) {
    for (let i = 0; i < photosInput.files.length; i++) {
      formData.append('photos', photosInput.files[i]);
    }
  }

  try {
    const url = isEditing ? `${API_URL}/${id}` : API_URL;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (response.ok) {
      listingModal.classList.remove('show');
      listingForm.reset();
      showToast(isEditing ? 'Listing updated!' : 'Listing created!');
      fetchListings();
    } else {
      const errData = await response.json();
      showToast(errData.message || 'Operation failed');
    }
  } catch (err) {
    console.error('Form submission failed:', err);
  }
});

window.openEditModal = async function (id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const data = await res.json();

    listingIdInput.value = data._id;
    titleInput.value = data.title;
    typeInput.value = data.type;
    priceInput.value = data.price;
    locationInput.value = data.location;
    descInput.value = data.description;
    amenitiesInput.value = data.amenities ? data.amenities.join(', ') : '';

    modalTitle.innerText = 'Edit Listing';
    listingModal.classList.add('show');
  } catch (err) {
    console.error(err);
  }
};

window.deleteListing = async function (id) {
  pendingCancelBookingId = null;
  if (!confirm('Are you sure you want to delete this listing?')) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      showToast('Listing removed');
      fetchListings();
    } else {
      const err = await res.json();
      showToast(err.message || 'Could not delete listing');
    }
  } catch (err) {
    console.error(err);
  }
};

window.openCreateModal = function () {
  if (!authToken) {
    openAuthModal('Log In');
    return;
  }
  listingForm.reset();
  listingIdInput.value = '';
  modalTitle.innerText = 'Host a New Place';
  listingModal.classList.add('show');
};

// Filter Modals
document.getElementById('filterModalBtn').onclick = () => filterModal.classList.add('show');
document.getElementById('closeFilterModalBtn').onclick = () => filterModal.classList.remove('show');

window.applyFilters = function () {
  filterModal.classList.remove('show');
  fetchListings();
};

// Modal Close Handlers
document.getElementById('closeModalBtn').onclick = () => listingModal.classList.remove('show');
document.getElementById('closeDetailModalBtn').onclick = () => detailModal.classList.remove('show');
document.getElementById('openCreateModalBtn').onclick = openCreateModal;

window.onclick = (e) => {
  if (e.target === listingModal) listingModal.classList.remove('show');
  if (e.target === detailModal) detailModal.classList.remove('show');
  if (e.target === authModal) authModal.classList.remove('show');
  if (e.target === filterModal) filterModal.classList.remove('show');
  if (e.target === receiptModal) receiptModal.classList.remove('show');
  if (e.target === confirmCancelModal) confirmCancelModal.classList.remove('show');
};

// Filter Category Tabs
filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    updateActiveTabUI();
    fetchListings();
  });
});

// Search Box
heroSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentFilter === 'bookings') {
    currentFilter = 'all';
    updateActiveTabUI();
  }
  fetchListings();
});

// Initial Load
fetchListings();