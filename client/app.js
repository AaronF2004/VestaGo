// Automatically switch between localhost & live Render
const isLocal = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.protocol === 'file:';

const BASE_URL = isLocal
  ? 'http://localhost:5000'
  : 'https://vestago.onrender.com';

const API_URL = `${BASE_URL}/api/listings`;
const AUTH_URL = `${BASE_URL}/api/auth`;

const MAPBOX_TOKEN = 'pk.' + 'eyJ1IjoiYWFyb24wODExMjAwNCIsImEiOiJjbXVnbjJ3YWwwOWduMndxeWw0ZTJkNm1hIn0.NagTfSeYYGxGDulv1jf1Rw';

// Helper: Get user-specific storage keys
function getWishlistStorageKey() {
  if (currentUser && (currentUser.id || currentUser._id)) {
    return `likedListings_${currentUser.id || currentUser._id}`;
  }
  return 'likedListings_guest';
}

function loadUserWishlist() {
  return JSON.parse(localStorage.getItem(getWishlistStorageKey())) || [];
}

// Global State
let currentFilter = 'all';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let authToken = localStorage.getItem('authToken') || null;
let likedIds = loadUserWishlist();
let userBookings = JSON.parse(localStorage.getItem('userBookings')) || [];
let currentListingsData = [];
let allListingsCache = [];
let activeAuthMode = 'Log In';
let selectedRatingScore = 5;
let pendingCancelBookingId = null;

// Track review & listing pending deletion
let pendingDeleteReview = null;
let pendingDeleteListingId = null;

// Track active Mapbox map instance
let activeMapboxInstance = null;

// Checkout State
let activeCheckoutItem = null;
let currentBookingNights = 1;
let currentGuestsCount = 1;
let selectedPaymentMethod = 'card';

// DOM References
const listingsGrid = document.getElementById('listingsGrid');
const filterTabs = document.querySelectorAll('.filter-tab');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const loggedInMenu = document.getElementById('loggedInMenu');
const loggedOutMenu = document.getElementById('loggedOutMenu');
const userNameDisplay = document.getElementById('userNameDisplay');
const utilityControls = document.getElementById('utilityControls');
const heroBanner = document.getElementById('heroBanner');

// Search & Controls
const heroSearchForm = document.getElementById('heroSearchForm');
const searchWhere = document.getElementById('searchWhere');
const searchCheckin = document.getElementById('searchCheckin');
const searchCheckout = document.getElementById('searchCheckout');
const searchGuests = document.getElementById('searchGuests');
const sortSelect = document.getElementById('sortSelect');

// Modals
const listingModal = document.getElementById('listingModal');
const detailModal = document.getElementById('detailModal');
const authModal = document.getElementById('authModal');
const filterModal = document.getElementById('filterModal');
const receiptModal = document.getElementById('receiptModal');
const checkoutModal = document.getElementById('checkoutModal');
const confirmCancelModal = document.getElementById('confirmCancelModal');
const deleteReviewModal = document.getElementById('deleteReviewModal');
const deleteListingModal = document.getElementById('deleteListingModal');
const detailContent = document.getElementById('detailContent');
const receiptContent = document.getElementById('receiptContent');
const btnCancelBookingModal = document.getElementById('btnCancelBookingModal');
const btnConfirmCancelBooking = document.getElementById('btnConfirmCancelBooking');
const btnConfirmDeleteReview = document.getElementById('btnConfirmDeleteReview');
const btnConfirmDeleteListing = document.getElementById('btnConfirmDeleteListing');
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

// Payment Inputs
const payCardNumber = document.getElementById('payCardNumber');
const payCardExpiry = document.getElementById('payCardExpiry');
const payCardCvc = document.getElementById('payCardCvc');
const payCardHolder = document.getElementById('payCardHolder');
const payUpiId = document.getElementById('payUpiId');
const payBankSelect = document.getElementById('payBankSelect');
const payValidationError = document.getElementById('payValidationError');

// Initialize Auth
syncAuthUI();

function syncAuthUI() {
  if (currentUser && authToken) {
    loggedOutMenu.style.display = 'none';
    loggedInMenu.style.display = 'block';
    userNameDisplay.innerText = `Hi, ${currentUser.name}`;
  } else {
    loggedOutMenu.style.display = 'block';
    loggedInMenu.style.display = 'none';
  }
}

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
  document.getElementById('authModalTitle').innerText = mode === 'Sign Up' ? 'Create a VestaGo Account' : 'Welcome to VestaGo';
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

    likedIds = loadUserWishlist();

    syncAuthUI();
    authModal.classList.remove('show');
    authForm.reset();
    showToast(`Welcome back, ${currentUser.name}!`);
    fetchListings();
  } catch (err) {
    authErrorMsg.innerText = 'Server error. Please try again.';
    authErrorMsg.style.display = 'block';
  }
});

