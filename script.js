
const API_KEY = typeof CONFIG !== 'undefined' && CONFIG.API_KEY ? CONFIG.API_KEY : '0cc93d3aba79b006f4354a3502680929';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const IMG_BACKDROP = 'https://image.tmdb.org/t/p/original';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed/';
let currentSlide = 0;
let slideInterval;

async function tmdb(endpoint, params = '') {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${API_KEY}&${params}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('API error');
    return await r.json();
  } catch (e) {
    console.error('TMDB fetch error:', e);
    return null;
  }
}

function renderCard(movie) {
  const div = document.createElement('div');
  div.className = 'card';
  const year = (movie.release_date || '').slice(0, 4);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '?';
  if (movie.poster_path) {
    div.innerHTML = `
        <img class="card-poster" src="${IMG_BASE}${movie.poster_path}" alt="${movie.title}" loading="lazy">
        <div class="card-info">
          <div class="card-title">${movie.title}</div>
          <div class="card-sub"><span>${year}</span><span class="card-rating">★ ${rating}</span></div>
          <button class="card-trailer-btn" type="button" onclick="openTrailer(${movie.id})">Watch Trailer</button>
        </div>`;
  } else {
    div.innerHTML = `
        <div class="card-poster-placeholder">
          <div class="movie-icon">🎬</div>
          <div class="movie-title-sm">${movie.title}</div>
        </div>
        <div class="card-info">
          <div class="card-title">${movie.title}</div>
          <div class="card-sub"><span>${year}</span><span class="card-rating">★ ${rating}</span></div>
          <button class="card-trailer-btn" type="button" onclick="openTrailer(${movie.id})">Watch Trailer</button>
        </div>`;
  }
  return div;
}

async function fetchTrailer(movieId) {
  const data = await tmdb(`/movie/${movieId}/videos`);
  if (!data || !data.results) return null;
  return data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
    || data.results.find(v => v.site === 'YouTube')
    || null;
}

function showTrailer(video) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('videoContainer');
  container.innerHTML = `<iframe src="${YOUTUBE_EMBED}${video.key}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  overlay.classList.add('show');
}

function closeTrailerModal() {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('videoContainer');
  overlay.classList.remove('show');
  container.innerHTML = '';
}

async function openTrailer(movieId) {
  const trailer = await fetchTrailer(movieId);
  if (!trailer) {
    showToast('Trailer not available for this movie.');
    return;
  }
  showTrailer(trailer);
}

function openMovieInfo(movieId) {
  window.open(`https://www.themoviedb.org/movie/${movieId}`, '_blank');
}

function populateRow(rowId, movies) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  movies.forEach(m => row.appendChild(renderCard(m)));
}

function buildHeroSlide(movie, idx) {
  const slide = document.createElement('div');
  slide.className = 'slide' + (idx === 0 ? ' active' : '');
  if (movie.backdrop_path) {
    slide.style.backgroundImage = `url('${IMG_BACKDROP}${movie.backdrop_path}')`;
  } else {
    slide.style.background = 'linear-gradient(135deg, #4c1d95, #030303)';
  }
  const year = (movie.release_date || '').slice(0, 4);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '?';
  slide.innerHTML = `
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <div class="slide-badge">🔥 Trending</div>
        <div class="slide-title">${movie.title}</div>
        <div class="slide-meta">
          <span class="rating">★ ${rating}</span>
          <span>${year}</span>
        </div>
        <div class="slide-desc">${movie.overview || ''}</div>
        <div class="slide-btns">
          <button class="btn-play" onclick="openTrailer(${movie.id})">▶ Watch Trailer</button>
          <button class="btn-info" onclick="openMovieInfo(${movie.id})">ℹ More Info</button>
        </div>
      </div>`;
  return slide;
}

function buildDots(count) {
  const container = document.getElementById('slideDots');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.onclick = () => goToSlide(i);
    container.appendChild(d);
  }
}

function updateDots(idx) {
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.className = 'dot' + (i === idx ? ' active' : '');
  });
}

function goToSlide(idx) {
  const slides = document.querySelectorAll('.slide');
  slides[currentSlide]?.classList.remove('active');
  currentSlide = (idx + slides.length) % slides.length;
  slides[currentSlide]?.classList.add('active');
  updateDots(currentSlide);
}

function changeSlide(dir) {
  clearInterval(slideInterval);
  goToSlide(currentSlide + dir);
  startSlideshow();
}

function startSlideshow() {
  slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
}

function setupHero(movies) {
  const hero = document.getElementById('hero');
  hero.querySelectorAll('.slide').forEach(s => s.remove());
  movies.slice(0, 6).forEach((m, i) => {
    hero.insertBefore(buildHeroSlide(m, i), hero.querySelector('.slide-arrow'));
  });
  buildDots(Math.min(movies.length, 6));
  clearInterval(slideInterval);
  currentSlide = 0;
  startSlideshow();
}

async function loadAll() {
  const [trending, popular, topRated, action] = await Promise.all([
    tmdb('/trending/movie/week'),
    tmdb('/movie/popular'),
    tmdb('/movie/top_rated'),
    tmdb('/discover/movie', 'with_genres=28'),
  ]);
  if (trending) { setupHero(trending.results); populateRow('trendingRow', trending.results.slice(0, 12)); }
  if (popular) populateRow('popularRow', popular.results.slice(0, 12));
  if (topRated) populateRow('topRatedRow', topRated.results.slice(0, 12));
  if (action) populateRow('actionRow', action.results.slice(0, 12));
}

// Genre filter
document.getElementById('genreRow').addEventListener('click', async function (e) {
  const pill = e.target.closest('.genre-pill');
  if (!pill) return;
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  const genre = pill.dataset.genre;
  const row = document.getElementById('trendingRow');
  row.innerHTML = '<div style="color:var(--text-muted);padding:1rem;">Loading...</div>';
  const data = genre === 'All'
    ? await tmdb('/trending/movie/week')
    : await tmdb('/discover/movie', `with_genres=${genre}`);
  if (data) populateRow('trendingRow', data.results.slice(0, 12));
});

// Search
let searchTimer;
document.getElementById('searchInput').addEventListener('input', function () {
  clearTimeout(searchTimer);
  const q = this.value.trim();
  searchTimer = setTimeout(async () => {
    if (!q) { loadAll(); return; }
    const data = await tmdb('/search/movie', `query=${encodeURIComponent(q)}`);
    if (data) populateRow('trendingRow', data.results.slice(0, 12));
  }, 500);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('modalOverlay').classList.contains('show')) {
    closeTrailerModal();
  }
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

loadAll();
