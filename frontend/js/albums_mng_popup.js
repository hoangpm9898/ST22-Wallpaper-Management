// Show popup on trigger click
const viewAlbumsTrigger = document.getElementById('viewAlbumsTrigger');
const viewAlbumsPopup = document.getElementById('viewAlbumsPopupOverlay');

viewAlbumsTrigger.addEventListener('click', () => {
    viewAlbumsPopup.classList.toggle('show');
});

// Hide popup when clicking close
function hideViewPopup() {
    viewAlbumsPopup.classList.remove('show');
}

async function getAlbumAttributes(type) {
    try {
        const response = await fetch(`${API_HOST_URL}/api/album/${type}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to create album!');
        return response.json();
    } catch (error) {
        throw error;
    }
}

async function verifyAlbumRequest(albumId) {
    try {
        // Timeout mặc định 5 phút (300000ms)
        const timeoutMs = 300000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${API_HOST_URL}/api/album/verify?albumId=${albumId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal // Gắn signal để hủy request khi timeout
        });

        clearTimeout(timeoutId); // Xóa timeout nếu request hoàn thành trước

        if (!response.ok) throw new Error('Failed to verify album!');
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
}

/* *************************************************************** */ 
/* ********************* CATEGORIES SELECTION ******************** */ 
/* *************************************************************** */ 

// Fetch categories from API and populate the select element
async function fetchCategories() {
    const categories = await getAlbumAttributes('categories');
    const select = document.getElementById('detail-album-category');
    // Xóa các <option> động, giữ lại các <option> mặc định
    while (select.options.length > 2) { // Giữ lại 2 option mặc định
        select.remove(2); // Xóa từ index 2 trở đi
    }
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Set the category value (used for initial load or dynamic updates)
function setCategory(value) {

    console.log(`Set new category ID: ${value}`);

    const select = document.getElementById('detail-album-category');
    const customInput = document.getElementById('detail-album-category-custom');
    
    // Check if the value matches any option in the select
    const optionExists = Array.from(select.options).some(option => option.value === String(value));
    
    if (optionExists && value !== 'custom') {
        select.value = value; // Select the matching category
        select.style.display = 'block';
        customInput.style.display = 'none';
        customInput.value = value;
    } else {
        // Treat as custom value
        select.value = 'custom';
        select.style.display = 'none';
        customInput.style.display = 'block';
        customInput.value = value || ''; // Set custom input to the provided value
        customInput.focus();
    }
}

// Handle input and select interaction
function setupCategoryInput() {

    const select = document.getElementById('detail-album-category');
    const customInput = document.getElementById('detail-album-category-custom');

    select.addEventListener('change', () => {
        if (select.value === 'custom') {
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.focus();
            customInput.value = ''; // Clear input when shown
        } else {
            customInput.style.display = 'none';
            customInput.value = ''; // Clear custom input when a category is selected
        }
    });

    customInput.addEventListener('input', () => {
        if (customInput.value.trim() !== '') {
            select.value = 'custom'; // Keep select on "Enter a new category name" when custom input is used
        }
    });

    customInput.addEventListener('focusout', () => {
        if (customInput.value.trim() === '') {
            customInput.style.display = 'none';
            select.style.display = 'block';
            select.value = ''; // Revert to "Select a category" if input is empty
        }
    });
}

async function getCategoryValue() {

    // Get album categories
    const albumCategories = await getAlbumAttributes('categories');

    const select = document.getElementById('detail-album-category');
    const customInput = document.getElementById('detail-album-category-custom');

    let selectedValue;

    if (select.value === 'custom' && customInput.style.display !== 'none' && customInput.value.trim() !== '') {
        selectedValue = customInput.value.trim();
        console.log('Entered category name:', selectedValue);
        return selectedValue;
    } 
    else if (select.value !== '' && select.value !== 'custom') {
        selectedValue = select.value;
        console.log('Selected category ID:', selectedValue);
    } 
    else {
        selectedValue = '0';
        console.warn('No valid category selected or entered.');
    }
    return albumCategories.find(category => category.id === Number(selectedValue)).name;
}

/* *************************************************************** */ 
/* ********************* CREATE NEW ALBUM  *********************** */ 
/* *************************************************************** */ 

// Toggle create album form
const createAlbumBtn = document.getElementById('create-album-btn');
const createAlbumForm = document.getElementById('create-album-form');

createAlbumBtn.addEventListener('click', () => {
    createAlbumForm.classList.toggle('show');
});

// Handle form buttons
let isSubmitting = false; // Prevent double submission
const submitAlbumBtn = document.getElementById('submit-album-btn');
const cancelAlbumBtn = document.getElementById('cancel-album-btn');

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

/**
 * Button create new album
 */
submitAlbumBtn.addEventListener('click', async () => {
    if (isSubmitting) return; // Prevent double click
    isSubmitting = true;
    submitAlbumBtn.disabled = true; // Disable button during request
    try {
        const albumName = document.getElementById('new-album-name').value.trim();
        if (albumName) {
            // Call API to create album
            await createAlbum(albumName);
            alert('Album created successfully!');
            // Get album cayegories
            const albumCategories = await getAlbumAttributes('categories');
            // Refresh album list
            const albums = await fetchAlbums();
            const albumList = document.getElementById('album-list');
            albumList.innerHTML = ''; // Clear existing items
            albums.forEach(album => {
                const li = document.createElement('li');
                li.className = 'album-item';
                li.title = album.name;
                if (album.mapStatus) {
                    li.innerHTML = `<p class="text-content">${album.name}</p><span>OK</span>`;
                } else {
                    li.textContent = album.name;
                }
                li.dataset.albumId = album.id;
                li.dataset.albumName = album.name;
                li.dataset.albumCategory = (albumCategories && albumCategories.length>0) ? albumCategories.find(category => category.id === album.categoryId).name : '';
                li.dataset.albumCategoryId = album.categoryId;
                li.dataset.albumTags = (album.tags && album.tags.length>0) ? album.tags.join(', ') : '';
                li.dataset.albumCountries = (album.countries && album.countries.length>0) ? album.countries.join(', ') : '';
                li.dataset.thumbId = album.thumb;
                li.dataset.nsfw = JSON.stringify(album.nsfw);
                li.dataset.albumTotalWallpapers = album.wallpaperIds.length;
                li.dataset.mapStatus = album.mapStatus;
                albumList.appendChild(li);
            });
            // Reset form
            createAlbumForm.classList.remove('show');
            document.getElementById('new-album-name').value = '';
        }
    } catch (error) {
        console.error('Error creating album:', error);
        alert('Failed to create album: ' + error.message); // User feedback
    } finally {
        isSubmitting = false;
        submitAlbumBtn.disabled = false; // Re-enable button
    }
});

/**
 * Button cancel to create new album
 */
cancelAlbumBtn.addEventListener('click', () => {
    createAlbumForm.classList.remove('show');
    document.getElementById('new-album-name').value = '';
});

/**
 * Get albums info: albums, wallpapers, categories, tags
 */
async function getAllAlbumsInfo() {
    try {
        const response = await fetch(`${API_HOST_URL}/api/album/info`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to get albums info!');
        const data = await response.json();
        document.getElementById('view-albums-title').innerHTML = `<span id="albums-info-count">${data.albums}</span> Albums | <span id="albums-info-count">${data.wallpapers}</span> Wallpapers | <span id="albums-info-count">${data.categories}</span> Categories | <span id="albums-info-count">${data.tags}</span> Tags`;
    } catch (error) {
        throw error;
    }
}

/* *************************************************************** */ 
/* *********************** ALBUM SELECTION *********************** */ 
/* *************************************************************** */ 

async function deleteAlbum(albumId) {
    try {
        const response = await fetch(`${API_HOST_URL}/api/albums/${albumId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to delete album!');
        return response.json();
    } catch (error) {
        throw error;
    }
}

/**
 * Handle delete album
 */
const deleteAlbumBtn = document.getElementById('delete-album-btn');
deleteAlbumBtn.addEventListener('click', async () => {

    if (isSubmitting) return;
    isSubmitting = true;
    deleteAlbumBtn.disabled = true;
    try {
        const selectedAlbum = document.querySelector('.album-item.selected');
        if (!selectedAlbum) {
            throw new Error('No album selected!');
        }

        const confirmDelete = confirm('💀 Are you sure you want to delete this album?');
        if (!confirmDelete) return;

        const albumId = selectedAlbum.dataset.albumId;
        await deleteAlbum(albumId);

        // Get album cayegories
        const albumCategories = await getAlbumAttributes('categories');

        // Refresh album list
        const albums = await fetchAlbums();
        const albumList = document.getElementById('album-list');
        albumList.innerHTML = '';
        albums.forEach(album => {
            const li = document.createElement('li');
            li.className = 'album-item';
            li.title = album.name;
            if (album.mapStatus) {
                li.innerHTML = `<p class="text-content">${album.name}</p><span>OK</span>`;
            } else {
                li.textContent = album.name;
            }
            li.dataset.albumId = album.id;
            li.dataset.albumName = album.name;
            li.dataset.albumCategory = (albumCategories && albumCategories.length>0) ? albumCategories.find(category => category.id === album.categoryId).name : '';
            li.dataset.albumCategoryId = album.categoryId;
            li.dataset.albumTags = (album.tags && album.tags.length>0) ? album.tags.join(', ') : '';
            li.dataset.albumCountries = (album.countries && album.countries.length>0) ? album.countries.join(', ') : '';
            li.dataset.thumbId = album.thumb;
            li.dataset.nsfw = JSON.stringify(album.nsfw);
            li.dataset.albumTotalWallpapers = album.wallpaperIds.length;
            li.dataset.mapStatus = album.mapStatus;
            albumList.appendChild(li);
        });

        // Clear wallpapers grid
        const wallGrid = document.getElementById('wallpapers-grid');
        wallGrid.innerHTML = '';
        const noImages = document.createElement('p');
        noImages.textContent = '😑 No album selected!';
        noImages.style.color = 'darkgrey';
        noImages.style.textAlign = 'center';
        noImages.style.position = 'relative';
        noImages.style.left = '215px';
        noImages.style.top = '175px';
        noImages.style.width = '164px';
        wallGrid.appendChild(noImages);

        // Get info...
        await getAllAlbumsInfo();

    } catch (error) {
        console.error('Error deleting album:', error);
        alert('Failed to delete album: ' + error.message);
    } finally {
        isSubmitting = false;
        deleteAlbumBtn.disabled = false;
    }
});

// Load albums when popup opens
viewAlbumsTrigger.addEventListener('click', async () => {
    // Get info...
    await getAllAlbumsInfo();
    // Get album categories
    const albumCategories = await getAlbumAttributes('categories');
    // Get albums
    const albums = await fetchAlbums();
    const albumList = document.getElementById('album-list');
    albumList.innerHTML = ''; // Clear existing items
    albums.forEach(album => {
        const li = document.createElement('li');
        li.className = 'album-item';
        li.title = album.name;
        if (album.mapStatus) {
            li.innerHTML = `<p class="text-content">${album.name}</p><span>OK</span>`;
        } else {
            li.textContent = album.name;
        }
        li.dataset.albumId = album.id;
        li.dataset.albumName = album.name;
        li.dataset.albumCategory = (albumCategories && albumCategories.length>0) ? albumCategories.find(category => category.id === album.categoryId).name : '';
        li.dataset.albumCategoryId = album.categoryId;
        li.dataset.albumTags = (album.tags && album.tags.length>0) ? album.tags.join(', ') : '';
        li.dataset.albumCountries = (album.countries && album.countries.length>0) ? album.countries.join(', ') : '';
        li.dataset.thumbId = album.thumb;
        li.dataset.nsfw = JSON.stringify(album.nsfw);
        li.dataset.albumTotalWallpapers = album.wallpaperIds.length;
        li.dataset.mapStatus = album.mapStatus;
        albumList.appendChild(li);
    });
    // Initialize ctegories checklist
    fetchCategories();
    setupCategoryInput();
});

async function updateAlbumDetail(albumId, albumDataUpdating, wallpapers) {
    try {
        // Request...
        const body = JSON.stringify({ albumId, albumData: albumDataUpdating, wallpapers });
        const response = await fetch(`${API_HOST_URL}/api/albums/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
        });
        const data = await response.json();
        return { success: !data.error, message: data.message };
    } catch (error) {
        console.error('Error removing wallpapers to album:', error);
        return { success: false, message: 'Error server' };
    }
}

// Handle album selection
document.getElementById('album-list').addEventListener('click', async (e) => {

    // Update details (assuming existing detail elements)
    // document.getElementById('detail-wallpaper-id').textContent = 'Select a wallpaper';
    document.getElementById('detail-album-id').textContent = '-';
    document.getElementById('detail-album-name').value = '';
    // document.getElementById('detail-album-category').value = '';
    document.getElementById('detail-album-tags').value = '';
    document.getElementById('detail-album-countries').value = '';
    document.getElementById('detail-album-total-wallpapers').textContent = '-';
    // document.getElementById('detail-collection-id').textContent = '-';
    // document.getElementById('detail-track-collecction-id').textContent = '-';
    // document.getElementById('detail-quality-url').textContent = '-';

    const albumItem = e.target.closest('.album-item');
    if (albumItem) {

        // Remove highlight from other items
        document.querySelectorAll('.album-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Highlight clicked item
        albumItem.classList.add('selected');
        albumItem.offsetHeight; // Trigger reflow
        
        const albumId = albumItem.dataset.albumId;
        const albumName = albumItem.dataset.albumName;
        const albumCategory = albumItem.dataset.albumCategory;
        const albumCategoryId = albumItem.dataset.albumCategoryId;
        const albumTags = albumItem.dataset.albumTags;
        const albumCountries = albumItem.dataset.albumCountries;
        const totalWallpapers = albumItem.dataset.albumTotalWallpapers;

        const thumbId = albumItem.dataset.thumbId;
        const nsfwStatus = JSON.parse(albumItem.dataset.nsfw);

        document.getElementById('detail-album-id').textContent = albumId;
        document.getElementById('detail-album-name').value = albumName || '';
        setCategory(String(albumCategoryId)); // document.getElementById('detail-album-category').value = albumCategory || '';
        document.getElementById('detail-album-tags').value = albumTags || '';
        document.getElementById('detail-album-countries').value = albumCountries || '';
        document.getElementById('detail-album-total-wallpapers').textContent = totalWallpapers || '-';

        // Fetch and display images in #wallpapers-grid
        const data = await fetchAlbumImages(albumId,'getFull');

        const wallGrid = document.getElementById('wallpapers-grid');
        wallGrid.innerHTML = ''; // Clear existing images

        // Add hidden input for deleted wallpaper IDs
        const deleteInput = document.createElement('input');
        deleteInput.type = 'hidden';
        deleteInput.id = 'deleted-wallpaper-ids';
        deleteInput.value = JSON.stringify([]); // Initialize empty array
        wallGrid.appendChild(deleteInput);

        // Add hidden input for thumb selected wallpaper IDs
        const thumbInput = document.createElement('input');
        thumbInput.type = 'hidden';
        thumbInput.id = 'selected-thumb-id';
        thumbInput.value = (thumbId && typeof thumbId === 'string' && thumbId!=='undefined') ? thumbId : '';
        wallGrid.appendChild(thumbInput);
        
        if (data && data.length > 0) {

            data.forEach(wallpaper => {

                const wrapper = document.createElement('div');
                wrapper.className = 'wallpaper-wrapper';

                const img = document.createElement('img');
                img.className = 'wallpaper-thumb';
                img.src = wallpaper.preview_url || 'https://via.placeholder.com/100?text=No+Image';
                img.dataset.wallpaperId = wallpaper.id;
                img.dataset.wallpaperUrl = wallpaper.url;
                img.dataset.albumId = wallpaper.albumId;
                img.dataset.author_id = wallpaper.author_id;
                img.dataset.tracking_collection_id = wallpaper.tracking_collection_id;
                wrapper.appendChild(img);

                // Add overlay and icons
                const overlay = document.createElement('div');
                overlay.className = 'wallpaper-overlay';
                
                const viewIcon = document.createElement('span');
                viewIcon.className = 'wallpaper-icon view-icon';
                viewIcon.innerHTML = '🔍'; // View icon (emoji as placeholder)
                overlay.appendChild(viewIcon);

                const removeIcon = document.createElement('span');
                removeIcon.className = 'wallpaper-icon remove-icon';
                removeIcon.innerHTML = '🗑️'; // Remove icon (emoji as placeholder)
                overlay.appendChild(removeIcon);

                wrapper.appendChild(overlay);
                
                const thumbIcon = document.createElement('span');
                thumbIcon.className = 'wallpaper-icon thumb-icon';
                thumbIcon.innerHTML = '⭐';
                overlay.appendChild(thumbIcon);

                // Add thumb flag for this wallpaper
                if (thumbId && wallpaper.id === thumbId) {
                    const thumbIndicator = document.createElement('span');
                    thumbIndicator.className = 'thumb-indicator';
                    thumbIndicator.textContent = 'THUMB';
                    wrapper.appendChild(thumbIndicator);
                }

                // NSFW labels
                if ((nsfwStatus.adult && nsfwStatus.adult.length > 0) || (nsfwStatus.racy && nsfwStatus.racy.length > 0)) {
                  
                    const topRightDiv = document.createElement('div');
                    topRightDiv.className = 'top-right-div';

                    // Adult
                    if (nsfwStatus.adult && nsfwStatus.adult.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'adult-indicator';
                        statusIndicator.textContent = 'ADULT';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    // Racy
                    if (nsfwStatus.racy && nsfwStatus.racy.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'racy-indicator';
                        statusIndicator.textContent = 'RACY';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    wrapper.appendChild(topRightDiv);
                }
                wallGrid.appendChild(wrapper);
            });
        } else {
            const noImages = document.createElement('p');
            noImages.textContent = '😒 No images in this album!';
            noImages.style.color = 'darkgrey';
            noImages.style.textAlign = 'center';
            noImages.style.position = 'relative';
            noImages.style.left = '215px';
            noImages.style.top = '175px';
            noImages.style.width = '203px';
            wallGrid.appendChild(noImages);
        }

        // Handle remove icon click
        wallGrid.querySelectorAll('.remove-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering view
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                // Add to deleted IDs
                const deleteInput = document.getElementById('deleted-wallpaper-ids');
                let deletedIds = JSON.parse(deleteInput.value);
                if (!deletedIds.includes(wallpaperId)) {
                    deletedIds.push(wallpaperId);
                    deleteInput.value = JSON.stringify(deletedIds);
                    wrapper.classList.add('deleted'); // Add visual feedback
                }
            });
        });
        // Handle view icon click
        wallGrid.querySelectorAll('.view-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
                    thumb.classList.remove('selected');
                });
                img.classList.add('selected');
                // Update details (assuming existing detail elements)
                // document.getElementById('detail-wallpaper-id').textContent = img.dataset.wallpaperId;
                document.getElementById('detail-album-id').textContent = img.dataset.albumId;
                document.getElementById('detail-album-name').value = albumName || '';
                setCategory(String(albumCategoryId)); // document.getElementById('detail-album-category').value = albumCategory || '';
                document.getElementById('detail-album-tags').value = albumTags || '';
                document.getElementById('detail-album-countries').value = albumCountries || '';
                document.getElementById('detail-album-total-wallpapers').textContent = totalWallpapers || '-';
                // document.getElementById('detail-collection-id').textContent = img.dataset.author_id;
                // document.getElementById('detail-track-collecction-id').textContent = img.dataset.tracking_collection_id;
                if (img.dataset.wallpaperUrl) {
                    window.open(img.dataset.wallpaperUrl, '_blank');
                    // document.getElementById('detail-quality-url').textContent = 'Click here! ♥️';
                    // document.getElementById('detail-quality-url').href = img.dataset.wallpaperUrl;
                } else {
                    // document.getElementById('detail-quality-url').textContent = 'Not download yet! 😤';
                }
            });
        });
        // Handle thumb icon click
        wallGrid.querySelectorAll('.thumb-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                document.querySelectorAll('.thumb-indicator').forEach(indicator => {
                    indicator.remove();
                });
                const thumbIndicator = document.createElement('span');
                thumbIndicator.className = 'thumb-indicator';
                thumbIndicator.textContent = 'THUMB';
                wrapper.appendChild(thumbIndicator);
                const thumbInput = document.getElementById('selected-thumb-id');
                thumbInput.value = wallpaperId;
                albumItem.dataset.thumbId = wallpaperId;
                console.log('[SELECT_THUMB_MENU] Wallpaper ID:', wallpaperId);
            });
        });
    }
});

// Handle update album
const updateAlbumBtn = document.getElementById('update-album-btn');
updateAlbumBtn.addEventListener('click', async () => {

    if (isSubmitting) return;
    isSubmitting = true;
    updateAlbumBtn.disabled = true;

    try {
        const selectedAlbum = document.querySelector('.album-item.selected');
        if (!selectedAlbum) {
            throw new Error('Please select an album to update!');
        }
        const albumId = selectedAlbum.dataset.albumId;
        const albumName = selectedAlbum.dataset.albumName;
        const albumCategory = selectedAlbum.dataset.albumCategory;
        const albumTags = selectedAlbum.dataset.albumTags;
        const albumCountries = selectedAlbum.dataset.albumCountries;
        const totalWallpapers = selectedAlbum.dataset.albumTotalWallpapers;
        const mapStatus = selectedAlbum.dataset.mapStatus;
        
        const albumNameNew = document.getElementById('detail-album-name').value;
        const albumCategoryNew = await getCategoryValue(); // document.getElementById('detail-album-category').value
        const albumTagsNew = document.getElementById('detail-album-tags').value;
        const albumCountriesNew = document.getElementById('detail-album-countries').value;
        
        const thumbId = selectedAlbum.dataset.thumbId;
        const nsfwStatus = JSON.parse(selectedAlbum.dataset.nsfw);

        const thumbInput = document.getElementById('selected-thumb-id');
        const thumbIdNew = thumbInput.value;

        console.log('[VIEW_ALBUMS] Select album:', albumId);

        const deleteInput = document.getElementById('deleted-wallpaper-ids');
        
        const albumDataUpdating = {
          albumName: (albumNameNew && albumNameNew.trim()!=='' && albumNameNew!==albumName) ? albumNameNew.trim() : undefined,
          albumCategory: (albumCategoryNew && albumCategoryNew.trim()!=='' && albumCategoryNew!==albumCategory) ? albumCategoryNew.trim() : undefined,
          albumTags: (albumTagsNew && albumTagsNew.trim()!=='' && albumTagsNew!==albumTags) ? albumTagsNew.trim().split(/\s*,\s*/).filter(item => item) : [],
          albumCountries: (albumCountriesNew && albumCountriesNew.trim()!=='' && albumCountriesNew!==albumCountries) ? albumCountriesNew.trim().split(/\s*,\s*/).filter(item => item) : [],
          // Get new thumb
          thumbId: document.getElementById('selected-thumb-id').value
        };
        if (!deleteInput || deleteInput.value==='[]') {
            // if (albumNameNew && albumNameNew.trim()!=='' && albumNameNew!==albumName) {
            //     // Update request...
            //     const result = await updateAlbumDetail(albumId, albumNameNew.trim(), undefined);
            //     if (!result.success) throw Error(result.message);
            //     alert(`Renamed '${albumNameNew.trim()}' for album [${albumId}] successfully!`);
            // } else if (!thumbIdNew || thumbIdNew!=='') {
            //     // Update request...
            //     const result = await updateAlbumDetail(albumId, undefined, undefined);
            //     if (!result.success) throw Error(result.message);
            //     alert(`Updating thumb '${thumbIdNew.trim()}' for album [${albumId}] successfully!`);
            // } else {
            //     throw new Error('No deleted wallpaper IDs found!');
            // }
            // Update request...
            const result = await updateAlbumDetail(albumId, albumDataUpdating, undefined);
            if (!result.success) throw Error(result.message);
            alert(`Updating album [${albumId}] successfully!`);
        } else {
            const deletedIds = JSON.parse(deleteInput.value);
            console.log(`[VIEW_ALBUMS] In album [${albumId}], remove images: ${deletedIds}`);
            // Update request...
            const result = await updateAlbumDetail(albumId, albumDataUpdating, deletedIds);
            if (!result.success) throw Error(result.message);
            alert(`Removed ${deletedIds.length} images of album [${albumId}] successfully!`);
        }
        // Update name dataset...
        if (mapStatus==='true') {
            selectedAlbum.innerHTML = `<p class="text-content">${albumNameNew}</p><span>OK</span>`;
        } else {
            selectedAlbum.textContent = albumNameNew;
        }
        selectedAlbum.dataset.albumName = albumNameNew;
        // Update tags dataset...
        selectedAlbum.dataset.albumTags = albumTagsNew;
        // Update countries dataset...
        selectedAlbum.dataset.albumCountries = albumCountriesNew;
        // Update category dataset...
        selectedAlbum.dataset.albumCategory = albumCategoryNew;
        const albumCategories = await getAlbumAttributes('categories'); // Get new categories of album
        selectedAlbum.dataset.albumCategoryId = albumCategories.find((ctg) => ctg.name===albumCategoryNew).id;
        // Initialize ctegories checklist
        fetchCategories();
        setCategory(selectedAlbum.dataset.albumCategoryId);

        // Refresh images
        const wallGrid = document.getElementById('wallpapers-grid');
        wallGrid.innerHTML = '';
        // 
        deleteInput.value = JSON.stringify([]);
        wallGrid.appendChild(deleteInput);
        //
        thumbInput.value = (!thumbIdNew || thumbIdNew!=='') ? thumbIdNew : '';
        wallGrid.appendChild(thumbInput);

        const newData = await fetchAlbumImages(albumId, 'getFull');

        // Status of event change new thumb (for each click button "Update Album")
        let hasChangeThumb = false;

        if (newData && newData.length > 0) {
            newData.forEach(wallpaper => {

                const wrapper = document.createElement('div');
                wrapper.className = 'wallpaper-wrapper';

                const img = document.createElement('img');
                img.className = 'wallpaper-thumb';
                img.src = wallpaper.preview_url || 'https://via.placeholder.com/100?text=No+Image';
                img.dataset.wallpaperId = wallpaper.id;
                img.dataset.wallpaperUrl = wallpaper.url;
                wrapper.appendChild(img);

                const overlay = document.createElement('div');
                overlay.className = 'wallpaper-overlay';

                const viewIcon = document.createElement('span');
                viewIcon.className = 'wallpaper-icon view-icon';
                viewIcon.innerHTML = '🔍';
                overlay.appendChild(viewIcon);

                const removeIcon = document.createElement('span');
                removeIcon.className = 'wallpaper-icon remove-icon';
                removeIcon.innerHTML = '🗑️';
                overlay.appendChild(removeIcon);

                wrapper.appendChild(overlay);
                
                const thumbIcon = document.createElement('span');
                thumbIcon.className = 'wallpaper-icon thumb-icon';
                thumbIcon.innerHTML = '⭐';
                overlay.appendChild(thumbIcon);

                // Add thumb flag for this wallpaper
                if ((!thumbIdNew || thumbIdNew!=='') && wallpaper.id === thumbIdNew) {
                    const thumbIndicator = document.createElement('span');
                    thumbIndicator.className = 'thumb-indicator';
                    thumbIndicator.textContent = 'THUMB';
                    wrapper.appendChild(thumbIndicator);
                    // Update status
                    hasChangeThumb = true; // For only single wallpaper is thumb!!!
                }
                else if (!hasChangeThumb && thumbId && wallpaper.id === thumbId) {
                    const thumbIndicator = document.createElement('span');
                    thumbIndicator.className = 'thumb-indicator';
                    thumbIndicator.textContent = 'THUMB';
                    wrapper.appendChild(thumbIndicator);
                }

                // NSFW labels
                if ((nsfwStatus.adult && nsfwStatus.adult.length > 0) || (nsfwStatus.racy && nsfwStatus.racy.length > 0)) {

                  console.log('NSFW active...');
                  
                    const topRightDiv = document.createElement('div');
                    topRightDiv.className = 'top-right-div';

                    // Adult
                    if (nsfwStatus.adult && nsfwStatus.adult.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'adult-indicator';
                        statusIndicator.textContent = 'ADULT';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    // Racy
                    if (nsfwStatus.racy && nsfwStatus.racy.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'racy-indicator';
                        statusIndicator.textContent = 'RACY';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    wrapper.appendChild(topRightDiv);
                }
                wallGrid.appendChild(wrapper);
            });
        } else {
            const noImages = document.createElement('p');
            noImages.textContent = '😒 No images in this album!';
            noImages.style.color = 'darkgrey';
            noImages.style.textAlign = 'center';
            noImages.style.position = 'relative';
            noImages.style.left = '215px';
            noImages.style.top = '175px';
            noImages.style.width = '203px';
            wallGrid.appendChild(noImages);
        }

        // Re-attach event listeners
        wallGrid.querySelectorAll('.remove-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                let deletedIds = JSON.parse(deleteInput.value);
                if (!deletedIds.includes(wallpaperId)) {
                    deletedIds.push(wallpaperId);
                    deleteInput.value = JSON.stringify(deletedIds);
                    wrapper.classList.add('deleted');
                }
            });
        });
        wallGrid.querySelectorAll('.view-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
                    thumb.classList.remove('selected');
                });
                img.classList.add('selected');
                // document.getElementById('detail-wallpaper-id').textContent = img.dataset.wallpaperId;
                document.getElementById('detail-album-id').textContent = img.dataset.albumId;
                document.getElementById('detail-album-name').value = albumName || '';
                setCategory(selectedAlbum.dataset.albumCategoryId); // document.getElementById('detail-album-category').value = selectedAlbum.dataset.albumCategory || '';
                document.getElementById('detail-album-tags').value = selectedAlbum.dataset.albumTags || '';
                document.getElementById('detail-album-countries').value = selectedAlbum.dataset.albumCountries || '';
                document.getElementById('detail-album-total-wallpapers').textContent = totalWallpapers || '-';
                // document.getElementById('detail-collection-id').textContent = img.dataset.author_id;
                // document.getElementById('detail-track-collecction-id').textContent = img.dataset.tracking_collection_id;
                if (img.dataset.wallpaperUrl) {
                    window.open(img.dataset.wallpaperUrl, '_blank');
                    // document.getElementById('detail-quality-url').textContent = 'Click here! ♥️';
                    // document.getElementById('detail-quality-url').href = img.dataset.wallpaperUrl;
                } else {
                    // document.getElementById('detail-quality-url').textContent = 'Not download yet! 😤';
                }
            });
        });
        wallGrid.querySelectorAll('.thumb-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                document.querySelectorAll('.thumb-indicator').forEach(indicator => {
                    indicator.remove();
                });
                const thumbIndicator = document.createElement('span');
                thumbIndicator.className = 'thumb-indicator';
                thumbIndicator.textContent = 'THUMB';
                wrapper.appendChild(thumbIndicator);
                const thumbInput = document.getElementById('selected-thumb-id');
                thumbInput.value = wallpaperId;
                selectedAlbum.dataset.thumb = wallpaperId;
                console.log('[SELECT_THUMB_UPDATE] Wallpaper ID:', wallpaperId);
            });
        });
        // Reset details if no wallpaper selected
        // document.getElementById('detail-wallpaper-id').textContent = 'Select a wallpaper';

        // Get info...
        await getAllAlbumsInfo();

    } catch (error) {
        console.error('Error updating album:', error);
        alert(error.message);
    } finally {
        isSubmitting = false;
        updateAlbumBtn.disabled = false;
    }
});

// Handle verify album
const verifyAlbumBtn = document.getElementById('verify-album-btn');
verifyAlbumBtn.addEventListener('click', async () => {

    if (isSubmitting) return;
    isSubmitting = true;
    updateAlbumBtn.disabled = true;

    try {
        const selectedAlbum = document.querySelector('.album-item.selected');
        if (!selectedAlbum) {
            throw new Error('Please select an album to update!');
        }
        const albumId = selectedAlbum.dataset.albumId;

        document.getElementById('verify-album-btn').innerHTML = '<i class="fa-solid fa-spinner fa-spin loading-indicator"></i> Waiting...';

        // Verify...
        const verifyData = await verifyAlbumRequest(albumId);
        alert(verifyData.message);

        document.getElementById('verify-album-btn').innerHTML = '<i class="fa-solid fa-check-circle"></i> Verify NSFW Content';

        //------------------------------------------------------------------------/ 
        
        const albumName = selectedAlbum.dataset.albumName;
        const albumCategory = selectedAlbum.dataset.albumCategory;
        const albumCategoryId = selectedAlbum.dataset.albumCategoryId;
        const albumTags = selectedAlbum.dataset.albumTags;
        const albumCountries = selectedAlbum.dataset.albumCountries;
        const totalWallpapers = selectedAlbum.dataset.albumTotalWallpapers;

        const thumbId = selectedAlbum.dataset.thumbId;
        const nsfwStatus = verifyData.result || JSON.parse(selectedAlbum.dataset.nsfw);

        document.getElementById('detail-album-id').textContent = albumId;
        document.getElementById('detail-album-name').value = albumName || '';
        setCategory(albumCategoryId); // document.getElementById('detail-album-category').value = albumCategory || '';
        document.getElementById('detail-album-tags').value = albumTags || '';
        document.getElementById('detail-album-countries').value = albumCountries || '';
        document.getElementById('detail-album-total-wallpapers').textContent = totalWallpapers || '-';

        // Load all wallpapers of album...
        const data = await fetchAlbumImages(albumId,'getFull');

        const wallGrid = document.getElementById('wallpapers-grid');
        wallGrid.innerHTML = ''; // Clear existing images

        // Add hidden input for deleted wallpaper IDs
        const deleteInput = document.createElement('input');
        deleteInput.type = 'hidden';
        deleteInput.id = 'deleted-wallpaper-ids';
        deleteInput.value = JSON.stringify([]); // Initialize empty array
        wallGrid.appendChild(deleteInput);

        // Add hidden input for thumb selected wallpaper IDs
        const thumbInput = document.createElement('input');
        thumbInput.type = 'hidden';
        thumbInput.id = 'selected-thumb-id';
        thumbInput.value = (thumbId && typeof thumbId === 'string' && thumbId!=='undefined') ? thumbId : '';
        wallGrid.appendChild(thumbInput);
        
        if (data && data.length > 0) {

            data.forEach(wallpaper => {

                const wrapper = document.createElement('div');
                wrapper.className = 'wallpaper-wrapper';

                const img = document.createElement('img');
                img.className = 'wallpaper-thumb';
                img.src = wallpaper.preview_url || 'https://via.placeholder.com/100?text=No+Image';
                img.dataset.wallpaperId = wallpaper.id;
                img.dataset.wallpaperUrl = wallpaper.url;
                wrapper.appendChild(img);

                const overlay = document.createElement('div');
                overlay.className = 'wallpaper-overlay';

                const viewIcon = document.createElement('span');
                viewIcon.className = 'wallpaper-icon view-icon';
                viewIcon.innerHTML = '🔍';
                overlay.appendChild(viewIcon);

                const removeIcon = document.createElement('span');
                removeIcon.className = 'wallpaper-icon remove-icon';
                removeIcon.innerHTML = '🗑️';
                overlay.appendChild(removeIcon);

                wrapper.appendChild(overlay);
                
                const thumbIcon = document.createElement('span');
                thumbIcon.className = 'wallpaper-icon thumb-icon';
                thumbIcon.innerHTML = '⭐';
                overlay.appendChild(thumbIcon);

                // Add thumb flag for this wallpaper
                if (thumbId && wallpaper.id === thumbId) {
                    const thumbIndicator = document.createElement('span');
                    thumbIndicator.className = 'thumb-indicator';
                    thumbIndicator.textContent = 'THUMB';
                    wrapper.appendChild(thumbIndicator);
                }

                // NSFW labels
                if ((nsfwStatus.adult && nsfwStatus.adult.length > 0) || (nsfwStatus.racy && nsfwStatus.racy.length > 0)) {
                  
                    const topRightDiv = document.createElement('div');
                    topRightDiv.className = 'top-right-div';

                    // Adult
                    if (nsfwStatus.adult && nsfwStatus.adult.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'adult-indicator';
                        statusIndicator.textContent = 'ADULT';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    // Racy
                    if (nsfwStatus.racy && nsfwStatus.racy.includes(wallpaper.id)) {
                        const statusIndicator = document.createElement('span');
                        statusIndicator.className = 'racy-indicator';
                        statusIndicator.textContent = 'RACY';
                        topRightDiv.appendChild(statusIndicator);
                    }
                    wrapper.appendChild(topRightDiv);

                    // Update nsfw data in Dataset after veriry success...
                    selectedAlbum.dataset.nsfw = JSON.stringify(nsfwStatus);
                }
                wallGrid.appendChild(wrapper);
            });
        } else {
            const noImages = document.createElement('p');
            noImages.textContent = '😒 No images in this album!';
            noImages.style.color = 'darkgrey';
            noImages.style.textAlign = 'center';
            noImages.style.position = 'relative';
            noImages.style.left = '215px';
            noImages.style.top = '175px';
            noImages.style.width = '203px';
            wallGrid.appendChild(noImages);
        }

        // Re-attach event listeners
        wallGrid.querySelectorAll('.remove-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                let deletedIds = JSON.parse(deleteInput.value);
                if (!deletedIds.includes(wallpaperId)) {
                    deletedIds.push(wallpaperId);
                    deleteInput.value = JSON.stringify(deletedIds);
                    wrapper.classList.add('deleted');
                }
            });
        });
        wallGrid.querySelectorAll('.view-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
                    thumb.classList.remove('selected');
                });
                img.classList.add('selected');
                // document.getElementById('detail-wallpaper-id').textContent = img.dataset.wallpaperId;
                document.getElementById('detail-album-id').textContent = img.dataset.albumId;
                document.getElementById('detail-album-name').value = albumName || '';
                setCategory(albumCategoryId); // document.getElementById('detail-album-category').value = albumCategory || '';
                document.getElementById('detail-album-tags').value = albumTags || '';
                document.getElementById('detail-album-countries').value = albumCountries || '';
                document.getElementById('detail-album-total-wallpapers').textContent = totalWallpapers || '-';
                // document.getElementById('detail-collection-id').textContent = img.dataset.author_id;
                // document.getElementById('detail-track-collecction-id').textContent = img.dataset.tracking_collection_id;
                if (img.dataset.wallpaperUrl) {
                    window.open(img.dataset.wallpaperUrl, '_blank');
                    // document.getElementById('detail-quality-url').textContent = 'Click here! ♥️';
                    // document.getElementById('detail-quality-url').href = img.dataset.wallpaperUrl;
                } else {
                    // document.getElementById('detail-quality-url').textContent = 'Not download yet! 😤';
                }
            });
        });
        wallGrid.querySelectorAll('.thumb-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrapper = e.target.closest('.wallpaper-wrapper');
                const img = wrapper.querySelector('.wallpaper-thumb');
                const wallpaperId = img.dataset.wallpaperId;
                document.querySelectorAll('.thumb-indicator').forEach(indicator => {
                    indicator.remove();
                });
                const thumbIndicator = document.createElement('span');
                thumbIndicator.className = 'thumb-indicator';
                thumbIndicator.textContent = 'THUMB';
                wrapper.appendChild(thumbIndicator);
                const thumbInput = document.getElementById('selected-thumb-id');
                thumbInput.value = wallpaperId;
                selectedAlbum.dataset.thumb = wallpaperId;
                console.log('[SELECT_THUMB_UPDATE] Wallpaper ID:', wallpaperId);
            });
        });
        // Reset details if no wallpaper selected
        // document.getElementById('detail-wallpaper-id').textContent = 'Select a wallpaper';
      
    } catch (error) {
        console.error('Error verifing album:', error);
        alert(error.message);
    } finally {
        isSubmitting = false;
        updateAlbumBtn.disabled = false;
    }
});

/* *************************************************************** */ 
/* ************* ADD MULTIPLE WALLPAPRES TO ALBUM  *************** */ 
/* *************************************************************** */ 

async function showAddMultipleWallpapersToAlbumPopup() {

    const selectedWallpaperDataset = Array.from(document.querySelectorAll('.select-checkbox:checked'))
        .map(checkbox => ({ id: checkbox.dataset.wallpaperId, idx: checkbox.dataset.wallpaperIdx }));

    // console.log(`selectedWallpaperDataset: ${JSON.stringify(selectedWallpaperDataset,null,2)}`);
    
    if (selectedWallpaperDataset.length === 0) {
        alert('Please select at least one wallpaper!');
        return;
    }

    let selectedWallpapers = [];
    for (const wallpaperDataset of selectedWallpaperDataset) {
        const wallpaper = document.getElementById(`wallpaper-data-${wallpaperDataset.id}`).value;
        if (!wallpaper) {
            alert(`Wallpaper with ID ${wallpaperDataset.id} not found!`);
            return;
        }
        selectedWallpapers.push(JSON.parse(wallpaper));
    }

    const popup = document.getElementById('add-multiple-popup');
    const selectedCount = document.getElementById('add-multiple-selected-count');
    const albumListContainer = document.getElementById('add-multiple-album-list');
    const logMessage = document.getElementById('add-multiple-log');

    if (!popup || !selectedCount || !albumListContainer || !logMessage) {
        console.error('Popup elements not found!');
        // alert('Lỗi: Không tìm thấy các thành phần popup!');
        return;
    }
    selectedCount.textContent = selectedWallpaperDataset.length;
    albumListContainer.innerHTML = '';
    logMessage.textContent = '';

    const albums = await fetchAlbums();
    albums.forEach(album => {
        const albumItem = document.createElement('div');
        albumItem.className = 'add-multiple-album-item';
        albumItem.textContent = album.name;
        albumItem.dataset.albumId = album.id;
        albumListContainer.appendChild(albumItem);
    });

    popup.classList.add('show');

    albumListContainer.querySelectorAll('.add-multiple-album-item').forEach(item => {
        item.addEventListener('click', () => {
            albumListContainer.querySelectorAll('.add-multiple-album-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    // Add
    document.getElementById('add-multiple-add-btn').addEventListener('click', async () => {

        document.getElementById('add-multiple-add-btn').innerHTML = '<i class="fa-solid fa-spinner fa-spin loading-indicator"></i> Waiting...';

        let isSubmitting = false;
        if (isSubmitting) return;
        isSubmitting = true;
        const addBtn = document.getElementById('add-multiple-add-btn');
        addBtn.disabled = true;

        const selectedAlbum = albumListContainer.querySelector('.add-multiple-album-item.selected');
        if (!selectedAlbum) {
            logMessage.textContent = 'Please select an album!';
            logMessage.className = 'add-multiple-log error';
            addBtn.disabled = false;
            isSubmitting = false;
            return;
        }
        try {
            logMessage.textContent = 'Adding wallpapers to album...';
            logMessage.className = 'add-multiple-log';

            const albumId = selectedAlbum.dataset.albumId;
            const { success, message } = await addToAlbum(albumId, selectedWallpapers);

            if (success) {
              // Remove wallpapers from View (change wallpaper status)...
              for (const wallpaper of selectedWallpapers) {
                  const wallpaperIndex = selectedWallpaperDataset.find((d) => d.id===wallpaper.id).idx;
                  await updateWallpaperStatus(Number(wallpaperIndex), wallpaper, false, 'add-album');
              }
              logMessage.textContent = `Successfully added ${selectedWallpapers.length} wallpapers to album "${selectedAlbum.textContent}"!`;
              logMessage.className = 'add-multiple-log success';
              document.querySelectorAll('.select-checkbox').forEach(checkbox => {
                  checkbox.checked = false;
              });
              setTimeout(() => popup.classList.remove('show'), 1500);

            } else {
              throw new Error(message);
            }
        } catch (error) {
            logMessage.textContent = 'Add wallpapers failed: ' + error.message;
            logMessage.className = 'add-multiple-log error';
        } finally {
            addBtn.disabled = false;
            isSubmitting = false;
            document.getElementById('add-multiple-add-btn').innerHTML = '<i class="fas fa-plus"></i> Add Wallpapers';
        }
    }, { once: true });

    // Cancel
    document.getElementById('add-multiple-cancel-btn').addEventListener('click', () => {
        popup.classList.remove('show');
        logMessage.textContent = '';
        logMessage.className = 'add-multiple-log';
    }, { once: true });
}

/* *************************************************************** */ 
/* ********************* WALLPAPER SELECTION ********************* */ 
/* *************************************************************** */

// Handle wallpaper selection
document.getElementById('wallpapers-grid').addEventListener('click', (e) => {
    if (e.target.classList.contains('wallpaper-thumb')) {
        // Remove previous selection
        document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
            thumb.classList.remove('selected');
        });
        // Add new selection
        e.target.classList.add('selected');
        // Update details
        document.getElementById('detail-title').textContent = e.target.dataset.title || 'Untitled';
        document.getElementById('detail-size').textContent = e.target.dataset.size || 'Unknown';
        document.getElementById('detail-date').textContent = e.target.dataset.date || 'Unknown';
    }
});
