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

// ==========================================
// GLOBAL LOADER CONTROLLER
// ==========================================
const globalLoader = document.getElementById('globalLoader');

function showLoader() {
  if (globalLoader) globalLoader.classList.add('active');
}

function hideLoader() {
  if (globalLoader) globalLoader.classList.remove('active');
}

// ==========================================
// SYNCHRONIZED DARK / LIGHT MODE ENGINE
// ==========================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const menuThemeToggleBtn = document.getElementById('menuThemeToggleBtn');
const menuThemeToggleIcon = document.getElementById('menuThemeToggleIcon');
const menuThemeToggleText = document.getElementById('menuThemeToggleText');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);

  // Sync Header Button
  if (themeToggleIcon) {
    themeToggleIcon.classList.toggle('fa-sun', isDark);
    themeToggleIcon.classList.toggle('fa-moon', !isDark);
  }

  // Sync Mobile Menu Button
  if (menuThemeToggleIcon) {
    menuThemeToggleIcon.classList.toggle('fa-sun', isDark);
    menuThemeToggleIcon.classList.toggle('fa-moon', !isDark);
  }
  if (menuThemeToggleText) {
    menuThemeToggleText.innerText = isDark ? 'Light Mode' : 'Dark Mode';
  }
}

function toggleTheme() {
  const currentlyDark = document.body.classList.contains('dark-mode');
  const targetTheme = currentlyDark ? 'light' : 'dark';
  applyTheme(targetTheme);
  localStorage.setItem('vestago_theme', targetTheme);
  showToast(`${targetTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
}

const savedTheme = localStorage.getItem('vestago_theme') || 
  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

applyTheme(savedTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

if (menuThemeToggleBtn) {
  menuThemeToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
    userDropdown.classList.remove('show');
  });
}

function getWishlistStorageKey() {
  const currentUserId = currentUser ? (currentUser.id || currentUser._id) : null;
  if (currentUserId) {
    return `likedListings_${currentUserId}`;
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
let pendingAdminDeleteListingId = null;

// Track active Mapbox map instance
let activeMapboxInstance = null;

// Checkout State
let activeCheckoutItem = null;
let currentBookingNights = 1;
let currentGuestsCount = 1;
let selectedPaymentMethod = 'card';
let activeReceiptBooking = null;

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
const adminMenuBtn = document.getElementById('adminMenuBtn');

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
const adminModal = document.getElementById('adminModal');
const adminDeleteModal = document.getElementById('adminDeleteModal');
const adminTargetListingTitle = document.getElementById('adminTargetListingTitle');
const btnConfirmAdminDelete = document.getElementById('btnConfirmAdminDelete');
const detailContent = document.getElementById('detailContent');
const receiptContent = document.getElementById('receiptContent');
const btnCancelBookingModal = document.getElementById('btnCancelBookingModal');
const btnConfirmCancelBooking = document.getElementById('btnConfirmCancelBooking');
const btnConfirmDeleteReview = document.getElementById('btnConfirmDeleteReview');
const btnConfirmDeleteListing = document.getElementById('btnConfirmDeleteListing');
const btnDownloadReceipt = document.getElementById('btnDownloadReceipt');
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
const authSwitchPrompt = document.getElementById('authSwitchPrompt');
const authSwitchLink = document.getElementById('authSwitchLink');

// Payment Inputs
const payCardNumber = document.getElementById('payCardNumber');
const payCardExpiry = document.getElementById('payCardExpiry');
const payCardCvc = document.getElementById('payCardCvc');
const payCardHolder = document.getElementById('payCardHolder');
const payUpiId = document.getElementById('payUpiId');
const payBankSelect = document.getElementById('payBankSelect');
const payValidationError = document.getElementById('payValidationError');

// Date Pickers initialization
function initDatePickers() {
  if (!searchCheckin || !searchCheckout) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  searchCheckin.min = todayStr;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tYyyy = tomorrow.getFullYear();
  const tMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tDd = String(tomorrow.getDate()).padStart(2, '0');
  searchCheckout.min = `${tYyyy}-${tMm}-${tDd}`;

  searchCheckin.addEventListener('change', () => {
    if (!searchCheckin.value) {
      searchCheckout.min = todayStr;
      return;
    }

    const checkinDate = new Date(searchCheckin.value);
    const nextDay = new Date(checkinDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const nYyyy = nextDay.getFullYear();
    const nMm = String(nextDay.getMonth() + 1).padStart(2, '0');
    const nDd = String(nextDay.getDate()).padStart(2, '0');
    const nextDayStr = `${nYyyy}-${nMm}-${nDd}`;

    searchCheckout.min = nextDayStr;

    if (searchCheckout.value && searchCheckout.value <= searchCheckin.value) {
      searchCheckout.value = nextDayStr;
    }
  });
}

initDatePickers();

// Sync Auth UI with Admin Visibility Guard
syncAuthUI();

function syncAuthUI() {
  if (currentUser && authToken) {
    loggedOutMenu.style.display = 'none';
    loggedInMenu.style.display = 'block';
    userNameDisplay.innerText = `Hi, ${currentUser.name}`;

    // Admin Access Guard: ONLY visible if user has isAdmin: true
    if (adminMenuBtn) {
      adminMenuBtn.style.display = currentUser.isAdmin ? 'flex' : 'none';
    }
  } else {
    loggedOutMenu.style.display = 'block';
    loggedInMenu.style.display = 'none';
    if (adminMenuBtn) adminMenuBtn.style.display = 'none';
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
  authErrorMsg.style.display = 'none';

  if (mode === 'Log In') {
    document.getElementById('authModalTitle').innerText = 'Welcome to VestaGo';
    document.getElementById('authSubmitBtn').innerText = 'Log In';
    nameFieldGroup.style.display = 'none';
    authName.removeAttribute('required');
    if (authSwitchPrompt) authSwitchPrompt.innerText = "Don't have account?";
    if (authSwitchLink) authSwitchLink.innerText = "Register";
  } else {
    document.getElementById('authModalTitle').innerText = 'Create a VestaGo Account';
    document.getElementById('authSubmitBtn').innerText = 'Sign Up';
    nameFieldGroup.style.display = 'flex';
    authName.setAttribute('required', 'true');
    if (authSwitchPrompt) authSwitchPrompt.innerText = "Already have an account?";
    if (authSwitchLink) authSwitchLink.innerText = "Log In";
  }
  authModal.classList.add('show');
};

window.toggleAuthMode = function () {
  const targetMode = activeAuthMode === 'Log In' ? 'Sign Up' : 'Log In';
  openAuthModal(targetMode);
};

document.getElementById('closeAuthModalBtn').onclick = () => authModal.classList.remove('show');

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.style.display = 'none';

  const isSignUp = activeAuthMode === 'Sign Up';
  const endpoint = isSignUp ? `${AUTH_URL}/signup` : `${AUTH_URL}/login`;
  const payload = {
    email: authEmail.value.trim(),
    password: authPassword.value
  };
  if (isSignUp) payload.name = authName.value.trim();

  showLoader();
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

    if (isSignUp) {
      showToast(`Welcome to VestaGo, ${currentUser.name}! Confirmation email sent.`);
    } else {
      showToast(`Welcome back, ${currentUser.name}!`);
    }

    fetchListings();
  } catch (err) {
    authErrorMsg.innerText = 'Server error. Please try again.';
    authErrorMsg.style.display = 'block';
  } finally {
    hideLoader();
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

function renderSkeletons() {
  listingsGrid.innerHTML = Array(8).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text" style="width: 70%;"></div>
      <div class="skeleton-text" style="width: 40%;"></div>
    </div>
  `).join('');
}

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
  showLoader();

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
  } finally {
    setTimeout(hideLoader, 200);
  }
}

