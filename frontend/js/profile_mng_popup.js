const viewProfilesTrigger = document.getElementById('viewProfilesTrigger');
const viewProfilesPopup = document.getElementById('viewProfilesPopupOverlay');

viewProfilesTrigger.addEventListener('click', () => {
    viewProfilesPopup.classList.toggle('show');
    renderProfileList();
});

function hideViewProfilesPopup() {
    viewProfilesPopup.classList.remove('show');
}

let profiles = [];
let profileIdCounter = 1;

// Profile creation
const createProfileBtn = document.getElementById('create-profile-btn');
const createProfileForm = document.getElementById('create-profile-form');
const submitProfileBtn = document.getElementById('submit-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');

createProfileBtn.addEventListener('click', () => {
    createProfileForm.classList.toggle('show');
});

submitProfileBtn.addEventListener('click', async () => {
    const profileName = document.getElementById('new-profile-name').value.trim();
    if (profileName) {
        try {
            const newProfile = {
                name: profileName,
                wallpaperIds: [],
                thumb: null
            };
            
            // Call API to create profile
            const response = await fetch(`${API_HOST_URL}/api/profiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProfile)
            });
            
            if (!response.ok) throw new Error('Failed to create profile');
            
            const createdProfile = await response.json();
            profiles.push(createdProfile);
            renderProfileList();
            createProfileForm.classList.remove('show');
            document.getElementById('new-profile-name').value = '';
            alert('Profile created successfully!');
        } catch (error) {
            console.error('Error creating profile:', error);
            alert('Failed to create profile!');
        }
    }
});

cancelProfileBtn.addEventListener('click', () => {
    createProfileForm.classList.remove('show');
    document.getElementById('new-profile-name').value = '';
});

function renderProfileList() {
    const profileList = document.getElementById('profile-list');
    profileList.innerHTML = '';
    profiles.forEach(profile => {
        const li = document.createElement('li');
        li.className = 'album-item';
        li.textContent = profile.name;
        li.dataset.profileId = profile.id;
        li.addEventListener('click', () => selectProfile(profile.id));
        profileList.appendChild(li);
    });
}

function selectProfile(profileId) {
    const selectedProfile = profiles.find(p => p.id === profileId);
    if (!selectedProfile) return;
    document.querySelectorAll('#profile-list .album-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.profileId === profileId) item.classList.add('selected');
    });
    document.getElementById('detail-profile-id').textContent = selectedProfile.id;
    document.getElementById('detail-profile-name').value = selectedProfile.name;
    document.getElementById('detail-profile-total-wallpapers').textContent = selectedProfile.wallpaperIds.length;
    
    // Update avatar and background fields
    updateProfileFormField('avatar', selectedProfile.avatar || '');
    updateProfileFormField('background', selectedProfile.background || '');
    
    renderProfileWallpapers(selectedProfile);
}

// Load profiles from server
async function loadProfilesFromJson() {
    try {
        const response = await fetch(`${API_HOST_URL}/api/profiles`);
        if (!response.ok) throw new Error('Failed to load profiles data!');
        const data = await response.json();
        profiles = data;
        if (profiles.length > 0) {
            profileIdCounter = Math.max(...profiles.map(p => p.id)) + 1;
        }
        renderProfileList();
    } catch (error) {
        console.error('Error loading profiles:', error);
        alert('Failed to load profiles!');
    }
}
window.addEventListener('DOMContentLoaded', loadProfilesFromJson);

// Add multiple wallpapers to profile popup
function showAddMultipleWallpapersToProfilePopup() {
    const selectedWallpaperDataset = Array.from(document.querySelectorAll('.select-checkbox:checked'))
        .map(checkbox => ({ id: checkbox.dataset.wallpaperId, idx: checkbox.dataset.wallpaperIdx }));
    if (selectedWallpaperDataset.length === 0) {
        alert('Please select at least one wallpaper!');
        return;
    }
    // Create popup
    let popup = document.getElementById('add-multiple-profile-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'add-multiple-profile-popup';
        popup.className = 'add-multiple-overlay';
        popup.innerHTML = `
            <div class="add-multiple-content">
                <div class="add-multiple-header">
                    <h3>Add <span id="add-multiple-profile-selected-count">0</span> Wallpapers Into Profile...</h3>
                    <span class="add-multiple-close-icon" id="add-multiple-profile-cancel-btn">×</span>
                </div>
                <div id="add-multiple-profile-list" class="add-multiple-album-list"></div>
                <div class="add-multiple-actions">
                    <button id="add-multiple-profile-add-btn" class="add-multiple-action-btn add-multiple-btn"><i class="fas fa-plus"></i> Add Wallpapers</button>
                </div>
                <div id="add-multiple-profile-log" class="add-multiple-log"></div>
            </div>
        `;
        document.body.appendChild(popup);
    }
    document.getElementById('add-multiple-profile-selected-count').textContent = selectedWallpaperDataset.length;
    const profileListContainer = document.getElementById('add-multiple-profile-list');
    const logMessage = document.getElementById('add-multiple-profile-log');
    profileListContainer.innerHTML = '';
    logMessage.textContent = '';
    profiles.forEach(profile => {
        const profileItem = document.createElement('div');
        profileItem.className = 'add-multiple-album-item';
        profileItem.textContent = profile.name;
        profileItem.dataset.profileId = profile.id;
        profileListContainer.appendChild(profileItem);
    });
    popup.classList.add('show');
    profileListContainer.querySelectorAll('.add-multiple-album-item').forEach(item => {
        item.addEventListener('click', () => {
            profileListContainer.querySelectorAll('.add-multiple-album-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        });
    });
    document.getElementById('add-multiple-profile-add-btn').onclick = async function() {
        const selectedProfile = profileListContainer.querySelector('.add-multiple-album-item.selected');
        if (!selectedProfile) {
            logMessage.textContent = 'Please select a profile!';
            logMessage.className = 'add-multiple-log error';
            return;
        }
        const profileId = selectedProfile.dataset.profileId;
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        
        try {
            // Add wallpapers to profile
            const wallpaperIdsToAdd = selectedWallpaperDataset
                .filter(wallpaper => !profile.wallpaperIds.includes(wallpaper.id))
                .map(wallpaper => wallpaper.id);
            
            if (wallpaperIdsToAdd.length === 0) {
                logMessage.textContent = 'All selected wallpapers are already in this profile!';
                logMessage.className = 'add-multiple-log error';
                return;
            }
            
            const updatedProfile = {
                ...profile,
                wallpaperIds: [...profile.wallpaperIds, ...wallpaperIdsToAdd]
            };
            
            // Call API to update profile
            const response = await fetch(`${API_HOST_URL}/api/profiles/${profileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedProfile)
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            
            // Update local data
            Object.assign(profile, updatedProfile);
            
            logMessage.textContent = `Successfully added ${wallpaperIdsToAdd.length} wallpapers to profile "${selectedProfile.textContent}"!`;
            logMessage.className = 'add-multiple-log success';
            setTimeout(() => { 
                popup.classList.remove('show'); 
                renderProfileList(); 
                // Refresh current selection if needed
                const currentSelected = document.querySelector('#profile-list .album-item.selected');
                if (currentSelected && currentSelected.dataset.profileId === profileId) {
                    selectProfile(profileId);
                }
            }, 1500);
            document.querySelectorAll('.select-checkbox').forEach(checkbox => { checkbox.checked = false; });
        } catch (error) {
            console.error('Error adding wallpapers to profile:', error);
            logMessage.textContent = 'Failed to add wallpapers to profile!';
            logMessage.className = 'add-multiple-log error';
        }
    };
    document.getElementById('add-multiple-profile-cancel-btn').onclick = function() {
        popup.classList.remove('show');
        logMessage.textContent = '';
        logMessage.className = 'add-multiple-log';
    };
}
// Function is now called from HTML onclick in the add-selected-profiles-trigger button

// Get wallpaper details by ID from the server data
async function getWallpaperById(wallpaperId) {
    try {
        const response = await fetch(`${API_HOST_URL}/api/wallpapers`);
        if (!response.ok) throw new Error('Failed to fetch wallpapers');
        const wallpapersData = await response.json();
        console.log(wallpaperId);
        console.log(wallpapersData);
        // Find wallpaper by ID in the data array
        const wallpaper = wallpapersData.data.find(w => w.id === wallpaperId);
        return wallpaper || null;
    } catch (error) {
        console.error('Error fetching wallpaper by ID:', error);
        return null;
    }
}

// Generate NSFW labels for wallpaper (HTML string - legacy)
function generateNSFWLabels(wallpaperData) {
    // For now, return empty string since profiles don't have NSFW tracking
    // This can be extended later when NSFW verification is implemented for profiles
    if (!wallpaperData) {
        return '';
    }
    
    let labelsHtml = '';
    
    // Check if wallpaper has NSFW flags in different possible formats
    if (wallpaperData.nsfw_status) {
        const nsfwStatus = wallpaperData.nsfw_status;
        
        // Check various NSFW flag formats
        const hasAdult = (nsfwStatus.adult === 'LIKELY') || (nsfwStatus.adult === true);
        const hasRacy = (nsfwStatus.racy === 'LIKELY') || (nsfwStatus.racy === true);
        
        if (hasAdult || hasRacy) {
            labelsHtml += '<div class="top-right-div">';
            
            if (hasAdult) {
                labelsHtml += '<span class="adult-indicator">ADULT</span>';
            }
            
            if (hasRacy) {
                labelsHtml += '<span class="racy-indicator">RACY</span>';
            }
            
            labelsHtml += '</div>';
        }
    }
    // Alternative: Check if wallpaper has simple NSFW flag
    else if (wallpaperData.is_adult || wallpaperData.is_racy) {
        labelsHtml += '<div class="top-right-div">';
        
        if (wallpaperData.is_adult) {
            labelsHtml += '<span class="adult-indicator">ADULT</span>';
        }
        
        if (wallpaperData.is_racy) {
            labelsHtml += '<span class="racy-indicator">RACY</span>';
        }
        
        labelsHtml += '</div>';
    }
    
    return labelsHtml;
}

// Generate NSFW labels DOM elements - same as Albums
function generateNSFWLabelsDOM(wallpaperData) {
    if (!wallpaperData) {
        return null;
    }
    
    let hasLabels = false;
    const topRightDiv = document.createElement('div');
    topRightDiv.className = 'top-right-div';
    
    // Check if wallpaper has NSFW flags in different possible formats
    if (wallpaperData.nsfw_status) {
        const nsfwStatus = wallpaperData.nsfw_status;
        
        // Check various NSFW flag formats
        const hasAdult = (nsfwStatus.adult === 'LIKELY') || (nsfwStatus.adult === true);
        const hasRacy = (nsfwStatus.racy === 'LIKELY') || (nsfwStatus.racy === true);
        
        if (hasAdult) {
            const adultIndicator = document.createElement('span');
            adultIndicator.className = 'adult-indicator';
            adultIndicator.textContent = 'ADULT';
            topRightDiv.appendChild(adultIndicator);
            hasLabels = true;
        }
        
        if (hasRacy) {
            const racyIndicator = document.createElement('span');
            racyIndicator.className = 'racy-indicator';
            racyIndicator.textContent = 'RACY';
            topRightDiv.appendChild(racyIndicator);
            hasLabels = true;
        }
    }
    // Alternative: Check if wallpaper has simple NSFW flag
    else if (wallpaperData.is_adult || wallpaperData.is_racy) {
        if (wallpaperData.is_adult) {
            const adultIndicator = document.createElement('span');
            adultIndicator.className = 'adult-indicator';
            adultIndicator.textContent = 'ADULT';
            topRightDiv.appendChild(adultIndicator);
            hasLabels = true;
        }
        
        if (wallpaperData.is_racy) {
            const racyIndicator = document.createElement('span');
            racyIndicator.className = 'racy-indicator';
            racyIndicator.textContent = 'RACY';
            topRightDiv.appendChild(racyIndicator);
            hasLabels = true;
        }
    }
    
    return hasLabels ? topRightDiv : null;
}

// Profile wallpapers: remove, select thumb with enhanced UI
async function renderProfileWallpapers(profile) {
    const grid = document.getElementById('profile-wallpapers-grid');
    grid.innerHTML = '';
    
    // Always add avatar and background upload elements first
    addImageUploadElements(grid, profile);
    
    if (!profile.wallpaperIds.length) {
        return;
    }

    // Show loading indicator for wallpapers
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px; color: #666;';
    loadingDiv.textContent = 'Loading wallpapers...';
    grid.appendChild(loadingDiv);
    
    // Fetch all wallpaper details
    const wallpaperPromises = profile.wallpaperIds.map(id => getWallpaperById(id));
    const wallpaperDetails = await Promise.all(wallpaperPromises);
    
    // Remove loading indicator
    loadingDiv.remove();
    
    profile.wallpaperIds.forEach((wallpaperId, index) => {
        const wallpaperData = wallpaperDetails[index];
        const wrapper = document.createElement('div');
        wrapper.className = 'wallpaper-wrapper'; // Use same class as Albums
        
        if (wallpaperData) {
            // Create image element - same as Albums
            const img = document.createElement('img');
            img.className = 'wallpaper-thumb';
            img.src = wallpaperData.image_url || 'https://via.placeholder.com/100?text=No+Image';
            img.dataset.wallpaperId = wallpaperId;
            img.dataset.wallpaperUrl = wallpaperData.image_url || '';
            wrapper.appendChild(img);

            // Create overlay - same as Albums
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

            const thumbIcon = document.createElement('span');
            thumbIcon.className = 'wallpaper-icon thumb-icon';
            thumbIcon.innerHTML = '⭐';
            overlay.appendChild(thumbIcon);

            wrapper.appendChild(overlay);

            // Add thumb indicator - same as Albums
            if (profile.thumb === wallpaperId) {
                const thumbIndicator = document.createElement('span');
                thumbIndicator.className = 'thumb-indicator';
                thumbIndicator.textContent = 'THUMB';
                wrapper.appendChild(thumbIndicator);
            }

            // Add NSFW labels using same structure as Albums
            const nsfwLabels = generateNSFWLabelsDOM(wallpaperData);
            if (nsfwLabels) {
                wrapper.appendChild(nsfwLabels);
            }
        } else {
            // Fallback for missing wallpaper data
            const img = document.createElement('img');
            img.className = 'wallpaper-thumb';
            img.src = 'https://via.placeholder.com/100?text=No+Image';
            img.dataset.wallpaperId = wallpaperId;
            wrapper.appendChild(img);

            const overlay = document.createElement('div');
            overlay.className = 'wallpaper-overlay';
            
            const removeIcon = document.createElement('span');
            removeIcon.className = 'wallpaper-icon remove-icon';
            removeIcon.innerHTML = '🗑️';
            overlay.appendChild(removeIcon);

            wrapper.appendChild(overlay);

            // Add thumb indicator if needed
            if (profile.thumb === wallpaperId) {
                const thumbIndicator = document.createElement('span');
                thumbIndicator.className = 'thumb-indicator';
                thumbIndicator.textContent = 'THUMB';
                wrapper.appendChild(thumbIndicator);
            }
        }
        
        // Add event listeners - same structure as Albums
        const removeIcon = wrapper.querySelector('.remove-icon');
        const thumbIcon = wrapper.querySelector('.thumb-icon');
        const viewIcon = wrapper.querySelector('.view-icon');
        
        // Remove wallpaper event
        if (removeIcon) {
            removeIcon.onclick = async () => {
                if (!confirm('Are you sure you want to remove this wallpaper from the profile?')) return;
                
                try {
                    const updatedProfile = {
                        ...profile,
                        wallpaperIds: profile.wallpaperIds.filter(id => id !== wallpaperId),
                        thumb: profile.thumb === wallpaperId ? null : profile.thumb
                    };
                    
                    // Call API to update profile
                    const response = await fetch(`${API_HOST_URL}/api/profiles/${profile.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedProfile)
                    });
                    
                    if (!response.ok) throw new Error('Failed to update profile');
                    
                    // Update local data
                    Object.assign(profile, updatedProfile);
                    renderProfileWallpapers(profile);
                    document.getElementById('detail-profile-total-wallpapers').textContent = profile.wallpaperIds.length;
                } catch (error) {
                    console.error('Error removing wallpaper from profile:', error);
                    alert('Failed to remove wallpaper from profile!');
                }
            };
        }
        
        // Set as thumb event
        if (thumbIcon) {
            thumbIcon.onclick = async () => {
                try {
                    const updatedProfile = {
                        ...profile,
                        thumb: wallpaperId
                    };
                    
                    // Call API to update profile
                    const response = await fetch(`${API_HOST_URL}/api/profiles/${profile.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedProfile)
                    });
                    
                    if (!response.ok) throw new Error('Failed to update profile');
                    
                    // Update local data
                    Object.assign(profile, updatedProfile);
                    renderProfileWallpapers(profile);
                } catch (error) {
                    console.error('Error setting profile thumbnail:', error);
                    alert('Failed to set profile thumbnail!');
                }
            };
        }
        
        // View wallpaper event (optional)
        if (viewIcon) {
            viewIcon.onclick = () => {
                if (wallpaperData && wallpaperData.image_url) {
                    window.open(wallpaperData.image_url, '_blank');
                }
            };
        }
        
        grid.appendChild(wrapper);
    });
}

// Update profile
const updateProfileBtn = document.getElementById('update-profile-btn');
updateProfileBtn.addEventListener('click', async () => {
    const selectedLi = document.querySelector('#profile-list .album-item.selected');
    if (!selectedLi) return alert('Please select a profile to update!');
    const profileId = selectedLi.dataset.profileId;
    const profile = profiles.find(p => p.id == profileId);
    if (!profile) return;
    const newName = document.getElementById('detail-profile-name').value.trim();
    if (!newName) return alert('Profile name cannot be empty!');
    
    try {
        const updatedProfile = {
            ...profile,
            name: newName,
            avatar: document.getElementById('detail-profile-avatar').value || null,
            background: document.getElementById('detail-profile-background').value || null
        };
        
        // Call API to update profile
        const response = await fetch(`${API_HOST_URL}/api/profiles/${profileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProfile)
        });
        
        if (!response.ok) throw new Error('Failed to update profile');
        
        // Update local data
        Object.assign(profile, updatedProfile);
        renderProfileList();
        selectProfile(profileId);
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile!');
    }
});

// Delete profile
const deleteProfileBtn = document.getElementById('delete-profile-btn');
deleteProfileBtn.addEventListener('click', async () => {
    const selectedLi = document.querySelector('#profile-list .album-item.selected');
    if (!selectedLi) return alert('Please select a profile to delete!');
    const profileId = selectedLi.dataset.profileId;
    
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Call API to delete profile
        const response = await fetch(`${API_HOST_URL}/api/profiles/${profileId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete profile');
        
        // Update local data
        profiles = profiles.filter(p => p.id != profileId);
        renderProfileList();
        document.getElementById('detail-profile-id').textContent = '-';
        document.getElementById('detail-profile-name').value = '';
        document.getElementById('detail-profile-total-wallpapers').textContent = '-';
        document.getElementById('profile-wallpapers-grid').innerHTML = '<p style="color: darkgrey; text-align: center; position: relative; left: 215px; top: 175px; width: 136px;">🙏 Select a profile!</p>';
        alert('Profile deleted successfully!');
    } catch (error) {
        console.error('Error deleting profile:', error);
        alert('Failed to delete profile!');
    }
});

// Verify profile wallpapers - check if all wallpapers exist and are accessible
async function verifyProfileWallpapers(profile) {
    if (!profile || !profile.wallpaperIds.length) {
        alert('No wallpapers to verify in this profile!');
        return;
    }
    
    const verificationResults = {
        total: profile.wallpaperIds.length,
        valid: 0,
        invalid: 0,
        invalidIds: []
    };
    
    try {
        // Show verification progress
        const grid = document.getElementById('profile-wallpapers-grid');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'verification-status';
        statusDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #007bff;">🔍 Verifying wallpapers... 0/' + profile.wallpaperIds.length + '</div>';
        grid.appendChild(statusDiv);
        
        // Verify each wallpaper
        for (let i = 0; i < profile.wallpaperIds.length; i++) {
            const wallpaperId = profile.wallpaperIds[i];
            statusDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #007bff;">🔍 Verifying wallpapers... ' + (i + 1) + '/' + profile.wallpaperIds.length + '</div>';
            
            const wallpaperData = await getWallpaperById(wallpaperId);
            if (wallpaperData && wallpaperData.image_url) {
                // Test if image URL is accessible
                const isAccessible = await testImageUrl(wallpaperData.image_url);
                if (isAccessible) {
                    verificationResults.valid++;
                } else {
                    verificationResults.invalid++;
                    verificationResults.invalidIds.push(wallpaperId);
                }
            } else {
                verificationResults.invalid++;
                verificationResults.invalidIds.push(wallpaperId);
            }
        }
        
        // Remove verification status
        statusDiv.remove();
        
        // Show results
        let message = `Verification Results:\n\n`;
        message += `Total wallpapers: ${verificationResults.total}\n`;
        message += `Valid wallpapers: ${verificationResults.valid}\n`;
        message += `Invalid wallpapers: ${verificationResults.invalid}\n`;
        
        if (verificationResults.invalid > 0) {
            message += `\nInvalid wallpaper IDs:\n${verificationResults.invalidIds.join('\n')}`;
            message += `\n\nDo you want to remove the invalid wallpapers from this profile?`;
            
            if (confirm(message)) {
                // Remove invalid wallpapers
                const updatedProfile = {
                    ...profile,
                    wallpaperIds: profile.wallpaperIds.filter(id => !verificationResults.invalidIds.includes(id)),
                    thumb: verificationResults.invalidIds.includes(profile.thumb) ? null : profile.thumb
                };
                
                const response = await fetch(`${API_HOST_URL}/api/profiles/${profile.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedProfile)
                });
                
                if (response.ok) {
                    Object.assign(profile, updatedProfile);
                    renderProfileWallpapers(profile);
                    document.getElementById('detail-profile-total-wallpapers').textContent = profile.wallpaperIds.length;
                    alert(`Removed ${verificationResults.invalid} invalid wallpapers from profile!`);
                } else {
                    alert('Failed to update profile after verification!');
                }
            }
        } else {
            alert(message + '\n\n✅ All wallpapers are valid!');
        }
        
    } catch (error) {
        console.error('Error verifying profile wallpapers:', error);
        alert('Failed to verify profile wallpapers!');
    }
}

// Helper function to test if an image URL is accessible
async function testImageUrl(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
    });
}

// Add verify button to the profile details section (will need to add to HTML)
function addVerifyButton() {
    const detailsSection = document.getElementById('profile-details');
    if (detailsSection && !document.getElementById('verify-profile-btn')) {
        const verifyBtn = document.createElement('button');
        verifyBtn.id = 'verify-profile-btn';
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Wallpapers';
        verifyBtn.className = 'profile-action-button';
        verifyBtn.style.marginTop = '10px';
        verifyBtn.style.backgroundColor = '#28a745';
        verifyBtn.style.color = 'white';
        verifyBtn.style.border = 'none';
        verifyBtn.style.padding = '8px 16px';
        verifyBtn.style.borderRadius = '4px';
        verifyBtn.style.cursor = 'pointer';
        
        verifyBtn.addEventListener('click', async () => {
            const selectedLi = document.querySelector('#profile-list .album-item.selected');
            if (!selectedLi) return alert('Please select a profile to verify!');
            const profileId = selectedLi.dataset.profileId;
            const profile = profiles.find(p => p.id == profileId);
            if (profile) {
                await verifyProfileWallpapers(profile);
            }
        });
        
        // Insert after the delete button
        const deleteBtn = document.getElementById('delete-profile-btn');
        if (deleteBtn) {
            deleteBtn.parentNode.insertBefore(verifyBtn, deleteBtn.nextSibling);
        }
    }
}

// Initialize verify button when page loads
window.addEventListener('DOMContentLoaded', addVerifyButton);

// Add image upload elements for avatar and background
function addImageUploadElements(grid, profile) {
    // Avatar upload element
    const avatarUpload = createImageUploadElement('avatar', profile.avatar || null);
    grid.appendChild(avatarUpload);
    
    // Background upload element  
    const backgroundUpload = createImageUploadElement('background', profile.background || null);
    grid.appendChild(backgroundUpload);
}

// Create image upload element
function createImageUploadElement(type, currentImagePath) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wallpaper-wrapper image-upload-item'; // Use same base class as regular wallpapers
    wrapper.dataset.uploadType = type;
    
    const isAvatar = type === 'avatar';
    const displayName = isAvatar ? 'Avatar' : 'Background';
    const icon = isAvatar ? 'fas fa-user' : 'fas fa-image';
    
    // Create the main image/placeholder
    if (currentImagePath) {
        const img = document.createElement('img');
        img.className = 'wallpaper-thumb';
        img.src = currentImagePath;
        img.alt = displayName;
        wrapper.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'wallpaper-thumb upload-placeholder';
        placeholder.innerHTML = `
            <i class="${icon}"></i>
            <span>${displayName}</span>
        `;
        wrapper.appendChild(placeholder);
    }
    
    // Create overlay with upload functionality
    const overlay = document.createElement('div');
    overlay.className = 'wallpaper-overlay image-upload-zone';
    
    const uploadIcon = document.createElement('span');
    uploadIcon.className = 'wallpaper-icon upload-icon';
    uploadIcon.innerHTML = '📤';
    uploadIcon.title = `Upload ${displayName}`;
    overlay.appendChild(uploadIcon);
    
    if (currentImagePath) {
        const removeIcon = document.createElement('span');
        removeIcon.className = 'wallpaper-icon remove-icon';
        removeIcon.innerHTML = '🗑️';
        removeIcon.title = `Remove ${displayName}`;
        overlay.appendChild(removeIcon);
    }
    
    wrapper.appendChild(overlay);
    
    // Add identifier
    const identifier = document.createElement('div');
    identifier.className = 'profile-wallpaper-id';
    identifier.textContent = displayName;
    wrapper.appendChild(identifier);
    
    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'hidden-file-input';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.style.display = 'none';
    wrapper.appendChild(fileInput);
    
    // Add event listeners
    const uploadIconBtn = wrapper.querySelector('.upload-icon');
    const removeIconBtn = wrapper.querySelector('.remove-icon');
    const uploadZone = wrapper.querySelector('.image-upload-zone');
    
    // Upload icon click
    if (uploadIconBtn) {
        uploadIconBtn.onclick = () => {
            fileInput.click();
        };
    }
    
    // Upload zone click
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await handleImageUpload(file, type, wrapper);
        }
    });
    
    // Remove icon click
    if (removeIconBtn) {
        removeIconBtn.onclick = () => {
            handleImageRemove(type, wrapper);
        };
    }
    
    // Drag and drop functionality
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await handleImageUpload(file, type, wrapper);
        }
    });
    
    return wrapper;
}

// Handle image upload
async function handleImageUpload(file, type, wrapper) {
    const selectedLi = document.querySelector('#profile-list .album-item.selected');
    if (!selectedLi) {
        alert('Please select a profile first!');
        return;
    }
    
    const profileId = selectedLi.dataset.profileId;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB!');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and WebP files are allowed!');
        return;
    }
    
    // Show loading state
    const uploadZone = wrapper.querySelector('.image-upload-zone');
    const originalContent = uploadZone.innerHTML;
    uploadZone.innerHTML = '<div class="upload-loading"><i class="fas fa-spinner fa-spin"></i><span>Uploading...</span></div>';
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('image', file);
        
        // Upload via API
        const response = await fetch(`${API_HOST_URL}/api/profile/upload-image?profileId=${profileId}&fileType=${type}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update the display
            updateImageDisplay(wrapper, type, result.filePath);
            // Update the form field
            updateProfileFormField(type, result.filePath);
            
            alert(`${type === 'avatar' ? 'Avatar' : 'Background'} uploaded successfully!`);
        } else {
            throw new Error(result.message || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
        // Restore original content
        uploadZone.innerHTML = originalContent;
    }
}

// Handle image removal
function handleImageRemove(type, wrapper) {
    if (confirm(`Are you sure you want to remove this ${type}?`)) {
        // Update display to show placeholder
        const uploadZone = wrapper.querySelector('.image-upload-zone');
        const displayName = type === 'avatar' ? 'Avatar' : 'Background';
        const icon = type === 'avatar' ? 'fas fa-user' : 'fas fa-image';
        
        uploadZone.innerHTML = `
            <div class="upload-placeholder">
                <i class="${icon}"></i>
                <span>${displayName}</span>
            </div>
            <div class="upload-overlay">
                <i class="fas fa-upload"></i>
                <span>Upload ${displayName}</span>
            </div>
        `;
        
        // Remove the remove button
        const removeBtn = wrapper.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.remove();
        }
        
        // Clear the form field
        updateProfileFormField(type, '');
    }
}

// Update image display after successful upload
function updateImageDisplay(wrapper, type, imagePath) {
    const displayName = type === 'avatar' ? 'Avatar' : 'Background';
    
    // Replace placeholder with actual image
    const placeholder = wrapper.querySelector('.upload-placeholder');
    if (placeholder) {
        const img = document.createElement('img');
        img.className = 'wallpaper-thumb';
        img.src = imagePath;
        img.alt = displayName;
        wrapper.replaceChild(img, placeholder);
    } else {
        // If there's already an image, just update the src
        const existingImg = wrapper.querySelector('.wallpaper-thumb');
        if (existingImg) {
            existingImg.src = imagePath;
        }
    }
    
    // Add remove icon to overlay if it doesn't exist
    const overlay = wrapper.querySelector('.wallpaper-overlay');
    if (overlay && !overlay.querySelector('.remove-icon')) {
        const removeIcon = document.createElement('span');
        removeIcon.className = 'wallpaper-icon remove-icon';
        removeIcon.innerHTML = '🗑️';
        removeIcon.title = `Remove ${displayName}`;
        removeIcon.onclick = () => {
            handleImageRemove(type, wrapper);
        };
        overlay.appendChild(removeIcon);
    }
}

// Update profile form field
function updateProfileFormField(type, path) {
    const fieldId = `detail-profile-${type}`;
    const displayId = `detail-profile-${type}-display`;
    
    const field = document.getElementById(fieldId);
    const display = document.getElementById(displayId);
    
    if (field) {
        field.value = path;
    }
    
    if (display) {
        if (path) {
            display.textContent = path.split('/').pop(); // Show just filename
            display.style.color = '#4ade80'; // Green color for uploaded files
        } else {
            display.textContent = `No ${type} uploaded`;
            display.style.color = '#999';
        }
    }
}