window.logoutUser = function () {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');

  likedIds = loadUserWishlist();

  syncAuthUI();
  userDropdown.classList.remove('show');
  currentFilter = 'all';
  updateActiveTabUI();
  showToast('Logged out of VestaGo');
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

// Fetch Listings
async function fetchListings() {
  if (currentFilter === 'bookings') {
    renderBookings();
    return;
  }
  if (currentFilter === 'wishlist') {
    await renderWishlist();
    return;
  }
  if (currentFilter === 'myListings') {
    renderMyListings();
    return;
  }

  utilityControls.style.display = 'flex';
  renderSkeletons();

  try {
    let queryParams = new URLSearchParams();
    if (currentFilter !== 'all') queryParams.append('type', currentFilter);
    if (searchWhere && searchWhere.value.trim()) queryParams.append('search', searchWhere.value.trim());
    if (sortSelect && sortSelect.value) queryParams.append('sort', sortSelect.value);

    const minP = document.getElementById('filterMinPrice')?.value;
    const maxP = document.getElementById('filterMaxPrice')?.value;
    const minR = document.getElementById('filterMinRating')?.value;

    if (minP) queryParams.append('minPrice', minP);
    if (maxP) queryParams.append('maxPrice', maxP);
    if (minR) queryParams.append('minRating', minR);

    const res = await fetch(`${API_URL}?${queryParams.toString()}`);
    currentListingsData = await res.json();

    if (currentFilter === 'all' && (!searchWhere || !searchWhere.value.trim())) {
      allListingsCache = currentListingsData;
    }

    renderListings(currentListingsData);
  } catch (error) {
    console.error('Failed to load listings:', error);
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-cloud-bolt"></i>
        <h3>Unable to reach VestaGo servers</h3>
        <p>Please check your connection or wait a moment.</p>
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
        <i class="fa-solid fa-magnifying-glass-location"></i>
        <h3>No places match your search</h3>
        <p>Try resetting filters, searching a different city, or broadening dates.</p>
        <button class="submit-btn" style="max-width: 180px; margin: 16px auto;" onclick="resetToHome()">Reset Search</button>
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
          <span class="badge-tag">
            ${item.type === 'hotel' ? 'Stay' : 'Dining'}
          </span>
          <button class="heart-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(event, '${item._id}')" aria-label="Save to Wishlist">
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
              <button class="btn-card btn-delete" onclick="promptDeleteListing('${item._id}')">Delete</button>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');
}

// Mapbox Geocoding and Map Initializer
async function initDetailMap(locationQuery, title) {
  const mapContainer = document.getElementById('detailMap');
  if (!mapContainer || !window.mapboxgl) return;

  if (activeMapboxInstance) {
    activeMapboxInstance.remove();
    activeMapboxInstance = null;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  let coordinates = [73.8567, 18.5204];

  try {
    const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.features && geoData.features.length > 0) {
      coordinates = geoData.features[0].center;
    }
  } catch (err) {
    console.warn('Geocoding fallback used:', err);
  }

  activeMapboxInstance = new mapboxgl.Map({
    container: 'detailMap',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: coordinates,
    zoom: 12
  });

  activeMapboxInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

  const popup = new mapboxgl.Popup({ offset: 25 })
    .setHTML(`<strong>${title}</strong><br/><span style="color:#666;">${locationQuery}</span>`);

  new mapboxgl.Marker({ color: '#ff385c' })
    .setLngLat(coordinates)
    .setPopup(popup)
    .addTo(activeMapboxInstance);

  setTimeout(() => {
    if (activeMapboxInstance) {
      activeMapboxInstance.resize();
    }
  }, 300);
}

// Open Property Detail View
window.openDetailModal = async function (id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const item = await res.json();
    const images = (item.images && item.images.length) ? item.images : [item.image || ''];
    selectedRatingScore = 5;

    window.currentListingReviews = item.reviews || [];

    const reviewsMarkup = item.reviews && item.reviews.length > 0 
      ? item.reviews.map((r, index) => {
          const identifier = r._id ? r._id.toString() : index.toString();
          const canDelete = currentUser && (r.userName === currentUser.name || (item.owner && (item.owner._id === currentUser.id || item.owner === currentUser.id)));

          return `
            <div class="review-item" id="review-dom-${index}">
              <div class="review-header">
                <span class="review-author">${r.userName}</span>
                <span class="review-date">
                  ${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                  ${canDelete ? `
                    <button type="button" class="btn-delete-review" title="Delete review" onclick="promptDeleteReview(event, '${item._id}',${index})">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  ` : ''}
                </span>
              </div>
              <div style="margin-bottom: 4px;">
                ${Array(Number(r.rating) || 5).fill('<i class="fa-solid fa-star star-gold"></i>').join('')}
              </div>
              <p class="review-text">${r.comment || ''}</p>
            </div>
          `;
        }).join('')
      : '<p id="emptyReviewsMsg" style="color: var(--text-muted); font-size: 0.9rem;">No reviews yet. Be the first to share your thoughts!</p>';

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
        <span class="pill-badge" id="modalRatingBadge"><i class="fa-solid fa-star star-gold"></i> ${item.rating} (${item.reviewsCount} reviews)</span>
        <span class="pill-badge"><i class="fa-solid fa-shield-halved"></i> VestaVerified</span>
        <span class="pill-badge">${item.type === 'hotel' ? 'Entire Villa / Stay' : 'Table Reservation'}</span>
        <span class="pill-badge">Hosted by ${item.owner?.name || 'Local Superhost'}</span>
      </div>

      <p class="detail-desc">${item.description}</p>

      <h4>What this place offers</h4>
      <div class="amenities-list">
        ${(item.amenities || ['Wifi', 'Air Conditioning', 'Kitchen', 'Free Parking']).map(a => `<span class="pill-badge"><i class="fa-solid fa-check"></i> ${a}</span>`).join('')}
      </div>

      <!-- Live Mapbox Map Container -->
      <h4 style="margin-top: 24px;"><i class="fa-solid fa-map-location-dot"></i> Where you'll be</h4>
      <div id="detailMap"></div>

      <!-- Guest Reviews -->
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
          <button type="submit" class="submit-btn" style="width: auto; padding: 8px 20px; font-size: 0.9rem;">Submit Review</button>
        </form>

        <div class="reviews-list" id="modalReviewsList">
          ${reviewsMarkup}
        </div>
      </div>

      <!-- Checkout Box -->
      <div class="checkout-box">
        <div>
          <h3>₹${Number(item.price).toLocaleString()} <span style="font-size:0.85rem; font-weight:normal;">${item.type === 'hotel' ? '/ night' : '/ guest'}</span></h3>
          <small>Free cancellation up to 48 hours before check-in</small>
        </div>
        <button class="submit-btn pay-now-btn" style="width: auto; padding: 12px 30px;" onclick="openCheckoutGateway('${item._id}', '${item.title.replace(/'/g, "\\'")}', '${item.type}', ${item.price}, '${item.location.replace(/'/g, "\\'")}', '${resolveImage(images[0])}')">
          ${item.type === 'hotel' ? 'Reserve Stay' : 'Book Table'}
        </button>
      </div>
    `;

    detailModal.classList.add('show');

    setTimeout(() => {
      initDetailMap(item.location, item.title);
    }, 200);

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
      showToast('Review posted successfully!');
      fetchListings();
    } else {
      showToast('Could not save review');
    }
  } catch (err) {
    console.error('Error submitting review:', err);
  }
};

// Prompt Delete Review Modal
window.promptDeleteReview = function (e, listingId, reviewIndex) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const targetReview = window.currentListingReviews ? window.currentListingReviews[reviewIndex] : null;
  pendingDeleteReview = {
    listingId,
    reviewIndex,
    reviewId: targetReview ? targetReview._id : null,
    comment: targetReview ? targetReview.comment : '',
    userName: targetReview ? targetReview.userName : ''
  };
  deleteReviewModal.classList.add('show');
};

window.closeDeleteReviewModal = function () {
  pendingDeleteReview = null;
  deleteReviewModal.classList.remove('show');
};

// Confirm Delete Review Handler
btnConfirmDeleteReview.onclick = async function () {
  if (!pendingDeleteReview) return;
  const { listingId, reviewIndex, reviewId, comment, userName } = pendingDeleteReview;
  closeDeleteReviewModal();

  const identifier = reviewId || reviewIndex;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_URL}/${listingId}/reviews/${identifier}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ comment, userName })
    });

    if (res.ok) {
      const data = await res.json();
      
      const targetElement = document.getElementById(`review-dom-${reviewIndex}`);
      if (targetElement) {
        targetElement.remove();
      }

      showToast('Review deleted permanently');
      await openDetailModal(listingId);
      fetchListings();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Could not delete review');
    }
  } catch (err) {
    console.error('DELETE error detail:', err);
    showToast('Network error while deleting review');
  }
};

// Delete Listing Modal Handlers
window.promptDeleteListing = function (id) {
  pendingDeleteListingId = id;
  deleteListingModal.classList.add('show');
};

window.closeDeleteListingModal = function () {
  pendingDeleteListingId = null;
  deleteListingModal.classList.remove('show');
};

btnConfirmDeleteListing.onclick = async function () {
  if (!pendingDeleteListingId) return;
  const id = pendingDeleteListingId;
  closeDeleteListingModal();

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      showToast('Listing has been successfully deleted from VestaGo.');
      allListingsCache = [];
      fetchListings();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Could not delete listing');
    }
  } catch (err) {
    console.error('Delete listing error:', err);
    showToast('Network error while deleting listing');
  }
};

// ==========================================
// PAYMENT METHOD SWITCHER & INPUT FORMATTERS
// ==========================================
window.switchPaymentMethod = function (method) {
  selectedPaymentMethod = method;

  // Toggle Tab UI
  document.getElementById('tabPayCard').classList.toggle('active', method === 'card');
  document.getElementById('tabPayUpi').classList.toggle('active', method === 'upi');
  document.getElementById('tabPayNetbanking').classList.toggle('active', method === 'netbanking');

  // Toggle Panel UI
  document.getElementById('panelPayCard').classList.toggle('active', method === 'card');
  document.getElementById('panelPayUpi').classList.toggle('active', method === 'upi');
  document.getElementById('panelPayNetbanking').classList.toggle('active', method === 'netbanking');

  // Clear Validation Messages
  if (payValidationError) {
    payValidationError.style.display = 'none';
    payValidationError.innerText = '';
  }
};

window.appendUpiHandle = function (handle) {
  if (!payUpiId) return;
  let currentVal = payUpiId.value.trim();
  if (currentVal.includes('@')) {
    currentVal = currentVal.split('@')[0];
  }
  if (!currentVal) currentVal = 'vestago.user';
  payUpiId.value = `${currentVal}${handle}`;
  payUpiId.focus();
};

// Input masks and formatters
if (payCardNumber) {
  payCardNumber.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    e.target.value = formatted;
  });
}

if (payCardExpiry) {
  payCardExpiry.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      e.target.value = `${val.substring(0, 2)}/${val.substring(2)}`;
    } else {
      e.target.value = val;
    }
  });
}

if (payCardCvc) {
  payCardCvc.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  });
}

// Open Checkout Gateway
window.openCheckoutGateway = function (listingId, title, type, price, location, image) {
  if (!currentUser) {
    showToast('Please log in to complete your reservation');
    openAuthModal('Log In');
    return;
  }

  const cin = (searchCheckin && searchCheckin.value) ? new Date(searchCheckin.value) : null;
  const cout = (searchCheckout && searchCheckout.value) ? new Date(searchCheckout.value) : null;
  
  if (cin && cout && cout > cin) {
    const diffTime = Math.abs(cout - cin);
    currentBookingNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    currentBookingNights = 1;
  }

  currentGuestsCount = (searchGuests && Number(searchGuests.value)) || 1;
  const baseTotal = price * currentBookingNights;
  const cleaningFee = type === 'hotel' ? 450 : 0;
  const taxes = Math.round((baseTotal + cleaningFee) * 0.12);
  const finalTotal = baseTotal + cleaningFee + taxes;

  activeCheckoutItem = {
    listingId,
    title,
    type,
    price,
    location,
    image,
    nights: currentBookingNights,
    guests: currentGuestsCount,
    baseTotal,
    cleaningFee,
    taxes,
    finalTotal,
    dates: cin && cout ? `${cin.toLocaleDateString()} - ${cout.toLocaleDateString()}` : 'Flexible Date Reservation'
  };

  // Populate Checkout Modal
  document.getElementById('ckListingTitle').innerText = title;
  document.getElementById('ckListingType').innerText = type === 'hotel' ? 'Stay' : 'Dining';
  document.getElementById('ckListingLoc').innerText = location;
  document.getElementById('ckListingImg').src = image;
  document.getElementById('ckDateRange').innerText = activeCheckoutItem.dates;
  document.getElementById('ckGuestCount').innerText = `${currentGuestsCount} Guest(s)`;

  document.getElementById('ckRateMath').innerText = `₹${price.toLocaleString()} x ${currentBookingNights} ${type === 'hotel' ? 'night(s)' : 'seat(s)'}`;
  document.getElementById('ckBaseTotal').innerText = `₹${baseTotal.toLocaleString()}`;
  document.getElementById('ckCleaningFee').innerText = `₹${cleaningFee.toLocaleString()}`;
  document.getElementById('ckTaxes').innerText = `₹${taxes.toLocaleString()}`;
  document.getElementById('ckFinalTotal').innerText = `₹${finalTotal.toLocaleString()}`;

  document.getElementById('payBtnText').innerText = `Pay ₹${finalTotal.toLocaleString()} with VestaPay`;

  // Prepopulate cardholder name if available
  if (payCardHolder && currentUser && currentUser.name) {
    payCardHolder.value = currentUser.name;
  }
  switchPaymentMethod('card');

  detailModal.classList.remove('show');
  checkoutModal.classList.add('show');
};

window.closeCheckoutModal = function () {
  checkoutModal.classList.remove('show');
};

// Validate Payment Form & Execute
window.executeMockPayment = function () {
  if (payValidationError) payValidationError.style.display = 'none';

  let paymentSummary = 'Card';

  if (selectedPaymentMethod === 'card') {
    const cardNum = payCardNumber.value.replace(/\s+/g, '');
    const expiry = payCardExpiry.value.trim();
    const cvc = payCardCvc.value.trim();

    if (cardNum.length < 15) {
      showPaymentError('Please enter a valid 16-digit card number.');
      payCardNumber.focus();
      return;
    }
    if (expiry.length < 5 || !expiry.includes('/')) {
      showPaymentError('Please enter a valid expiry date (MM/YY).');
      payCardExpiry.focus();
      return;
    }
    if (cvc.length < 3) {
      showPaymentError('Please enter a valid 3 or 4 digit CVV.');
      payCardCvc.focus();
      return;
    }
    paymentSummary = `Card ending in •••• ${cardNum.slice(-4)}`;
  } else if (selectedPaymentMethod === 'upi') {
    const upiVal = payUpiId.value.trim();
    if (!upiVal || !upiVal.includes('@')) {
      showPaymentError('Please enter a valid UPI ID (e.g., name@bank).');
      payUpiId.focus();
      return;
    }
    paymentSummary = `UPI (${upiVal})`;
  } else if (selectedPaymentMethod === 'netbanking') {
    const bankVal = payBankSelect.value;
    if (!bankVal) {
      showPaymentError('Please choose your bank from the list.');
      payBankSelect.focus();
      return;
    }
    paymentSummary = `Net Banking (${bankVal})`;
  }

  const payBtn = document.getElementById('btnPayNow');
  const payBtnText = document.getElementById('payBtnText');

  payBtn.disabled = true;
  payBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authorizing VestaPay Sandbox...';

  setTimeout(() => {
    payBtn.disabled = false;
    payBtnText.innerText = 'Pay with VestaPay';
    checkoutModal.classList.remove('show');

    const bookingId = 'VG-' + Math.floor(100000 + Math.random() * 900000);
    const newBooking = {
      id: bookingId,
      listingId: activeCheckoutItem.listingId,
      title: activeCheckoutItem.title,
      type: activeCheckoutItem.type,
      price: activeCheckoutItem.price,
      nights: activeCheckoutItem.nights,
      guests: activeCheckoutItem.guests,
      dates: activeCheckoutItem.dates,
      taxes: activeCheckoutItem.taxes,
      cleaningFee: activeCheckoutItem.cleaningFee,
      totalAmount: activeCheckoutItem.finalTotal,
      location: activeCheckoutItem.location,
      image: activeCheckoutItem.image,
      userEmail: currentUser.email,
      userName: currentUser.name,
      paymentMethodUsed: paymentSummary,
      bookingDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Confirmed'
    };

    userBookings.unshift(newBooking);
    localStorage.setItem('userBookings', JSON.stringify(userBookings));

    showReceipt(newBooking);
    showToast('Payment successful! Booking confirmed.');
  }, 1200);
};

function showPaymentError(msg) {
  if (!payValidationError) return;
  payValidationError.innerText = msg;
  payValidationError.style.display = 'block';
}

// Verified Receipt Modal Display
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
      <span>Property / Venue:</span>
      <strong>${booking.title}</strong>
    </div>
    <div class="receipt-row">
      <span>Category:</span>
      <strong>${booking.type === 'hotel' ? 'Villa / Stay' : 'Dining Reservation'}</strong>
    </div>
    <div class="receipt-row">
      <span>Dates:</span>
      <strong>${booking.dates || 'Immediate Confirmation'}</strong>
    </div>
    <div class="receipt-row">
      <span>Location:</span>
      <strong>${booking.location}</strong>
    </div>
    <div class="receipt-row">
      <span>Paid via:</span>
      <strong style="color: #2e7d32;"><i class="fa-solid fa-shield-check"></i> ${booking.paymentMethodUsed || 'VestaPay Sandbox'}</strong>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row">
      <span>Base Tariff:</span>
      <span>₹${Number(booking.price * (booking.nights || 1)).toLocaleString()}</span>
    </div>
    <div class="receipt-row">
      <span>Cleaning & Service:</span>
      <span>₹${Number(booking.cleaningFee || 0).toLocaleString()}</span>
    </div>
    <div class="receipt-row">
      <span>VestaGo Service & GST (12%):</span>
      <span>₹${Number(booking.taxes).toLocaleString()}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row" style="font-size: 1.05rem;">
      <strong>Total Paid (via VestaPay):</strong>
      <strong style="color: var(--primary);">₹${Number(booking.totalAmount).toLocaleString()}</strong>
    </div>
  `;

  btnCancelBookingModal.onclick = () => promptCancelBooking(booking.id);
  receiptModal.classList.add('show');
}

