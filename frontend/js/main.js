
const API_HOST_URL = 'http://localhost:3000';

/* ****************************************************************** */ 

let currentPage = 1;
let totalPages = 1;
let isLoading = false;

let allWallpapers = [];
let currentImageIndex = 0;

let isOpenPreviewPopup = false;

// Single WallpaperInfo data
let currentWallpaperInfo = null;
// List of WallpaperInfo data
let currentListWallpaperInfo = null;

let buttonTimeout = null;

/* ****************************************************************** */ 
// Popup: Review wallpapers
/* ****************************************************************** */ 

async function fetchWallpaperDetail(wallpaperId) {
  try {
    const provider = document.getElementById('providerSelect').value;
    //...
  } catch (error) {
    console.error('Error fetch wallpaper detail:', error);
    throw error;
  }
}

async function downloadWallpaper() {

  const wallpaperId = allWallpapers[currentImageIndex].id;

  const imageUrl = await fetchWallpaperDetail(wallpaperId);

  const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || 'wallpaper.jpg';
  
  fetch(imageUrl)
    .then(response => {
      if (!response.ok) throw new Error('Can\'t download this file!');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error downloading:', error);
      alert('Can\'t download this wallpaper!');
    });
}

async function updateWallpaperStatus(index, wallpaperData, isPopup, flowType) {

  console.log(`Index: ${index}`);
  console.log(`Wallpaper Data: ${JSON.stringify(wallpaperData,null,2)}`);
  console.log(`Is Popup: ${isPopup}`);
  console.log(`Flow Type: ${flowType}`);

  // Get index of this wallpaper has selected...
  if (index) currentImageIndex = index;

  const wallpaperInfo = (typeof wallpaperData === 'object') ? wallpaperData : JSON.parse(wallpaperData);

  // Sync update...
  const result = await updateWallpaperStatusRequest(wallpaperInfo);
  if (result) {

    if (flowType==='remove') {
      allWallpapers[currentImageIndex].isRemoved = true;
      // alert(`Wallpaper '${wallpaperInfo.id}' (with index ${currentImageIndex}) has removed!`);
    }
    else if (flowType==='add-album') {
      allWallpapers[currentImageIndex].addedAlbum = true;
    }

    // Hiển thị overlay cho Popup
    if (isPopup) {
      const viewPopup = document.getElementById('view-popup');
      const existingOverlay = viewPopup.querySelector('.remove-overlay');
      if (existingOverlay) existingOverlay.remove();
      const removeOverlay = document.createElement('div');
      removeOverlay.className = 'remove-overlay active';
      removeOverlay.innerHTML = `<span>Wallpaper has been ${(flowType==='remove')?'removed':'added to album'}!</span>`;
      viewPopup.appendChild(removeOverlay);
    }
    
    // Thêm overlay với icon Unavailable trên profile-card
    const profileCards = document.querySelectorAll('#profilesGrid .profile-card');
    const targetCard = profileCards[currentImageIndex];
    if (targetCard) {
      const existingCardOverlay = targetCard.querySelector('.card-remove-overlay');
      if (existingCardOverlay) existingCardOverlay.remove();
      const cardOverlay = document.createElement('div');
      cardOverlay.className = 'card-remove-overlay';
      cardOverlay.innerHTML = '<i class="fas fa-ban"></i>';
      targetCard.appendChild(cardOverlay);
    }
  } else {
    alert(`Updating wallpaper '${wallpaperInfo.id}' (with index ${currentImageIndex}) failed!`);
  }
}

