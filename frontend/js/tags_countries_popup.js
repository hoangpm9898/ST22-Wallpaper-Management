
document.addEventListener('DOMContentLoaded', () => {

    const main = document.getElementById('viewAlbumsPopupOverlay');
    if (!main) {
        console.error('Overlay element with ID "viewAlbumsPopupOverlay" not found');
        return;
    }

    const inputConfigs = [
        {
            id: 'detail-album-countries',
            fetchUrl: 'https://restcountries.com/v3.1/all?fields=name,cca2',
            title: 'Country List',
            renderItem: (item) => `<p data-value="${item.cca2}">${item.name.common} <span>${item.cca2}</span></p>`,
            sort: (a, b) => a.name.common.localeCompare(b.name.common),
            valueKey: 'cca2'
        },
        {
            id: 'detail-album-tags',
            fetchUrl: `${API_HOST_URL}/api/hashtags-active`,
            title: 'Tag List',
            renderItem: (item) => `<p data-value="${item.name}">${item.name} <span>${item.total}</span></p>`,
            sort: (a, b) => b.total - a.total, // Sort by item.total in descending order
            valueKey: 'name'
        }
    ];

    let popup = null;
    let activeInput = null;

    // Function to add value to input
    function addValueToInput(input, value) {
        const currentValue = input.value.trim();
        const values = currentValue ? currentValue.split(',').map(v => v.trim()) : [];
        if (!values.includes(value)) {
            values.push(value);
            input.value = values.join(', ');
        }
    }

    // Function to update item styles based on input value
    function updateItemStyles(popup, input) {
        const values = input.value.split(',').map(v => v.trim());
        const items = popup.querySelectorAll('p');
        items.forEach(item => {
            const itemValue = item.getAttribute('data-value');
            if (values.includes(itemValue)) {
                item.style.color = 'tomato'; // Change to selected color
            } else {
                item.style.color = ''; // Reset to default (inherits from .wallpaper-details p)
            }
        });
    }

    // Function to create and show popup
    function showPopup(input, config) {
      
        console.log('Show popup for:', config.id);
      
        // Remove existing popup if any
        if (popup) {
            popup.remove();
        }

        // Create popup container
        popup = document.createElement('div');
        popup.className = 'tag-info-popup';
        popup.style.position = 'absolute';
        popup.style.zIndex = '10000';
        popup.style.width = '220px';
        popup.style.height = '690px';
        popup.style.overflowY = 'auto';
        popup.style.top = '90px';
        popup.style.left = '1590px';

        // Position popup to the right of input
        // const inputRect = input.getBoundingClientRect();
        // popup.style.top = `${inputRect.top + window.scrollY}px`;
        // popup.style.left = `${inputRect.right + window.scrollX + 10}px`;

        // Add loading text
        popup.innerHTML = `<p>Loading ${config.title.toLowerCase()}...</p>`;
        main.appendChild(popup); // Append to main instead of document.body

        // Fetch data
        fetch(config.fetchUrl)
            .then(response => response.json())
            .then(data => {
                // Sort data
                const sortedData = data.sort(config.sort);
                // Create popup content
                popup.innerHTML = `
                    <h4>${config.title}</h4>
                    ${sortedData.map(config.renderItem).join('')}
                `;
                // Add click event listeners to items
                popup.querySelectorAll('p').forEach(item => {
                    item.addEventListener('click', () => {
                        const value = item.getAttribute('data-value');
                        addValueToInput(input, value);
                        updateItemStyles(popup, input);
                    });
                });
                // Update styles based on current input value
                updateItemStyles(popup, input);
            })
            .catch(error => {
                popup.innerHTML = `<p>Error loading ${config.title.toLowerCase()}</p>`;
                console.error(`Error fetching ${config.title.toLowerCase()}:`, error);
            });

        activeInput = input;
    }

    // Hide popup when clicking outside
    function hidePopup(event) {
        if (popup && !popup.contains(event.target) && !inputConfigs.some(config => document.getElementById(config.id) === event.target)) {
            popup.remove();
            popup = null;
            activeInput = null;
        }
    }

    // Attach event listeners to all inputs
    inputConfigs.forEach(config => {
        const input = document.getElementById(config.id);
        if (input) {
            input.addEventListener('click', () => showPopup(input, config));
        } else {
            console.warn(`Input with ID "${config.id}" not found`);
        }
    });

    // Add global click listener to hide popup
    document.addEventListener('click', hidePopup);
});