window.closeReceiptModal = function () {
  receiptModal.classList.remove('show');
};

// Booking Cancellation System
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

// User Dashboard Tabs
window.showDashboardTab = function (tabName) {
  userDropdown.classList.remove('show');
  currentFilter = tabName;
  updateActiveTabUI();
  if (tabName === 'bookings') renderBookings();
  if (tabName === 'wishlist') renderWishlist();
  if (tabName === 'myListings') renderMyListings();
};

function renderBookings() {
  utilityControls.style.display = 'none';

  if (!currentUser) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-lock"></i>
        <h3>Login Required</h3>
        <p>Log in to view your reservations and active itineraries.</p>
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
        <p>Explore places to make your first reservation!</p>
        <button class="submit-btn" style="max-width: 180px; margin: 16px auto;" onclick="resetToHome()">Find Stays</button>
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
        <p style="font-size:0.85rem; color:#555; margin-top:4px;">${b.dates || 'Confirmed'}</p>
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

async function renderWishlist() {
  utilityControls.style.display = 'none';

  if (!likedIds.length) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-heart"></i>
        <h3>Your Wishlist is empty</h3>
        <p>Tap the heart icon on any villa or bistro to save it for later.</p>
        <button class="submit-btn" style="max-width: 180px; margin: 16px auto;" onclick="resetToHome()">Explore Places</button>
      </div>`;
    return;
  }

  renderSkeletons();

  try {
    if (!allListingsCache.length) {
      const res = await fetch(`${API_URL}?type=all`);
      allListingsCache = await res.json();
    }

    const savedListings = allListingsCache.filter(item => likedIds.includes(item._id));

    if (!savedListings.length) {
      listingsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-heart"></i>
          <h3>Your Wishlist is empty</h3>
          <p>Tap the heart icon on any villa or bistro to save it for later.</p>
          <button class="submit-btn" style="max-width: 180px; margin: 16px auto;" onclick="resetToHome()">Explore Places</button>
        </div>`;
      return;
    }

    renderListings(savedListings);
  } catch (err) {
    console.error('Failed to load wishlist items:', err);
    const savedListings = currentListingsData.filter(item => likedIds.includes(item._id));
    renderListings(savedListings);
  }
}

