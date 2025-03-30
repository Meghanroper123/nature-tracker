// Notifications.js - Handles fetching and displaying user notifications

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Debug check for preferences panel
    const panel = document.querySelector('.preferences-panel');
    if (panel) {
        console.log('Preferences panel found in DOM');
    } else {
        console.error('Preferences panel NOT found in DOM');
    }
    
    // Debug check for preferences button
    const prefsBtn = document.querySelector('#preferences-btn');
    if (prefsBtn) {
        console.log('Preferences button found with ID #preferences-btn');
    } else {
        console.error('Preferences button NOT found with ID #preferences-btn');
    }
    
    // Fetch notifications when the page loads
    fetchNotifications('all');
    
    // Set up event listeners for header buttons
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.time-filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Get the time filter value
            const timeFilter = e.target.dataset.filter;
            
            // Fetch notifications with the selected filter
            fetchNotifications(timeFilter);
        });
    });
    
    // Mark all as read button
    const markAllReadBtn = document.querySelector('.mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }
    
    // Notification preferences button
    const preferencesBtn = document.querySelector('#preferences-btn');
    if (preferencesBtn) {
        console.log('Adding click handler to preferences button');
        preferencesBtn.addEventListener('click', function() {
            console.log('Preferences button clicked');
            const panel = document.querySelector('.preferences-panel');
            if (panel) {
                console.log('Toggling panel visibility');
                panel.classList.toggle('visible');
                console.log('Panel visible state:', panel.classList.contains('visible'));
            } else {
                console.error('Could not find preferences panel');
            }
        });
    } else {
        console.error('Could not find preferences button with ID #preferences-btn');
    }
    
    // Close preferences button
    const closePreferencesBtn = document.getElementById('close-preferences');
    if (closePreferencesBtn) {
        closePreferencesBtn.addEventListener('click', togglePreferencesPanel);
    }
    
    // Setup the notification preferences
    setupNotificationPreferences();
}

// Mark all notifications as read
function markAllAsRead() {
    // In a real app, you would make an API call to mark all as read
    console.log('Marking all notifications as read');
    
    // For this demo, just update the UI
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.classList.remove('unread');
    });
    
    // Update the unread count
    updateUnreadCount();
}

// Open notification preferences
function openNotificationPreferences() {
    console.log('Opening notification preferences (via openNotificationPreferences function)');
    // Toggle the preferences panel
    togglePreferencesPanel();
}

// Toggle the preferences panel visibility
function togglePreferencesPanel() {
    console.log('togglePreferencesPanel function called');
    const panel = document.querySelector('.preferences-panel');
    if (panel) {
        console.log('Toggling panel visibility (via togglePreferencesPanel)');
        panel.classList.toggle('visible');
        console.log('Panel visible state after toggle:', panel.classList.contains('visible'));
    } else {
        console.error('Could not find preferences panel in togglePreferencesPanel');
    }
}

// User preferences (would typically be stored in user profile)
const userPreferences = {
    categories: ['wildlife', 'plant', 'weather', 'astronomy'],
    locations: ['Southern California', 'Los Angeles', 'Santa Monica'],
    following: ['Glenn', 'Sarah', 'Miguel']
};

function setupNotificationPreferences() {
    const saveBtn = document.getElementById('save-preferences');
    const locationSlider = document.getElementById('location-radius');
    const locationValue = document.querySelector('.range-value');
    
    // Load saved preferences
    loadPreferences();
    
    // Make sure the close button works
    const closePreferencesBtn = document.getElementById('close-preferences');
    if (closePreferencesBtn) {
        closePreferencesBtn.addEventListener('click', togglePreferencesPanel);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            savePreferences();
            document.querySelector('.preferences-panel').classList.remove('visible');
            
            // Refresh notifications with new preferences
            const activeFilter = document.querySelector('.time-filter-btn.active');
            if (activeFilter) {
                fetchNotifications(activeFilter.dataset.filter);
            }
        });
    }
    
    if (locationSlider && locationValue) {
        locationSlider.addEventListener('input', () => {
            locationValue.textContent = `${locationSlider.value} miles`;
        });
    }
}