async function updateWallpaperStatusRequest(wallpaperInfo) {
  try {
    const provider = document.getElementById('providerSelect').value;

    let targetId;
    if (wallpaperInfo.tracking_type==='collection' || wallpaperInfo.tracking_type==='work') targetId = wallpaperInfo.author_id;
    if (wallpaperInfo.tracking_type==='model') targetId = wallpaperInfo.model_id;

    const body = JSON.stringify({
      id: wallpaperInfo.id,
      collection_id: wallpaperInfo.folder_no,
      track_collection: { 
        id: wallpaperInfo.tracking_collection_id,
        targetId,
        provider, 
        type: wallpaperInfo.tracking_type,
      }
    }, null, 2);
    console.log(`Remove wallpaper | Body of request:`, JSON.stringify(body,null,2));

    const response = await fetch(`${API_HOST_URL}/api/wallpapers/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const result = await response.json();
    if (result && result.status==='success') return true;
  }
  catch (error) {
    console.error('Error remove wallpaper sync:', error);
  }
  return false;
}

/* ****************************************************************** */
// Popup: Add single wallpaper into Album
/* ****************************************************************** */

async function addToAlbum(albumId, wallpapers) {
  try {
    const body = JSON.stringify({ albumId, wallpapers });
    const response = await fetch(`${API_HOST_URL}/api/albums/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const data = await response.json();
    return { success: !data.error, message: data.message };
  } catch (error) {
    console.error('Error adding wallpaper to album:', error);
    return { success: false, message: 'Error server' };
  }
}

// Handler for adding a single wallpaper to selected album (checkbox)
async function handleAddSingleToAlbum(wallpaperInfo) {

  document.querySelector('#acceptAlbumBtn').innerHTML = 'Waiting...';
  
  const albumChecked = document.querySelector('#albumList input[name="album"]:checked');
  
  if (albumChecked) {

    const selectedAlbumId = albumChecked.value;

    console.log(`*** Adding a single wallpaper '${wallpaperInfo.id}' to album: ${selectedAlbumId}`);

    const result = await addToAlbum(selectedAlbumId, [wallpaperInfo]);

    if (result.success) {
      
      console.log(`*** Wallpaper '${wallpaperInfo.id}' added to album ${selectedAlbumId} successfully!`);

      alert(`Wallpaper added to album completed (${result.message})`);

      // Reset danh sách hình ảnh...
      await updateSelectedAlbumImages();

      // Hidden Accept button...
      document.querySelector('#acceptAlbumBtn').style.display = 'none';

      // Hidden this wallpaper (Update wallpaper status)
      await updateWallpaperStatus(currentImageIndex, wallpaperInfo, isOpenPreviewPopup, 'add-album');
    }
    else {
      alert(result.message);
    }
  }
  else {
    alert('Please select at least one album!');
  }
}

/* ****************************************************************** */
// Popup: Album Management 
/* ****************************************************************** */

async function fetchAlbums() {
  try {
    const response = await fetch(`${API_HOST_URL}/api/albums`);
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error getting album list:', error);
    return [];
  }
}

async function fetchAlbumImages(albumId, getFull) {
  try {
    const response = await fetch(`${API_HOST_URL}/api/albums/${albumId}/images${(getFull)?'?full=1':''}`);
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Error while getting image for album ${albumId}:`, error);
  }
}

async function updateSelectedAlbumImages() {
  try {
    const selectedAlbumId = document.querySelector('#albumList input[name="album"]:checked').value;
    const selectedAlbumImages = document.getElementById('selectedAlbumImages');

    console.log('Get images of this album:', selectedAlbumId);

    selectedAlbumImages.innerHTML = '';

    if (!selectedAlbumId) {
      console.log('Get NULL images of this album:', selectedAlbumId);
      selectedAlbumImages.innerHTML = '<p class="no-images">No album selected yet!</p>';
      return;
    }

    const images = await fetchAlbumImages(selectedAlbumId,undefined);
    if (images.length > 0) {
      images.forEach(image => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'album-image';
        imageDiv.innerHTML = `<img src="${image}" alt="Album Image">`;
        selectedAlbumImages.appendChild(imageDiv);
      });
    } else {
      selectedAlbumImages.innerHTML = '<p class="no-images">There are no pictures in the album!</p>';
    }
  } catch (error) {}
}

function hideAlbumMenu() {
  const albumPopupOverlay = document.getElementById('albumPopupOverlay');
  albumPopupOverlay.classList.add('menu-hidden');
  // Remove images of album
  document.getElementById('selectedAlbumImages').innerHTML = '';
}

async function showAlbumMenu(index, wallpaperData, isPopup) {

  // Update current idx of this wallpaper
  currentImageIndex = index; // Only use for handling: update wallpaper status (add to album)

  // IMPORTANT: Update current Wallpaper data
  if (!currentWallpaperInfo || !isPopup) {
    currentWallpaperInfo = JSON.parse(wallpaperData);
  }

  console.log(`*** [${currentWallpaperInfo.id}] has ready for adding to album...`);
  
  const albumPopupOverlay = document.getElementById('albumPopupOverlay');
  const albumList = document.getElementById('albumList');

  const createAlbumBtn = document.getElementById('createAlbumBtn');
  const createAlbumForm = document.getElementById('createAlbumForm');
  const newAlbumName = document.getElementById('newAlbumName');
  const submitAlbumBtn = document.getElementById('submitAlbumBtn');
  const cancelCreateBtn = document.getElementById('cancelCreateBtn');

  /******************************************************************
   * Listener for Album Menu 
   */ 
  
  // Hàm làm mới danh sách album
  async function refreshAlbumList() {

    const albums = await fetchAlbums();
    console.log(`Load ${albums.length} albums successfully!`);

    albumList.innerHTML = albums.length > 0 ? albums.map(album => `
      <label class="album-checkbox">
        <input type="checkbox" name="album" value="${album.id}">
        <span>${album.name}</span>
      </label>
    `).join('') : '<p>Not found albums anymore!</p>';

    // Gắn lại sự kiện change cho checkbox
    document.querySelectorAll('#albumList input[name="album"]').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          document.querySelectorAll('#albumList input[name="album"]').forEach(otherCheckbox => {
            if (otherCheckbox !== this) {
              otherCheckbox.checked = false;
            }
          });
          updateSelectedAlbumImages();
        } else {
          updateSelectedAlbumImages();
        }
      });
    });
    // Reset danh sách hình ảnh...
    updateSelectedAlbumImages();
  }
  // Làm mới danh sách album lần đầu...
  await refreshAlbumList();

  // Hiển thị popup
  albumPopupOverlay.classList.remove('menu-hidden');

  /******************************************************************
   * Listener for Create New Album in Album Menu 
   */ 

  async function createAlbum(name) {
    try {
      const response = await fetch(`${API_HOST_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumName: name, wallpaperIds: [] })
      });
      if (!response.ok) throw new Error('Failed to create album!');
      return response.json();
    } catch (error) {
      throw error;
    }
  }

  // Xóa listener cũ trước khi thêm mới (nếu có)
  const newSubmitHandler = async function(event) {

    const button = event.target;
    button.disabled = true; // Vô hiệu hóa nút để ngăn double-click

    const name = newAlbumName.value.trim();
    if (!name) {
      alert('Album name cannot be empty!');
      button.disabled = false;
      return;
    }

    try {
      await createAlbum(name);
      alert('Album created successfully!');

      createAlbumForm.classList.add('create-album-hidden');
      newAlbumName.value = '';

      if (albumList.innerHTML === '<p>Not found albums!</p>') {
        albumList.innerHTML = '';
      }

      // Làm mới danh sách album sau khi thêm thành công
      await refreshAlbumList();

    } catch (error) {
      alert('Failed to create album!');
    }
    finally {
      button.disabled = false; // Kích hoạt lại nút sau khi hoàn thành
    }
  };

  // Xóa tất cả listener cũ của submitAlbumBtn
  submitAlbumBtn.replaceWith(submitAlbumBtn.cloneNode(true)); // Clone để xóa listener
  const newSubmitAlbumBtn = document.getElementById('submitAlbumBtn'); // Lấy nút mới
  newSubmitAlbumBtn.addEventListener('click', newSubmitHandler);

  // Listener cho nút Create Album
  createAlbumBtn.addEventListener('click', () => {
    createAlbumForm.classList.remove('create-album-hidden');
    newAlbumName.focus();
  });

  // Listener cho nút Cancel
  cancelCreateBtn.addEventListener('click', () => {
    createAlbumForm.classList.add('create-album-hidden');
    newAlbumName.value = '';
  });

  // Show Accept button (if hidden)...
  document.querySelector('#acceptAlbumBtn').style.display = 'block';
  document.querySelector('#acceptAlbumBtn').innerHTML = 'Accept';
}