function renderMyListings() {
  utilityControls.style.display = 'none';

  if (!currentUser) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-house-user"></i>
        <h3>Host Dashboard</h3>
        <p>Please log in to manage your listed properties.</p>
        <button class="submit-btn" style="max-width: 200px; margin: 16px auto;" onclick="openAuthModal('Log In')">Log In</button>
      </div>`;
    return;
  }

  const sourceData = allListingsCache.length ? allListingsCache : currentListingsData;
  const owned = sourceData.filter(item => item.owner && (item.owner._id === currentUser.id || item.owner === currentUser.id));

  if (!owned.length) {
    listingsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-house-chimney-medical"></i>
        <h3>You have no properties listed</h3>
        <p>Earn by sharing your space or restaurant experience on VestaGo.</p>
        <button class="submit-btn" style="max-width: 200px; margin: 16px auto;" onclick="openCreateModal()">List Your Place</button>
      </div>`;
    return;
  }

  renderListings(owned);
}

window.resetToHome = function () {
  currentFilter = 'all';
  if (searchWhere) searchWhere.value = '';
  if (searchCheckin) searchCheckin.value = '';
  if (searchCheckout) searchCheckout.value = '';
  if (searchGuests) searchGuests.value = '';
  updateActiveTabUI();
  fetchListings();
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

// Wishlist Heart Handler
window.toggleLike = function (e, id) {
  e.stopPropagation();
  if (likedIds.includes(id)) {
    likedIds = likedIds.filter(itemId => itemId !== id);
    showToast('Removed from Wishlist');
  } else {
    likedIds.push(id);
    showToast('Saved to Wishlist');
  }
  
  localStorage.setItem(getWishlistStorageKey(), JSON.stringify(likedIds));

  if (currentFilter === 'wishlist') {
    renderWishlist();
  } else {
    fetchListings();
  }
};

// Create / Edit Listing Handlers
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
      showToast(isEditing ? 'Listing updated successfully!' : 'Listing published on VestaGo!');
      allListingsCache = [];
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

    modalTitle.innerText = 'Edit Property';
    listingModal.classList.add('show');
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
  modalTitle.innerText = 'List on VestaGo';
  listingModal.classList.add('show');
};