function resolveImage(img) {
  if (!img) return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${BASE_URL}${img}`;
}

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

  const currentUserId = currentUser ? (currentUser.id || currentUser._id) : null;

  listingsGrid.innerHTML = listings.map((item) => {
    const isLiked = likedIds.includes(item._id);
    const coverImage = resolveImage(item.images && item.images.length ? item.images[0] : item.image);
    const isOwner = currentUserId && item.owner && ((item.owner._id || item.owner) === currentUserId);

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

  const isDark = document.body.classList.contains('dark-mode');

  activeMapboxInstance = new mapboxgl.Map({
    container: 'detailMap',
    style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
    center: coordinates,
    zoom: 12
  });

  activeMapboxInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

  const popup = new mapboxgl.Popup({ offset: 25 })
    .setHTML(`<strong>${title}</strong><br/><span style="color:#888;">${locationQuery}</span>`);

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

// -------------------------------------------------------------
// DETAIL MODAL
// -------------------------------------------------------------
window.openDetailModal = async function (id) {
  showLoader();
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const item = await res.json();
    const images = (item.images && item.images.length) ? item.images : [item.image || ''];
    selectedRatingScore = 5;

    window.currentListingReviews = item.reviews || [];
    const currentUserId = currentUser ? (currentUser.id || currentUser._id) : null;

    const reviewsMarkup = item.reviews && item.reviews.length > 0 
      ? item.reviews.map((r, index) => {
          const isReviewAuthor = currentUser && r.userName === currentUser.name;
          const isPropertyOwner = currentUserId && item.owner && ((item.owner._id || item.owner) === currentUserId);
          const canDelete = isReviewAuthor || isPropertyOwner || (currentUser && currentUser.isAdmin);

          return `
            <div class="review-item" id="review-dom-${index}">
              <div class="review-header">
                <span class="review-author">${r.userName}</span>
                <span class="review-date">
                  ${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
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

      <h4 style="margin-top: 24px;"><i class="fa-solid fa-map-location-dot"></i> Where you'll be</h4>
      <div id="detailMap"></div>

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

      <div class="checkout-box">
        <div>
          <h3>₹${Number(item.price).toLocaleString()} <span style="font-size:0.85rem; font-weight:normal;">${item.type === 'hotel' ? '/ night' : '/ guest'}</span></h3>
          <small>Select mandatory reservation dates below</small>
        </div>

        <div class="detail-booking-controls">
          <div class="detail-booking-field">
            <label for="detailCheckin">Check In *</label>
            <input type="date" id="detailCheckin" required />
          </div>
          <div class="detail-booking-field">
            <label for="detailCheckout">Check Out *</label>
            <input type="date" id="detailCheckout" required />
          </div>
          <div class="detail-booking-field" style="max-width: 110px;">
            <label for="detailGuests">Guests *</label>
            <input type="number" id="detailGuests" min="1" max="20" value="1" required />
          </div>
        </div>

        <p id="detailBookingError" class="detail-booking-error"></p>

        <div class="checkout-box-bottom">
          <small style="color: var(--text-muted);"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Free cancellation up to 48 hours prior</small>
          <button class="submit-btn pay-now-btn" style="width: auto; padding: 12px 30px;" onclick="validateAndOpenGateway('${item._id}', '${item.title.replace(/'/g, "\\'")}', '${item.type}', ${item.price}, '${item.location.replace(/'/g, "\\'")}', '${resolveImage(images[0])}')">
            ${item.type === 'hotel' ? 'Reserve Stay' : 'Book Table'}
          </button>
        </div>
      </div>
    `;

    detailModal.classList.add('show');

    const dtIn = document.getElementById('detailCheckin');
    const dtOut = document.getElementById('detailCheckout');
    const dtGuests = document.getElementById('detailGuests');

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dtIn.min = `${yyyy}-${mm}-${dd}`;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmY = tomorrow.getFullYear();
    const tmM = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tmD = String(tomorrow.getDate()).padStart(2, '0');
    dtOut.min = `${tmY}-${tmM}-${tmD}`;

    if (searchCheckin && searchCheckin.value) dtIn.value = searchCheckin.value;
    if (searchCheckout && searchCheckout.value) dtOut.value = searchCheckout.value;
    if (searchGuests && searchGuests.value) dtGuests.value = searchGuests.value;

    dtIn.addEventListener('change', () => {
      if (dtIn.value) {
        const nextDay = new Date(dtIn.value);
        nextDay.setDate(nextDay.getDate() + 1);
        const ny = nextDay.getFullYear();
        const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
        const nd = String(nextDay.getDate()).padStart(2, '0');
        dtOut.min = `${ny}-${nm}-${nd}`;
        if (!dtOut.value || dtOut.value <= dtIn.value) {
          dtOut.value = `${ny}-${nm}-${nd}`;
        }
      }
    });

    setTimeout(() => {
      initDetailMap(item.location, item.title);
    }, 200);

  } catch (err) {
    console.error('Failed to load item detail:', err);
  } finally {
    hideLoader();
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

  showLoader();
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
  } finally {
    hideLoader();
  }
};

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

btnConfirmDeleteReview.onclick = async function () {
  if (!pendingDeleteReview) return;
  const { listingId, reviewIndex, reviewId, comment, userName } = pendingDeleteReview;
  closeDeleteReviewModal();

  const identifier = reviewId || reviewIndex;
  showLoader();

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
      showToast('Review deleted permanently');
      await openDetailModal(listingId);
      fetchListings();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Could not delete review');
    }
  } catch (err) {
    showToast('Network error while deleting review');
  } finally {
    hideLoader();
  }
};

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

  showLoader();
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      showToast('Listing has been successfully deleted.');
      allListingsCache = [];
      fetchListings();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Could not delete listing');
    }
  } catch (err) {
    showToast('Network error while deleting listing');
  } finally {
    hideLoader();
  }
};

window.switchPaymentMethod = function (method) {
  selectedPaymentMethod = method;

  document.getElementById('tabPayCard').classList.toggle('active', method === 'card');
  document.getElementById('tabPayUpi').classList.toggle('active', method === 'upi');
  document.getElementById('tabPayNetbanking').classList.toggle('active', method === 'netbanking');

  document.getElementById('panelPayCard').classList.toggle('active', method === 'card');
  document.getElementById('panelPayUpi').classList.toggle('active', method === 'upi');
  document.getElementById('panelPayNetbanking').classList.toggle('active', method === 'netbanking');

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

window.validateAndOpenGateway = function(listingId, title, type, price, location, image) {
  const dtIn = document.getElementById('detailCheckin');
  const dtOut = document.getElementById('detailCheckout');
  const dtGuests = document.getElementById('detailGuests');
  const errBox = document.getElementById('detailBookingError');

  if (errBox) errBox.style.display = 'none';

  if (!currentUser) {
    showToast('Please log in to make a reservation');
    openAuthModal('Log In');
    return;
  }

  if (!dtIn.value || !dtOut.value) {
    if (errBox) {
      errBox.innerText = 'Please select both Check-In and Check-Out dates to proceed.';
      errBox.style.display = 'block';
    }
    return;
  }

  const cin = new Date(dtIn.value);
  const cout = new Date(dtOut.value);

  if (cout <= cin) {
    if (errBox) {
      errBox.innerText = 'Check-Out date must be after Check-In date.';
      errBox.style.display = 'block';
    }
    return;
  }

  const diffTime = Math.abs(cout - cin);
  currentBookingNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  currentGuestsCount = parseInt(dtGuests.value, 10) || 1;

  const formatDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const checkInDateFormatted = formatDate(cin);
  const checkOutDateFormatted = formatDate(cout);
  const dateFormattedString = `${checkInDateFormatted} to ${checkOutDateFormatted}`;

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
    checkInDate: checkInDateFormatted,
    checkOutDate: checkOutDateFormatted,
    dates: dateFormattedString,
    baseTotal,
    cleaningFee,
    taxes,
    finalTotal
  };

  document.getElementById('ckListingTitle').innerText = title;
  document.getElementById('ckListingType').innerText = type === 'hotel' ? 'Stay' : 'Dining';
  document.getElementById('ckListingLoc').innerText = location;
  document.getElementById('ckListingImg').src = image;
  document.getElementById('ckDateRange').innerText = dateFormattedString;
  document.getElementById('ckGuestCount').innerText = `${currentGuestsCount} Guest(s)`;

  document.getElementById('ckRateMath').innerText = `₹${price.toLocaleString()} x ${currentBookingNights} ${type === 'hotel' ? 'night(s)' : 'seat(s)'}`;
  document.getElementById('ckBaseTotal').innerText = `₹${baseTotal.toLocaleString()}`;
  document.getElementById('ckCleaningFee').innerText = `₹${cleaningFee.toLocaleString()}`;
  document.getElementById('ckTaxes').innerText = `₹${taxes.toLocaleString()}`;
  document.getElementById('ckFinalTotal').innerText = `₹${finalTotal.toLocaleString()}`;

  document.getElementById('payBtnText').innerText = `Pay ₹${finalTotal.toLocaleString()} with VestaPay`;

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
      checkInDate: activeCheckoutItem.checkInDate,
      checkOutDate: activeCheckoutItem.checkOutDate,
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

    fetch(`${API_URL}/bookings/confirm-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    }).catch(err => console.error('Booking confirmation email error:', err));

    showReceipt(newBooking);
    showToast('Payment successful! Booking confirmed & voucher emailed.');
  }, 1200);
};