/* ****************************************************************** */ 
// Popup: Review wallpapers
/* ****************************************************************** */ 

// Infinite scroll handler
function handleScroll() {
  // Check if user has scrolled to the bottom
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && !isLoading && currentPage < totalPages) {
    renderWallpapers(currentPage + 1);
  }
}

function showPreviewPopup(index, inputWallpaperDataId) {

  // Save index of this wallpaper has selected...
  currentImageIndex = index;

  // Update variable
  isOpenPreviewPopup = true;

  console.log(`*** Current index of this wallpaper: ${currentImageIndex}`);
  
  const popupOverlay = document.getElementById('popupOverlay');
  const popupImage = document.getElementById('popupImage');
  const viewPopup = document.getElementById('view-popup');

  // Create buttons...
  viewPopup.insertAdjacentHTML('beforeend',`
    <div class="popup-buttons">
      <button class="popup-button add-album" title="Add to Album" onclick="showAlbumMenu(${index}, document.getElementById('${inputWallpaperDataId}').value, true);">
        <i class="fas fa-plus"></i>
      </button>
      <button class="popup-button download" title="Download" onclick="downloadWallpaper()">
        <i class="fas fa-download"></i>
      </button>
      <button class="popup-button remove" title="Remove" onclick="updateWallpaperStatus(${index}, document.getElementById('${inputWallpaperDataId}').value, true, 'remove');">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `);
  const popupButtons = document.querySelector('.popup-buttons');

  // Xóa timeout trước đó nếu có
  if (buttonTimeout) clearTimeout(buttonTimeout);

  // Xóa remove-overlay cũ
  const existingOverlay = viewPopup.querySelector('.remove-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Kiểm tra các status
  const wallpaper = allWallpapers[index];
  const isRemoved = wallpaper.isRemoved;
  const addedToAlbum = wallpaper.addedAlbum;

  // Thêm remove-overlay nếu đã xóa
  if (isRemoved || addedToAlbum) {
    const removeOverlay = document.createElement('div');
    removeOverlay.className = 'remove-overlay active';
    removeOverlay.innerHTML = `<span>Wallpaper has been ${(isRemoved)?'removed':'added to album'}!</span>`;
    viewPopup.appendChild(removeOverlay);
  }

  // Ẩn nút ngay lập tức
  popupButtons.classList.add('hidden');
  // Cập nhật ảnh
  popupImage.className = 'active';
  popupImage.src = allWallpapers[index].image_url;
  // Hiển thị popup
  popupOverlay.classList.remove('hidden');
  // Hiển thị nút sau 2 giây
  buttonTimeout = setTimeout(() => {
    popupButtons.classList.remove('hidden');
  }, 1000);
}

function hidePreviewPopup() {
  const popupOverlay = document.getElementById('popupOverlay');
  const popupButtons = document.querySelector('.popup-buttons');
  // Xóa timeout nếu có
  if (buttonTimeout) clearTimeout(buttonTimeout);
  // Ẩn nút ngay lập tức
  popupButtons.classList.add('hidden');
  popupOverlay.classList.add('hidden');
  // Update variable
  isOpenPreviewPopup = false;
}

function showNextImage() {

  if (currentImageIndex < allWallpapers.length-1) {

    const popupImage = document.getElementById('popupImage');
    const viewPopup = document.getElementById('view-popup');
    const popupButtons = document.querySelector('.popup-buttons');
    
    // Xóa timeout trước đó nếu có
    if (buttonTimeout) clearTimeout(buttonTimeout);
    
    // Ẩn nút ngay lập tức
    popupButtons.classList.add('hidden');
    
    // Xóa remove-overlay cũ
    const existingOverlay = viewPopup.querySelector('.remove-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Kiểm tra các status
    const wallpaper = allWallpapers[currentImageIndex+1];
    const isRemoved = wallpaper.isRemoved;
    const addedToAlbum = wallpaper.addedAlbum;
    
    // Tạo ảnh mới
    const newImage = document.createElement('img');
    newImage.src = allWallpapers[currentImageIndex+1].image_url;
    newImage.className = 'slide-right'; // Bắt đầu từ bên phải
    newImage.alt = 'Wallpaper';
    
    // Thêm ảnh mới vào popup
    viewPopup.appendChild(newImage);
    
    // Di chuyển ảnh hiện tại sang trái
    popupImage.className = 'slide-left';
    
    // Thêm remove-overlay nếu đã xóa
    if (isRemoved || addedToAlbum) {
      const removeOverlay = document.createElement('div');
      removeOverlay.className = 'remove-overlay active';
      removeOverlay.innerHTML = `<span>Wallpaper has been ${(isRemoved)?'removed':'added to album'}!</span>`;
      viewPopup.appendChild(removeOverlay);
    }
    
    setTimeout(() => {
      // Xóa ảnh hiện tại và đặt ảnh mới làm chính
      popupImage.remove();
      newImage.id = 'popupImage';
      newImage.className = 'active'; // Di chuyển vào trung tâm
      currentImageIndex++;

      console.log(`*** Current index of this wallpaper: ${currentImageIndex}`);

      // Update current WallpaperInfo with current index...
      currentWallpaperInfo = allWallpapers[currentImageIndex];
      console.log(`*** Current WallpaperInfo of this wallpaper: ${JSON.stringify(currentWallpaperInfo,null,2)}`);
      
      // Hiển thị nút sau 1 giây
      buttonTimeout = setTimeout(() => {
        popupButtons.classList.remove('hidden');
      }, 1000);

    }, 250);
  }
}

function showPrevImage() {

  if (currentImageIndex > 0) {

    const popupImage = document.getElementById('popupImage');
    const viewPopup = document.getElementById('view-popup');
    const popupButtons = document.querySelector('.popup-buttons');
    
    // Xóa timeout trước đó nếu có
    if (buttonTimeout) clearTimeout(buttonTimeout);
    
    // Ẩn nút ngay lập tức
    popupButtons.classList.add('hidden');
    
    // Xóa remove-overlay cũ
    const existingOverlay = viewPopup.querySelector('.remove-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Kiểm tra các status
    const wallpaper = allWallpapers[currentImageIndex - 1];
    const isRemoved = wallpaper.isRemoved;
    const addedToAlbum = wallpaper.addedAlbum;
    
    // Tạo ảnh mới
    const newImage = document.createElement('img');
    newImage.src = allWallpapers[currentImageIndex - 1].image_url;
    newImage.className = 'slide-left'; // Bắt đầu từ bên trái
    newImage.alt = 'Wallpaper';
    
    // Thêm ảnh mới vào popup
    viewPopup.appendChild(newImage);
    
    // Di chuyển ảnh hiện tại sang phải
    popupImage.className = 'slide-right';
    
    // Thêm remove-overlay nếu đã xóa
    if (isRemoved || addedToAlbum) {
      const removeOverlay = document.createElement('div');
      removeOverlay.className = 'remove-overlay active';
      removeOverlay.innerHTML = `<span>Wallpaper has been ${(isRemoved)?'removed':'added to album'}!</span>`;
      viewPopup.appendChild(removeOverlay);
    }
    
    setTimeout(() => {
      // Xóa ảnh hiện tại và đặt ảnh mới làm chính
      popupImage.remove();
      newImage.id = 'popupImage';
      newImage.className = 'active'; // Di chuyển vào trung tâm
      currentImageIndex--;

      console.log(`*** Current index of this wallpaper: ${currentImageIndex}`);

      // Update current WallpaperInfo with current index...
      currentWallpaperInfo = allWallpapers[currentImageIndex];
      console.log(`*** Current WallpaperInfo of this wallpaper: ${JSON.stringify(currentWallpaperInfo,null,2)}`);
      
      // Hiển thị nút sau 1 giây
      buttonTimeout = setTimeout(() => {
        popupButtons.classList.remove('hidden');
      }, 1000);

    }, 250);
  }
}

/* ****************************************************************** */
// Header: Filters
/* ****************************************************************** */ 

// Function to populate a select element
function populateSelect(selectId, items, defaultOptionText) {
  const select = document.getElementById(selectId);
  if (!select) return;
  // Clear existing options
  select.innerHTML = '';
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = 'All';
  defaultOption.textContent = defaultOptionText;
  select.appendChild(defaultOption);
  // Add options from API data
  if (items) items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = (typeof item === "string" && item.includes('User_')) ? item.replace('User_','') : item;
    select.appendChild(option);
  });
}

async function fetchPopulateData() {
  try {
    const response = await fetch(`${API_HOST_URL}/api/wallpapers/populate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch populate data from API');
    }
    const data = await response.json();
    console.log('Fetching populate data from API success');
    return data.data;
  } catch (error) {
    console.error('Error fetching populate data from API:', error);
    return null;
  }
}

async function fetchNewData() {
  try {
    const response = await fetch(`${API_HOST_URL}/api/track-collections/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch new wallpapers from API');
    }
    const data = await response.json();
    console.log('Fetching new wallpapers from API success');
    return data.data;
  } catch (error) {
    console.error('Error fetching new wallpapers from API:', error);
    return null;
  }
}

/* ****************************************************************** */
// Main content: List all wallpapers
/* ****************************************************************** */ 

async function fetchWallpapers(pageNum) {
  try {
    const provider = document.getElementById('providerSelect').value;
    const topic = document.getElementById('topicSelect').value;
    const style = document.getElementById('styleSelect').value;
    const type = document.getElementById('typeSelect').value;
    const track_id = document.getElementById('trackSelect').value;
    const size = document.getElementById('sizeSelect').value;
    
    let image_size;
    if (size==='All') {
      image_size = { width: 500, height: 500 };
    } else {
      const [width, height] = size.split('x');
      image_size = { width: parseInt(width), height: parseInt(height) };
    }

    const filter = { provider, topic, style, type, track_id, image_size };

    console.log(`List wallpapers | Body of request:`, JSON.stringify(filter,null,2));

    const response = await fetch(`${API_HOST_URL}/api/wallpapers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page: pageNum,
        page_size: 100,
        filter
      }, null, 2)
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const result = await response.json();
    if (result) return { data: result.data, pagination: result.pagination };
  }
  catch (error) {
    console.error('Error fetching profiles:', error);
    alert(`Error fetching profiles: ${error}`);
  }
};

async function renderWallpapers(pageNum = 1) {

  if (isLoading) return;

  isLoading = true;

  console.log(`Loading wallpapers with page: ${pageNum}`);
  
  const profilesGrid = document.getElementById('profilesGrid');

  if (pageNum === 1) {
    profilesGrid.innerHTML = '';
    allWallpapers = [];
  }

  const { data, pagination } = await fetchWallpapers(pageNum);

  if (data && data.length>0) {

    const wallpapersWithStatus = data.map(wallpaper => ({
      ...wallpaper,
      isRemoved: false,   // status remove
      addedAlbum: false,  // status added to album
    }));
    allWallpapers.push(...wallpapersWithStatus);

    console.log(`Loading wallpapers with page ${pageNum} has ${data.length} items`);
    
    for (const wallpaper of wallpapersWithStatus) {

      const profileCard = document.createElement('div');
      profileCard.className = 'profile-card';
      
      const inputId = `wallpaper-data-${wallpaper.id}`;
      const wallpaperJson = JSON.stringify(wallpaper).replace(/'/g, "\\'");

      const thisIdxSelection = allWallpapers.length - data.length + wallpapersWithStatus.indexOf(wallpaper);
  
      profileCard.innerHTML = `
        <img src="${wallpaper.image_url}" class="profile-thumb">
        <span class="wallpaper-icon select-icon">
          <input type="checkbox" class="select-checkbox" data-wallpaper-idx="${thisIdxSelection}" data-wallpaper-id="${wallpaper.id}">
        </span>
        <div class="overlay">
          <input type="hidden" id="${inputId}" value='${wallpaperJson}'>
          <button class="view" onclick="showPreviewPopup(${thisIdxSelection}, '${inputId}');">View</button>
          <button class="add-album" onclick="showAlbumMenu(${thisIdxSelection}, document.getElementById('${inputId}').value, false);">Add Album</button>
          <button class="remove" onclick="updateWallpaperStatus(${thisIdxSelection}, document.getElementById('${inputId}').value, false, 'remove');">Remove</button>
        </div>
      `;
      profilesGrid.appendChild(profileCard);
      
      // Update pagination info
      currentPage = pageNum;
      totalPages = pagination.total_pages || 1;
    }
  } else {
    console.log(`Loading wallpapers with page ${pageNum} has EMPTY items`);
  }
  isLoading = false;
};

// Initialize event listeners once on page load
async function initializeEventListeners() {

  const apiResponse = await fetchPopulateData();
  
  // Populate each select element with API data
  populateSelect('providerSelect',  (apiResponse) ? apiResponse.providers : null, 'All Provider');
  populateSelect('topicSelect',     (apiResponse) ? apiResponse.topics : null,    'All Topics');
  populateSelect('styleSelect',     (apiResponse) ? apiResponse.styles : null,    'All Styles');
  populateSelect('typeSelect',      (apiResponse) ? apiResponse.types : null,     'All Data Types');
  populateSelect('trackSelect',     (apiResponse) ? apiResponse.track_ids : null, 'All Track-collections');

  // Default filter values
  document.getElementById('providerSelect').value = 'xxx';
  
  document.getElementById('topicSelect').addEventListener('change', (e) => {
    renderWallpapers();
  });
  document.getElementById('styleSelect').addEventListener('change', (e) => {
    renderWallpapers();
  });
  document.getElementById('typeSelect').addEventListener('change', (e) => {
    renderWallpapers();
  });
  document.getElementById('trackSelect').addEventListener('change', (e) => {
    renderWallpapers();
  });
  document.getElementById('sizeSelect').addEventListener('change', (e) => {
    renderWallpapers();
  });
  
  // Load data on first access...
  renderWallpapers();
};

/* ****************************************************************** */ 
/* ****************************************************************** */ 
/* ****************************************************************** */ 

/*
 * [Preview popup] Thêm sự kiện click để đóng popup khi click bên ngoài
 */
document.getElementById('popupOverlay').addEventListener('click', function(event) {
  if (event.target === this) {
    hidePreviewPopup();
  }
});

/*
 * [Album Management popup] Thêm sự kiện click để đóng popup khi click bên ngoài
 */
document.getElementById('albumPopupOverlay').addEventListener('click', function(event) {
  if (event.target === this) {
    hideAlbumMenu();
  }
});

/*
 * [Preview popup] Next & Prev button click event handlers
 */ 
document.querySelector('.nav-button.prev').addEventListener('click', showPrevImage);
document.querySelector('.nav-button.next').addEventListener('click', showNextImage);

/* ****************************************************************** */ 

/*
 * [Album Management popup] Listener for Accecpt & Cancel buttons
 */
document.querySelector('#acceptAlbumBtn').addEventListener('click', function (event) {
  const button = event.target;
  button.disabled = true; // Disable the button
  if (currentWallpaperInfo) handleAddSingleToAlbum(currentWallpaperInfo);
  setTimeout(() => {
    button.disabled = false; // Re-enable after 300ms
  }, 300);
});
document.querySelector('#cancelAlbumBtn').addEventListener('click', function (event) {
  const button = event.target;
  button.disabled = true; // Disable the button
  hideAlbumMenu();
  setTimeout(() => {
    button.disabled = false; // Re-enable after 300ms
  }, 300);
});

/* ****************************************************************** */ 

// Add scroll event listener
window.addEventListener('scroll', handleScroll);

/*
 * [FETCH DATA] Fetch new data button click event handlers
 */
document.querySelector('#fetchTrackBtn').addEventListener('click', fetchNewData);

/* ****************************************************************** */ 

// Run initialization
initializeEventListeners();