// Filter Modal Handlers
document.getElementById('filterModalBtn').onclick = () => filterModal.classList.add('show');
document.getElementById('closeFilterModalBtn').onclick = () => filterModal.classList.remove('show');

window.applyFilters = function () {
  filterModal.classList.remove('show');
  fetchListings();
};

// Modal Dismiss Listeners
document.getElementById('closeModalBtn').onclick = () => listingModal.classList.remove('show');
document.getElementById('closeDetailModalBtn').onclick = () => detailModal.classList.remove('show');
document.getElementById('openCreateModalBtn').onclick = openCreateModal;

window.onclick = (e) => {
  if (e.target === listingModal) listingModal.classList.remove('show');
  if (e.target === detailModal) detailModal.classList.remove('show');
  if (e.target === authModal) authModal.classList.remove('show');
  if (e.target === filterModal) filterModal.classList.remove('show');
  if (e.target === receiptModal) receiptModal.classList.remove('show');
  if (e.target === checkoutModal) checkoutModal.classList.remove('show');
  if (e.target === confirmCancelModal) confirmCancelModal.classList.remove('show');
  if (e.target === deleteReviewModal) deleteReviewModal.classList.remove('show');
  if (e.target === deleteListingModal) deleteListingModal.classList.remove('show');
};

// Tab Listeners
filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    updateActiveTabUI();
    fetchListings();
  });
});