function showPaymentError(msg) {
  if (!payValidationError) return;
  payValidationError.innerText = msg;
  payValidationError.style.display = 'block';
}

function showReceipt(booking) {
  activeReceiptBooking = booking;

  const checkIn = booking.checkInDate || (booking.dates && booking.dates.includes(' to ') ? booking.dates.split(' to ')[0] : 'Confirmed');
  const checkOut = booking.checkOutDate || (booking.dates && booking.dates.includes(' to ') ? booking.dates.split(' to ')[1] : 'Confirmed');

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
      <span>Check-in:</span>
      <strong>${checkIn}</strong>
    </div>
    <div class="receipt-row">
      <span>Check-out:</span>
      <strong>${checkOut}</strong>
    </div>
    <div class="receipt-row">
      <span>Duration & Party:</span>
      <strong>${booking.nights || 1} Night(s) · ${booking.guests || 1} Guest(s)</strong>
    </div>
    <div class="receipt-row">
      <span>Location:</span>
      <strong>${booking.location}</strong>
    </div>
    <div class="receipt-row">
      <span>Paid via:</span>
      <strong style="color: #10b981;"><i class="fa-solid fa-shield-halved"></i> ${booking.paymentMethodUsed || 'VestaPay Sandbox'}</strong>
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
      <strong style="color: #ff385c;">₹${Number(booking.totalAmount).toLocaleString()}</strong>
    </div>
  `;

  if (btnDownloadReceipt) {
    btnDownloadReceipt.onclick = () => downloadReceiptPdf(booking);
  }

  btnCancelBookingModal.onclick = () => promptCancelBooking(booking.id);
  receiptModal.classList.add('show');
}

function downloadReceiptPdf(booking) {
  if (!booking) return;

  const printWindow = window.open('', '_blank', 'width=750,height=850');
  if (!printWindow) {
    showToast('Please allow popups to download your receipt');
    return;
  }

  const checkIn = booking.checkInDate || (booking.dates && booking.dates.includes(' to ') ? booking.dates.split(' to ')[0] : 'N/A');
  const checkOut = booking.checkOutDate || (booking.dates && booking.dates.includes(' to ') ? booking.dates.split(' to ')[1] : 'N/A');

  const printHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>VestaGo Voucher - ${booking.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #222; padding: 40px; margin: 0; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ff385c; padding-bottom: 20px; margin-bottom: 30px; }
        .brand { font-size: 28px; font-weight: 800; color: #ff385c; }
        .brand span { color: #8a2387; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; background: #fafafa; margin-bottom: 25px; }
        .row { display: flex; justify-content: space-between; padding: 9px 0; font-size: 14px; }
        .divider { height: 1px; background: #e5e7eb; margin: 14px 0; }
        .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #111; padding-top: 10px; }
        .total-price { color: #ff385c; }
        .footer-note { text-align: center; font-size: 12px; color: #6b7280; margin-top: 40px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">Vesta<span>Go</span></div>
          <div style="font-size: 13px; color: #666;">Official Booking Voucher & Tax Invoice</div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0;">${booking.id}</h2>
          <p style="color: #047857; font-weight: 700; margin: 4px 0 0;">CONFIRMED</p>
        </div>
      </div>
      <div class="card">
        <div class="row"><span>Guest Name:</span><strong>${booking.userName}</strong></div>
        <div class="row"><span>Property:</span><strong>${booking.title}</strong></div>
        <div class="row"><span>Check-In:</span><strong>${checkIn}</strong></div>
        <div class="row"><span>Check-Out:</span><strong>${checkOut}</strong></div>
        <div class="row"><span>Total Paid:</span><strong style="color: #ff385c;">₹${Number(booking.totalAmount).toLocaleString()}</strong></div>
      </div>
      <div class="footer-note">Protected by VestaCover. Present this voucher upon arrival.</div>
      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

window.closeReceiptModal = function () {
  receiptModal.classList.remove('show');
};

window.promptCancelBooking = function (bookingId) {
  pendingCancelBookingId = bookingId;
  confirmCancelModal.classList.add('show');
};

window.closeConfirmModal = function () {
  pendingCancelBookingId = null;
  confirmCancelModal.classList.remove('show');
};

btnConfirmCancelBooking.onclick = async function () {
  if (!pendingCancelBookingId) return;

  const targetBooking = userBookings.find(b => b.id === pendingCancelBookingId);
  userBookings = userBookings.filter(b => b.id !== pendingCancelBookingId);
  localStorage.setItem('userBookings', JSON.stringify(userBookings));

  confirmCancelModal.classList.remove('show');
  receiptModal.classList.remove('show');

  if (targetBooking && targetBooking.userEmail) {
    try {
      await fetch(`${API_URL}/bookings/cancel-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetBooking)
      });
    } catch (err) {
      console.error('Error dispatching cancellation email:', err);
    }
  }

  pendingCancelBookingId = null;
  showToast('Booking cancelled. Confirmation email sent & 100% refund credited.');

  if (currentFilter === 'bookings') {
    renderBookings();
  }
};

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

  listingsGrid.innerHTML = myBookings.map(b => {
    const displayDates = (b.checkInDate && b.checkOutDate)
      ? `${b.checkInDate} to ${b.checkOutDate}`
      : (b.dates || 'Confirmed Reservation');

    return `
      <article class="booking-card">
        <div class="booking-card-header">
          <span class="booking-badge">${b.status}</span>
          <small style="color: var(--text-muted);">${b.id}</small>
        </div>
        <div class="card-img-wrapper" style="aspect-ratio: 16 / 9;">
          <img src="${b.image}" alt="${b.title}" class="card-img" />
        </div>
        <div>
          <h3 style="font-size: 1.05rem; margin-bottom: 4px; color: var(--text-dark);">${b.title}</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-location-dot"></i> ${b.location}</p>
          <p style="font-size:0.85rem; color: var(--text-muted); margin-top:4px;">${displayDates}</p>
          <p style="margin-top: 8px; font-size: 0.95rem; color: var(--text-dark);">
            <strong>Total: ₹${Number(b.totalAmount).toLocaleString()}</strong>
          </p>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button class="btn-card" onclick="openReceiptById('${b.id}')">View Receipt</button>
          <button class="btn-card btn-delete" onclick="promptCancelBooking('${b.id}')">Cancel</button>
        </div>
      </article>
    `;
  }).join('');
}