function loadPreferences() {
    // Check if preferences are stored in localStorage
    const storedPreferences = localStorage.getItem('notificationPreferences');
    if (!storedPreferences) return;
    
    try {
        const preferences = JSON.parse(storedPreferences);
        
        // Set categories
        if (preferences.categories) {
            document.querySelectorAll('[data-category]').forEach(checkbox => {
                const category = checkbox.dataset.category;
                checkbox.checked = preferences.categories.includes(category);
            });
        }
        
        // Set notification types
        if (preferences.notificationTypes) {
            document.querySelectorAll('[data-notification-type]').forEach(checkbox => {
                const notificationType = checkbox.dataset.notificationType;
                checkbox.checked = preferences.notificationTypes.includes(notificationType);
            });
        }
        
        // Set location radius
        if (preferences.locationRadius) {
            const slider = document.getElementById('location-radius');
            const value = document.querySelector('.range-value');
            if (slider && value) {
                slider.value = preferences.locationRadius;
                value.textContent = `${preferences.locationRadius} miles`;
            }
        }
        
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

function savePreferences() {
    const categories = [];
    const notificationTypes = [];
    let locationRadius = 25;
    
    // Get selected categories
    document.querySelectorAll('[data-category]:checked').forEach(checkbox => {
        categories.push(checkbox.dataset.category);
    });
    
    // Get selected notification types
    document.querySelectorAll('[data-notification-type]:checked').forEach(checkbox => {
        notificationTypes.push(checkbox.dataset.notificationType);
    });
    
    // Get location radius
    const slider = document.getElementById('location-radius');
    if (slider) {
        locationRadius = parseInt(slider.value);
    }
    
    // Save to localStorage
    const preferences = {
        categories,
        notificationTypes,
        locationRadius
    };
    
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    
    // Update user preferences object for this session
    userPreferences.categories = categories;
    
    // Show success message
    showToast('Preferences saved successfully!');
}

// Helper function to show a toast message
function showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.querySelector('.toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    
    // Set message and show
    toast.textContent = message;
    toast.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// Track read notifications in localStorage
function getReadNotifications() {
    const readNotifications = localStorage.getItem('readNotifications');
    return readNotifications ? JSON.parse(readNotifications) : [];
}

function markNotificationAsRead(notificationId) {
    const readNotifications = getReadNotifications();
    if (!readNotifications.includes(notificationId)) {
        readNotifications.push(notificationId);
        localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
    }
}

function markAllNotificationsAsRead() {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        const notificationId = item.dataset.id;
        markNotificationAsRead(notificationId);
        item.classList.remove('unread');
    });
}

function isNotificationRead(notificationId) {
    const readNotifications = getReadNotifications();
    return readNotifications.includes(notificationId);
}

// Function to fetch notifications from the API
async function fetchNotifications(timeFilter = '1month') {
    try {
        // Show loading indicator
        const notificationsContent = document.querySelector('.notifications-content');
        notificationsContent.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
            </div>
        `;
        
        // Map UI filter to API parameter
        let apiTimeFilter;
        switch(timeFilter) {
            case 'today':
                apiTimeFilter = '1day';
                break;
            case 'week':
                apiTimeFilter = '1week';
                break;
            case 'all':
            default:
                apiTimeFilter = '1month';
                break;
        }
        
        // Get recent events based on the time filter
        const response = await fetch(`/api/incidents?eventType=current&timeFilter=${apiTimeFilter}`);
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const events = await response.json();
        
        // Generate mock notifications data
        const notifications = generateMockNotifications(events);
        
        displayNotifications(notifications);
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        showErrorMessage('Failed to load notifications. Please try again later.');
    }
}

// Generate mock notifications based on real events
function generateMockNotifications(events) {
    const notifications = [];
    let enabledNotificationTypes = ['new_event', 'location_alert', 'trending', 'following_activity'];
    
    // Check for saved preferences
    const storedPreferences = localStorage.getItem('notificationPreferences');
    if (storedPreferences) {
        try {
            const preferences = JSON.parse(storedPreferences);
            if (preferences.notificationTypes && preferences.notificationTypes.length > 0) {
                enabledNotificationTypes = preferences.notificationTypes;
            }
            
            // Update user preferences object
            if (preferences.categories && preferences.categories.length > 0) {
                userPreferences.categories = preferences.categories;
            }
        } catch (error) {
            console.error('Error processing stored preferences:', error);
        }
    }
    
    // Use real events to create various notification types
    events.forEach(event => {
        const eventCategory = event.type || 'wildlife';
        
        // Skip if event category is not in user preferences
        if (!userPreferences.categories.includes(eventCategory)) {
            return;
        }
        
        // Basic event notification
        if (enabledNotificationTypes.includes('new_event')) {
            notifications.push({
                id: `ne-${event.id}`,
                type: 'new_event',
                title: event.title,
                description: event.description,
                eventId: event.id,
                category: eventCategory,
                timestamp: event.eventDate,
                read: isNotificationRead(`ne-${event.id}`)
            });
        }
        
        // Add location-based alerts for some events
        if (enabledNotificationTypes.includes('location_alert') && Math.random() > 0.6) {
            notifications.push({
                id: `la-${event.id}`,
                type: 'location_alert',
                title: event.title,
                description: `A ${event.title.toLowerCase()} was spotted near you!`,
                eventId: event.id,
                location: userPreferences.locations[Math.floor(Math.random() * userPreferences.locations.length)],
                timestamp: event.eventDate,
                read: isNotificationRead(`la-${event.id}`)
            });
        }
        
        // Add trending events for some
        if (enabledNotificationTypes.includes('trending') && Math.random() > 0.7) {
            const bookmarkCount = Math.floor(Math.random() * 80) + 20;
            notifications.push({
                id: `tr-${event.id}`,
                type: 'trending',
                title: event.title,
                description: `${bookmarkCount}+ people bookmarked "${event.title}" — check it out!`,
                eventId: event.id,
                bookmarkCount: bookmarkCount,
                timestamp: event.eventDate,
                read: isNotificationRead(`tr-${event.id}`)
            });
        }
        
        // Add following activity for some
        if (enabledNotificationTypes.includes('following_activity') && Math.random() > 0.8) {
            const follower = userPreferences.following[Math.floor(Math.random() * userPreferences.following.length)];
            notifications.push({
                id: `fa-${event.id}`,
                type: 'following_activity',
                title: `${follower} spotted ${event.title}`,
                description: `${follower} spotted a ${event.title.toLowerCase()} near ${userPreferences.locations[Math.floor(Math.random() * userPreferences.locations.length)]}`,
                eventId: event.id,
                follower: follower,
                timestamp: event.eventDate,
                read: isNotificationRead(`fa-${event.id}`)
            });
        }
    });
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return notifications;
}

// Function to display notifications in the UI
function displayNotifications(notifications) {
    const notificationsContent = document.querySelector('.notifications-content');
    
    // Clear any existing content
    notificationsContent.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    // Group notifications by date
    const grouped = groupByDate(notifications);
    
    // Create sections for each date group
    Object.keys(grouped).forEach(date => {
        const dateSection = document.createElement('div');
        dateSection.className = 'notification-date-section';
        
        const dateHeader = document.createElement('h2');
        dateHeader.className = 'date-header';
        dateHeader.textContent = date;
        dateSection.appendChild(dateHeader);
        
        // Create a notification for each item in the group
        grouped[date].forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            dateSection.appendChild(notificationElement);
        });
        
        notificationsContent.appendChild(dateSection);
    });
    
    // Update the unread count
    updateUnreadCount();
}

// Group notifications by date
function groupByDate(notifications) {
    const grouped = {};
    
    notifications.forEach(notification => {
        const date = new Date(notification.timestamp);
        const today = new Date();
        
        let dateLabel;
        
        if (isSameDay(date, today)) {
            dateLabel = 'Today';
        } else if (isSameDay(date, new Date(today.setDate(today.getDate() - 1)))) {
            dateLabel = 'Yesterday';
        } else {
            dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }
        
        if (!grouped[dateLabel]) {
            grouped[dateLabel] = [];
        }
        
        grouped[dateLabel].push(notification);
    });
    
    return grouped;
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
}

// Function to update the unread count badge
function updateUnreadCount() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const unreadBadge = document.querySelector('.unread-badge');
    
    if (unreadBadge) {
        unreadBadge.textContent = unreadCount;
        
        if (unreadCount === 0) {
            unreadBadge.classList.add('hidden');
        } else {
            unreadBadge.classList.remove('hidden');
        }
    }
}

// Function to create a notification element
function createNotificationElement(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-item';
    notificationElement.dataset.id = notification.id;
    notificationElement.dataset.type = notification.type;
    
    // Check if notification is unread
    if (!notification.read) {
        notificationElement.classList.add('unread');
    }
    
    // Format the date
    const notificationDate = new Date(notification.timestamp);
    const timeAgo = getTimeAgo(notificationDate);
    
    // Determine icon and colors based on notification type
    const { icon, color, bgColor } = getNotificationTypeStyles(notification.type);
    
    notificationElement.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon" style="background-color: ${bgColor}; color: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="notification-details">
                <h3>${notification.title}</h3>
                <p>${notification.description}</p>
                <div class="notification-meta">
                    <span class="notification-time">${timeAgo}</span>
                    <span class="notification-tag" style="background-color: ${bgColor}30; color: ${color}">${formatNotificationType(notification.type)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add click event to navigate to the event details and mark as read
    notificationElement.addEventListener('click', () => {
        markNotificationAsRead(notification.id);
        notificationElement.classList.remove('unread');
        updateUnreadCount();
        window.location.href = `/?id=${notification.eventId}`;
    });
    
    return notificationElement;
}

// Get type-specific styles
function getNotificationTypeStyles(type) {
    switch (type) {
        case 'new_event':
            return {
                icon: 'fas fa-bell',
                color: '#2196F3',
                bgColor: '#E3F2FD'
            };
        case 'location_alert':
            return {
                icon: 'fas fa-map-marker-alt',
                color: '#FF9800',
                bgColor: '#FFF3E0'
            };
        case 'trending':
            return {
                icon: 'fas fa-fire',
                color: '#F44336',
                bgColor: '#FFEBEE'
            };
        case 'following_activity':
            return {
                icon: 'fas fa-user-friends',
                color: '#4CAF50',
                bgColor: '#E8F5E9'
            };
        default:
            return {
                icon: 'fas fa-bell',
                color: 'var(--primary-color)',
                bgColor: 'var(--primary-light)'
            };
    }
}

// Format notification type for display
function formatNotificationType(type) {
    switch (type) {
        case 'new_event':
            return 'New Event';
        case 'location_alert':
            return 'Near You';
        case 'trending':
            return 'Trending';
        case 'following_activity':
            return 'Following';
        default:
            return type.replace('_', ' ');
    }
}

// Function to display error message
function showErrorMessage(message) {
    const notificationsContent = document.querySelector('.notifications-content');
    notificationsContent.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Helper function to format relative time
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
} 