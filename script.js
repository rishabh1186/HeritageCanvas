document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map', { preferCanvas: true }).setView([20.5937, 78.9629], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  map.zoomControl.setPosition('bottomright');

  const markerLayer = L.layerGroup().addTo(map);
  let sites = [];
  let activeTheme = 'all';
  let activeYear = 2025;
  let searchQuery = '';
  let activeEpic = null;

  // --- NEW: Get references to the details sidebar elements ---
  const detailsSidebar = document.getElementById('detailsSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const detailsImage = document.getElementById('detailsImage');
  const detailsName = document.getElementById('detailsName');
  const detailsYear = document.getElementById('detailsYear');
  const detailsInfo = document.getElementById('detailsInfo');
  const detailsText = document.getElementById('detailsText');

  // --- NEW: Add error handling for missing elements ---
  if (!detailsSidebar || !closeSidebarBtn || !detailsImage || !detailsName || !detailsYear || !detailsInfo || !detailsText) {
    console.error('Some details sidebar elements are missing from the HTML');
  }

  function createMarker(item) {
    const iconUrls = {
      monuments_and_architecture: 'filters/monuments_and_architecture.png',
      folk_arts_and_handcrafts: 'filters/folk_arts_and_handcrafts.png',
      music_and_dance: 'filters/music_and_dance.png',
      cuisine: 'filters/cuisine.png',
      festivals_and_traditions: 'filters/festivals_and_traditions.png',
      spiritual_and_pilgrimage: 'filters/spiritual_and_pilgrimage.png',
      nature_and_wildlife: 'filters/nature_and_wildlife.png',
      tales_and_epics: 'images/heritage_icon.png',
      default: 'filters/monuments_and_architecture.png'
    };
    const iconUrl = iconUrls[item.category] || iconUrls.default;

    // Create a default fallback icon using a simple colored circle
    const defaultIcon = L.divIcon({
      html: `<div style="width: 20px; height: 20px; background-color: #3498db; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'default-marker-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const customIcon = L.icon({
      iconUrl: iconUrl,
      iconSize: [32, 37],
      iconAnchor: [16, 37],
      popupAnchor: [0, -28],
      errorIconUrl: iconUrls.default // Fallback to default icon on error
    });

    return L.marker(item.coords, { icon: customIcon });
  }

  // --- NEW: Function to display details in the sidebar ---
  function displayDetails(item) {
    // Handle image loading with error fallback
    if (item.image_url) {
      detailsImage.src = item.image_url;
      detailsImage.onerror = () => {
        console.warn(`Failed to load image for ${item.name}: ${item.image_url}`);
        detailsImage.style.display = 'none';
      };
      detailsImage.onload = () => {
        detailsImage.style.display = 'block';
      };
    } else {
      detailsImage.style.display = 'none';
    }

    detailsImage.alt = item.name;
    detailsName.textContent = item.name;
    detailsYear.textContent = item.year;
    detailsInfo.textContent = item.info;
    detailsText.textContent = item.details || "More details for this location will be added soon.";

    // Open the sidebar
    detailsSidebar.classList.add('open');
  }

  function showMarkers() {
    markerLayer.clearLayers();
    (sites || []).forEach(item => {
      let matchesTheme = activeTheme === 'all' || item.category === activeTheme;
      if (activeTheme === 'tales_and_epics' && activeEpic) {
        matchesTheme = matchesTheme && (String(item.epic || '').toLowerCase() === String(activeEpic).toLowerCase());
      }
      const matchesYear = Number(item.year) <= Number(activeYear);
      const query = (searchQuery || '').toLowerCase();
      const matchesSearch = !query || [
        item.name,
        item.info,
        item.details,
        item.category,
        String(item.year)
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(query));
      if (matchesTheme && matchesYear && matchesSearch) {
        const marker = createMarker(item);

        // Create popup content with click handlers
        const popupContent = `
          <div style="width:240px;font-family:'Poppins',sans-serif" class="marker-popup">
            ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;cursor:pointer" class="popup-image">` : ''}
            <h4 style="margin:0 0 6px 0;cursor:pointer" class="popup-name">${item.name}</h4>
            <div style="font-size:13px;color:#333">${item.info}</div>
            <div style="margin-top:8px;font-size:12px;color:#666">Year: ${item.year}</div>
          </div>
        `;

        // Bind popup to marker
        marker.bindPopup(popupContent, {minWidth:220});

        // Add click handler to popup content to open sidebar
        marker.on('popupopen', (e) => {
          const popup = e.popup;
          const popupElement = popup.getElement();

          // Add click handlers to name and image
          const nameElement = popupElement.querySelector('.popup-name');
          const imageElement = popupElement.querySelector('.popup-image');

          if (nameElement) {
            nameElement.addEventListener('click', (clickEvent) => {
              clickEvent.stopPropagation();
              marker.closePopup();
              displayDetails(item);
            });
          }

          if (imageElement) {
            imageElement.addEventListener('click', (clickEvent) => {
              clickEvent.stopPropagation();
              marker.closePopup();
              displayDetails(item);
            });
          }
        });

        // Optional: still show a simple tooltip on hover
        marker.bindTooltip(item.name);

        markerLayer.addLayer(marker);
      }
    });
  }

  fetch('data.json', { cache: 'no-cache' })
    .then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      return resp.json();
    })
    .then(data => {
      sites = data;
      // Make sure all entries have a details field for consistency
      sites.forEach(site => {
        if (!site.details) {
          site.details = "Detailed information for this site is not yet available.";
        }
      });
      showMarkers();
      console.log(`Successfully loaded ${sites.length} heritage sites`);
    })
    .catch(err => {
      console.error('Error loading data.json:', err);
      // Show user-friendly error message
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      errorMsg.innerHTML = `<strong>Error:</strong> Failed to load heritage sites data. Please check the console for details.`;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
    });

  const hamburger = document.getElementById('hamburger');
  const sidebarEl = document.getElementById('sidebar');
  const yearRange = document.getElementById('yearRange');
  const yearLabel = document.getElementById('yearLabel');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');

  function updateMapMargin() {
    const expanded = sidebarEl.classList.contains('expanded');
    const leftMargin = expanded ? getComputedStyle(document.documentElement).getPropertyValue('--sidebar-expanded-width').trim() : getComputedStyle(document.documentElement).getPropertyValue('--sidebar-collapsed-width').trim();
    document.getElementById('map').style.marginLeft = leftMargin;
    setTimeout(() => map.invalidateSize(), 360);
  }
  updateMapMargin();

  hamburger.addEventListener('click', () => {
    sidebarEl.classList.toggle('expanded');
    hamburger.classList.toggle('open');
    updateMapMargin();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentActiveBtn = document.querySelector('.filter-btn.active');
      const wasActiveClick = currentActiveBtn === btn;
      if (currentActiveBtn) currentActiveBtn.classList.remove('active');
      btn.classList.add('active');
      activeTheme = btn.dataset.theme;
      const epicSubfiltersEl = document.getElementById('epicSubfilters');
      if (epicSubfiltersEl) {
        if (activeTheme === 'tales_and_epics') {
          if (wasActiveClick) {
            epicSubfiltersEl.classList.remove('open');
            activeEpic = null;
            document.querySelectorAll('#epicSubfilters .subfilter-btn.active').forEach(b => b.classList.remove('active'));
          } else {
            epicSubfiltersEl.classList.add('open');
          }
        } else {
          epicSubfiltersEl.classList.remove('open');
          activeEpic = null;
          document.querySelectorAll('#epicSubfilters .subfilter-btn.active').forEach(b => b.classList.remove('active'));
        }
      }
      showMarkers();
    });
  });

  yearRange.addEventListener('input', e => {
    activeYear = e.target.value;
    yearLabel.textContent = activeYear;
    showMarkers();
  });

  function debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }
  if (searchInput) {
    const handleSearch = debounce((e) => {
      searchQuery = (e.target.value || '').trim();
      showMarkers();
    }, 300);
    searchInput.addEventListener('input', handleSearch);
  }
  if (clearSearch && searchInput) {
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      showMarkers();
    });
  }

  zoomIn.addEventListener('click', () => map.zoomIn());
  zoomOut.addEventListener('click', () => map.zoomOut());

  // --- NEW: Event listener to close the details sidebar ---
  closeSidebarBtn.addEventListener('click', () => {
    detailsSidebar.classList.remove('open');
  });

  // --- NEW: Close sidebar when clicking outside of it ---
  detailsSidebar.addEventListener('click', (e) => {
    if (e.target === detailsSidebar) {
      detailsSidebar.classList.remove('open');
    }
  });

  window.addEventListener('resize', () => {
    setTimeout(() => map.invalidateSize(), 200);
  });
  
  setTimeout(() => map.invalidateSize(), 500);
});




  // Subfilter buttons for Tales & Epics
  (function(){
    const epicButtons = document.querySelectorAll('#epicSubfilters .subfilter-btn');
    if (epicButtons && epicButtons.length) {
      epicButtons.forEach(sb => {
        sb.addEventListener('click', () => {
          const mainEpicBtn = document.querySelector('.filter-btn[data-theme="tales_and_epics"]');
          const currentActive = document.querySelector('.filter-btn.active');
          if (mainEpicBtn) {
            if (currentActive) currentActive.classList.remove('active');
            mainEpicBtn.classList.add('active');
          }
          activeTheme = 'tales_and_epics';

          epicButtons.forEach(b => b.classList.remove('active'));
          sb.classList.add('active');
          activeEpic = sb.dataset.epic;

          const epicSubfiltersEl = document.getElementById('epicSubfilters');
          if (epicSubfiltersEl) epicSubfiltersEl.classList.add('open');

          showMarkers();
        });
      });
    }
  })();