window.openReceiptById = function(bookingId) {
  const b = userBookings.find(item => item.id === bookingId);
  if (b) showReceipt(b);
};

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
  showLoader();

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
  } finally {
    hideLoader();
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

  const currentUserId = currentUser.id || currentUser._id;
  const sourceData = allListingsCache.length ? allListingsCache : currentListingsData;
  const owned = sourceData.filter(item => item.owner && ((item.owner._id || item.owner) === currentUserId));

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
  initDatePickers();
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

  showLoader();
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
  } finally {
    hideLoader();
  }
});

window.openEditModal = async function (id) {
  showLoader();
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
  } finally {
    hideLoader();
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

document.getElementById('filterModalBtn').onclick = () => filterModal.classList.add('show');
document.getElementById('closeFilterModalBtn').onclick = () => filterModal.classList.remove('show');

window.applyFilters = function () {
  filterModal.classList.remove('show');
  fetchListings();
};

document.getElementById('closeModalBtn').onclick = () => listingModal.classList.remove('show');
document.getElementById('closeDetailModalBtn').onclick = () => detailModal.classList.remove('show');
document.getElementById('openCreateModalBtn').onclick = openCreateModal;

// ==========================================
// ADMIN PORTAL CLIENT-SIDE HANDLERS
// ==========================================
window.openAdminModal = async function () {
  if (!currentUser || !currentUser.isAdmin) {
    showToast('Unauthorized: Admin access restricted.');
    return;
  }

  userDropdown.classList.remove('show');
  showLoader();

  try {
    const metricsRes = await fetch(`${API_URL}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!metricsRes.ok) throw new Error('Failed to load metrics');
    const metrics = await metricsRes.json();

    document.getElementById('adMetricTotalListings').innerText = metrics.totalListings;
    document.getElementById('adMetricTotalUsers').innerText = metrics.totalUsers;
    document.getElementById('adMetricStays').innerText = metrics.staysCount;
    document.getElementById('adMetricDining').innerText = metrics.diningCount;

    if (!allListingsCache.length) {
      const res = await fetch(`${API_URL}?type=all`);
      allListingsCache = await res.json();
    }

    const tableBody = document.getElementById('adminListingsTableBody');
    tableBody.innerHTML = allListingsCache.map(item => `
      <tr>
        <td>
          <img src="${resolveImage(item.images && item.images.length ? item.images[0] : item.image)}" class="admin-thumb" alt="${item.title}" />
        </td>
        <td><strong>${item.title}</strong></td>
        <td><span class="pill-badge" style="padding: 3px 8px; font-size: 0.75rem;">${item.type === 'hotel' ? 'Stay' : 'Dining'}</span></td>
        <td>₹${Number(item.price).toLocaleString()}</td>
        <td>${item.location}</td>
        <td>
          <button class="admin-del-btn" onclick="promptAdminDeleteListing('${item._id}', '${item.title.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-trash-can"></i> Force Delete
          </button>
        </td>
      </tr>
    `).join('');

    adminModal.classList.add('show');
  } catch (err) {
    console.error('Admin modal error:', err);
    showToast('Could not load Admin Dashboard');
  } finally {
    hideLoader();
  }
};

window.closeAdminModal = function () {
  if (adminModal) adminModal.classList.remove('show');
};

// Open the Luxury Modal Confirmation Dialog instead of window.confirm
window.promptAdminDeleteListing = function (id, title) {
  pendingAdminDeleteListingId = id;
  if (adminTargetListingTitle) {
    adminTargetListingTitle.innerText = `"${title}"`;
  }
  adminDeleteModal.classList.add('show');
};

window.closeAdminDeleteModal = function () {
  pendingAdminDeleteListingId = null;
  adminDeleteModal.classList.remove('show');
};

btnConfirmAdminDelete.onclick = async function () {
  if (!pendingAdminDeleteListingId) return;
  const id = pendingAdminDeleteListingId;
  closeAdminDeleteModal();

  showLoader();
  try {
    const res = await fetch(`${API_URL}/admin/force-delete/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.ok) {
      showToast('Property permanently removed by Admin.');
      allListingsCache = [];
      await openAdminModal();
      fetchListings();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Force delete failed');
    }
  } catch (err) {
    showToast('Network error during admin delete');
  } finally {
    hideLoader();
  }
};

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
  if (e.target === adminModal) adminModal.classList.remove('show');
  if (e.target === adminDeleteModal) adminDeleteModal.classList.remove('show');
  const infoModal = document.getElementById('infoModal');
  if (infoModal && e.target === infoModal) infoModal.classList.remove('show');
};

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    updateActiveTabUI();
    fetchListings();
  });
});

heroSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentFilter === 'bookings' || currentFilter === 'wishlist' || currentFilter === 'myListings') {
    currentFilter = 'all';
    updateActiveTabUI();
  }
  fetchListings();
});

const siteFooterContent = {
  about: {
    title: "About VestaGo",
    html: `
      <p><strong>VestaGo</strong> connects curious travelers and food enthusiasts with handpicked boutique villas, beach retreats, and curated culinary dining experiences across India and beyond.</p>
      <h4>Our Philosophy</h4>
      <p>Whether you're seeking a secluded coastal villa in Malvan or an artisanal bistro table in Delhi, VestaGo guarantees verified spaces and transparent reservations.</p>
    `
  },
  vestacover: {
    title: "VestaCover Protection",
    html: `
      <p>Every booking through VestaGo automatically includes <strong>VestaCover</strong> — complimentary coverage built directly into your stay or dining reservation.</p>
      <ul>
        <li><strong>Booking Guarantee:</strong> If a host cancels within 48 hours of check-in, we will find an equal or better stay or refund 100% instantly.</li>
        <li><strong>Listing Inaccuracy Protection:</strong> If a place differs substantially from its photos or amenities, we'll step in to make it right.</li>
      </ul>
    `
  },
  antidiscrimination: {
    title: "Anti-discrimination Policy",
    html: `<p>At VestaGo, everyone belongs. We prohibit discrimination against any guest or host.</p>`
  },
  accessibility: {
    title: "Accessibility at VestaGo",
    html: `<p>We believe travel and culinary spaces must be accessible to everyone.</p>`
  },
  community: {
    title: "Community Guidelines",
    html: `<p>Our guidelines keep the VestaGo ecosystem respectful, trustworthy, and welcoming.</p>`
  },
  hostresources: {
    title: "Host Resources & Support",
    html: `<p>Hosting on VestaGo turns your unique property or culinary kitchen into a thriving destination.</p>`
  },
  help: {
    title: "VestaGo Help Center",
    html: `<p>Have questions about your itinerary, hosting, or payments? Contact us at <code>support@vestago.com</code>.</p>`
  },
  cancellation: {
    title: "Cancellation & Refund Policies",
    html: `<p>Cancellations made up to 48 hours prior to check-in receive a 100% full refund through VestaPay.</p>`
  },
  neighborhood: {
    title: "Report a Neighborhood Concern",
    html: `<p>Please email <code>concerns@vestago.com</code> with the property address.</p>`
  },
  privacy: {
    title: "Privacy Policy",
    html: `<p>VestaGo respects your privacy. We collect minimal personal data strictly to facilitate reservations.</p>`
  },
  terms: {
    title: "Terms of Service",
    html: `<p>By listing or booking on VestaGo, you agree to our standard platform terms.</p>`
  },
  sitemap: {
    title: "VestaGo Sitemap",
    html: `<p>Quick directory of VestaGo platform destinations across Stays, Dining, and Experiences.</p>`
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

(function initWalkingPlaceholder() {
  if (!searchWhere) return;

  const phrases = [
    "Search destinations, cities...",
    "Explore Malvan, Maharashtra...",
    "Search beachfront villas in Goa...",
    "Find rooftop bistros in Mumbai...",
    "Discover mountain stays in Manali..."
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isUserInteracting = false;

  searchWhere.addEventListener('focus', () => { isUserInteracting = true; });
  searchWhere.addEventListener('input', () => { isUserInteracting = true; });
  searchWhere.addEventListener('blur', () => {
    if (!searchWhere.value.trim()) {
      isUserInteracting = false;
    }
  });

  function typeStep() {
    if (isUserInteracting) {
      setTimeout(typeStep, 600);
      return;
    }

    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      searchWhere.setAttribute("placeholder", currentPhrase.substring(0, charIndex + 1));
      charIndex++;

      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(typeStep, 1800);
        return;
      }
    } else {
      searchWhere.setAttribute("placeholder", currentPhrase.substring(0, charIndex - 1));
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(typeStep, 350);
        return;
      }
    }

    const typingSpeed = isDeleting ? 40 : 80;
    setTimeout(typeStep, typingSpeed);
  }

  typeStep();
})();

// Initial Fetch
fetchListings();