// Search Filter Handling
heroSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentFilter === 'bookings' || currentFilter === 'wishlist' || currentFilter === 'myListings') {
    currentFilter = 'all';
    updateActiveTabUI();
  }
  fetchListings();
});

// Initial Fetch
fetchListings();


// ==========================================
// FOOTER PAGES & POLICY CONTENT DICTIONARY
// ==========================================
const siteFooterContent = {
  about: {
    title: "About VestaGo",
    html: `
      <p><strong>VestaGo</strong> connects curious travelers and food enthusiasts with handpicked boutique villas, beach retreats, and curated culinary dining experiences across India and beyond.</p>
      <h4>Our Philosophy</h4>
      <p>Whether you're seeking a secluded coastal villa in Malvan or an artisanal bistro table in Delhi, VestaGo guarantees verified spaces and transparent reservations.</p>
      <h4>What Sets Us Apart</h4>
      <ul>
        <li><strong>VestaVerified Listings:</strong> Hand-inspected hosts and venues with high quality standards.</li>
        <li><strong>Seamless Integrated Checkout:</strong> Secure payments via Cards, UPI, and Net Banking.</li>
        <li><strong>Authentic Community:</strong> Real reviews written exclusively by verified guests.</li>
      </ul>
    `
  },
  vestacover: {
    title: "VestaCover Protection",
    html: `
      <p>Every booking through VestaGo automatically includes <strong>VestaCover</strong> — complimentary coverage built directly into your stay or dining reservation.</p>
      <h4>What's Included:</h4>
      <ul>
        <li><strong>Booking Guarantee:</strong> If a host cancels within 48 hours of check-in, we will find an equal or better stay or refund 100% instantly.</li>
        <li><strong>Listing Inaccuracy Protection:</strong> If a place differs substantially from its photos or amenities, we'll step in to make it right.</li>
        <li><strong>24/7 Safety Hotline:</strong> Direct priority assistance anytime during your trip.</li>
      </ul>
    `
  },
  antidiscrimination: {
    title: "Anti-discrimination Policy",
    html: `
      <p>At VestaGo, everyone belongs. We prohibit discrimination against any guest or host on the basis of:</p>
      <ul>
        <li>Race, ethnicity, national origin, or caste</li>
        <li>Religion or spiritual beliefs</li>
        <li>Sexual orientation or gender identity</li>
        <li>Marital status or familial background</li>
        <li>Physical disabilities or accessibility requirements</li>
      </ul>
      <p>Violations result in immediate removal of accounts and property listings.</p>
    `
  },
  accessibility: {
    title: "Accessibility at VestaGo",
    html: `
      <p>We believe travel and culinary spaces must be accessible to everyone.</p>
      <h4>Host Standards</h4>
      <p>Hosts are encouraged to list specific accessibility amenities such as step-free access, wide doorways, ground-floor bedrooms, and accessible parking.</p>
      <p>Need custom accommodations before your trip? Contact the host directly via your booking voucher.</p>
    `
  },
  community: {
    title: "Community Guidelines",
    html: `
      <p>Our guidelines keep the VestaGo ecosystem respectful, trustworthy, and welcoming:</p>
      <ul>
        <li><strong>Respect the Neighborhood:</strong> Mind local noise restrictions and quiet hours after 10 PM.</li>
        <li><strong>Honest Portrayal:</strong> Hosts must keep photos, amenities, and price points up to date.</li>
        <li><strong>Authentic Feedback:</strong> Reviews must represent truthful, first-hand guest experiences.</li>
      </ul>
    `
  },
  hostresources: {
    title: "Host Resources & Support",
    html: `
      <p>Hosting on VestaGo turns your unique property or culinary kitchen into a thriving destination.</p>
      <h4>Tips for Success:</h4>
      <ul>
        <li><strong>High-Resolution Photography:</strong> Spaces with multiple clear images receive 3x more bookings.</li>
        <li><strong>Competitive Pricing:</strong> Review local market averages to set balanced weekday and weekend rates.</li>
        <li><strong>Prompt Communication:</strong> Fast responses maintain high guest review scores and superhost status.</li>
      </ul>
    `
  },
  help: {
    title: "VestaGo Help Center",
    html: `
      <p>Have questions about your itinerary, hosting, or payments? We're here to help.</p>
      <h4>Common Topics:</h4>
      <ul>
        <li><strong>Modifying a Reservation:</strong> Go to <em>My Bookings</em> to view or cancel active itineraries.</li>
        <li><strong>VestaPay Receipts:</strong> Detailed tax invoices and booking vouchers are downloadable from your bookings page.</li>
        <li><strong>Email Support:</strong> Write to our team at <code>support@vestago.com</code> for account verification issues.</li>
      </ul>
    `
  },
  cancellation: {
    title: "Cancellation & Refund Policies",
    html: `
      <p>Transparent cancellation keeps reservations stress-free for both guests and hosts.</p>
      <h4>Standard Policy:</h4>
      <ul>
        <li><strong>Full Refund:</strong> Cancellations made up to 48 hours prior to check-in receive a 100% full refund through VestaPay.</li>
        <li><strong>Late Cancellations:</strong> Cancellations made within 48 hours of check-in may retain standard cleaning and first-night tariffs.</li>
      </ul>
    `
  },
  neighborhood: {
    title: "Report a Neighborhood Concern",
    html: `
      <p>Are you a neighbor experiencing issues related to a nearby VestaGo property (such as noise, parking, or trash)?</p>
      <p>Please email <code>concerns@vestago.com</code> with the property address. Our local trust & safety team investigates reports within 24 hours.</p>
    `
  },
  privacy: {
    title: "Privacy Policy",
    html: `
      <p>VestaGo respects your privacy. We collect minimal personal data (such as email, name, and booking history) strictly to facilitate reservations, verify guest reviews, and process secure payments.</p>
      <p>Your payment details (cards, UPI IDs) are processed through encrypted sandbox gateways and are never stored in raw text on our servers.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    html: `
      <p>By listing or booking on VestaGo, you agree to our standard platform terms:</p>
      <ul>
        <li>All users must provide authentic names and valid email addresses.</li>
        <li>Hosts are responsible for local compliance, occupancy taxes, and permits.</li>
        <li>Damages incurred during stays are subject to resolution under the VestaCover policy.</li>
      </ul>
    `
  },
  sitemap: {
    title: "VestaGo Sitemap",
    html: `
      <p>Quick directory of VestaGo platform destinations:</p>
      <ul>
        <li><strong>Stays & Villas:</strong> Explore curated villas, coastal cottages, and holiday stays.</li>
        <li><strong>Dining & Bistros:</strong> Reserve tables at artisan cafes and fine dining restaurants.</li>
        <li><strong>Host Dashboard:</strong> List and manage your properties.</li>
        <li><strong>Guest Hub:</strong> Access your Wishlist, Bookings, and confirmed vouchers.</li>
      </ul>
    `
  }
};

window.openInfoModal = function(key) {
  const content = siteFooterContent[key];
  if (!content) return;

  const infoModal = document.getElementById('infoModal');
  const infoModalTitle = document.getElementById('infoModalTitle');
  const infoModalBody = document.getElementById('infoModalBody');

  if (infoModal && infoModalTitle && infoModalBody) {
    infoModalTitle.innerText = content.title;
    infoModalBody.innerHTML = content.html;
    infoModal.classList.add('show');
  }
};

window.closeInfoModal = function() {
  const infoModal = document.getElementById('infoModal');
  if (infoModal) {
    infoModal.classList.remove('show');
  }
};

// Also close infoModal when clicking outside the card
const prevWindowClick = window.onclick;
window.onclick = (e) => {
  if (typeof prevWindowClick === 'function') prevWindowClick(e);
  const infoModal = document.getElementById('infoModal');
  if (e.target === infoModal) {
    infoModal.classList.remove('show');
  }
};