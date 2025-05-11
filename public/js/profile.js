// Profile page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check for URL parameters
    checkUrlParameters();
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Set up event listeners
    setupEventListeners();
    
    // Add a diagnostic button to the login form
    const loginForm = document.querySelector('.auth-form-login form');
    
    // Add a reset button after the form
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'btn btn-secondary';
    resetButton.style.width = '100%';
    resetButton.style.marginTop = '20px';
    resetButton.textContent = 'Reset Authentication';
    resetButton.onclick = resetAuthentication;
    
    // Add a diagnostic button 
    const diagButton = document.createElement('button');
    diagButton.type = 'button';
    diagButton.className = 'btn btn-secondary';
    diagButton.style.width = '100%';
    diagButton.style.marginTop = '10px';
    diagButton.textContent = 'Run Diagnostics';
    diagButton.onclick = runDiagnostics;
    
    // Insert the buttons
    loginForm.appendChild(resetButton);
    loginForm.appendChild(diagButton);
});

// Check URL parameters for error messages
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'google_auth_not_configured') {
        showMessage('error', 'Google authentication is not configured on the server. Please use email/password login.');
        // Remove the parameter from URL without refreshing
        window.history.replaceState({}, document.title, '/profile.html');
    }
}

// Show message in the auth form
function showAuthMessage(type, text) {
    const messageEl = document.querySelector('.auth-message');
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
    messageEl.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Check authentication status
async function checkAuthStatus() {
    try {
        // First check if we just completed Google OAuth
        const googleAuthUser = await NatureTrackerAuth.checkGoogleAuthStatus();
        if (googleAuthUser) {
            displayUserProfile(googleAuthUser);
            showMessage('success', 'Signed in with Google successfully');
            return;
        }
        
        // Otherwise check for regular auth
        const user = await NatureTrackerAuth.getCurrentUser();
        
        if (user) {
            // User is logged in, show profile
            displayUserProfile(user);
        } else {
            // User is not logged in, show auth form
            showAuthForm();
            
            // Check if we need to show an error message about invalid credentials
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('error') === 'invalid_credentials') {
                showAuthMessage('error', 'Your session has expired. Please login again.');
                // Remove the parameter from URL without refreshing
                window.history.replaceState({}, document.title, '/profile.html');
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showAuthForm();
        showAuthMessage('error', 'There was a problem checking your login status. Please try again.');
    }
}

// Display user profile
function displayUserProfile(user) {
    document.querySelector('.auth-container').style.display = 'none';
    document.querySelector('.profile-content').style.display = 'block';
    
    // Update profile with user data
    document.querySelector('.profile-name').textContent = user.name;
    document.querySelector('.member-since').textContent = `Member since ${new Date(user.createdAt).getFullYear()}`;
    
    // Update stats
    document.querySelector('.stat-sightings').textContent = user.stats.sightings;
    document.querySelector('.stat-bookmarks').textContent = user.stats.bookmarks;
    document.querySelector('.stat-following').textContent = user.stats.following;
    
    // Update profile picture if available
    const avatarEl = document.getElementById('profile-avatar');
    if (user.avatar) {
        avatarEl.innerHTML = `<img src="${user.avatar}" alt="Profile picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatarEl.innerHTML = `<i class="fas fa-user-circle"></i>`;
    }
    
    // Populate edit form fields
    document.querySelector('#edit-name').value = user.name;
    document.querySelector('#edit-bio').value = user.bio || '';
    
    // Show edit profile button
    document.querySelector('.edit-profile-btn').style.display = 'block';
    
    // Show logout button
    document.querySelector('.logout-btn').style.display = 'block';
}

// Show authentication form
function showAuthForm() {
    document.querySelector('.profile-content').style.display = 'none';
    document.querySelector('.auth-container').style.display = 'block';
    document.querySelector('.auth-form-register').style.display = 'none';
    document.querySelector('.auth-form-login').style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    // Toggle between login and register forms
    document.querySelector('.toggle-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-form-login').style.display = 'none';
        document.querySelector('.auth-form-register').style.display = 'block';
        
        // Clear any displayed auth messages
        document.querySelectorAll('.auth-message').forEach(msg => {
            msg.style.display = 'none';
        });
    });
    
    document.querySelector('.toggle-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-form-register').style.display = 'none';
        document.querySelector('.auth-form-login').style.display = 'block';
        
        // Clear any displayed auth messages
        document.querySelectorAll('.auth-message').forEach(msg => {
            msg.style.display = 'none';
        });
    });
    
    // Handle login form submission
    document.querySelector('.auth-form-login form').addEventListener('submit', handleLoginSubmit);
    
    // Handle register form submission
    document.querySelector('.auth-form-register form').addEventListener('submit', handleRegisterSubmit);
    
    // Handle logout
    document.querySelector('.logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            await NatureTrackerAuth.logoutUser();
            
            // Show auth form
            showAuthForm();
            
            // Show success message
            showMessage('success', 'Logged out successfully');
        } catch (error) {
            showMessage('error', 'An error occurred during logout');
        }
    });
    
    // Handle edit profile
    document.querySelector('.edit-profile-btn').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.profile-view').style.display = 'none';
        document.querySelector('.profile-edit').style.display = 'block';
    });
    
    // Handle cancel edit
    document.querySelector('.cancel-edit-btn').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.profile-edit').style.display = 'none';
        document.querySelector('.profile-view').style.display = 'block';
    });
    
    // Handle profile picture preview
    document.querySelector('#edit-profile-picture').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const previewContainer = document.querySelector('.profile-picture-preview');
                const previewImg = document.querySelector('#profile-picture-preview');
                previewImg.src = event.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
    
    // Handle save profile
    document.querySelector('.profile-edit form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.querySelector('#edit-name').value;
        const bio = document.querySelector('#edit-bio').value;
        const profilePictureInput = document.querySelector('#edit-profile-picture');
        
        try {
            // First update the profile info
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${NatureTrackerAuth.getToken()}`
                },
                body: JSON.stringify({ name, bio })
            });
            
            if (!response.ok) {
                const error = await response.json();
                showMessage('error', error.message || 'Failed to update profile');
                return;
            }
            
            let userData = await response.json();
            
            // If a profile picture was selected, upload it
            if (profilePictureInput.files.length > 0) {
                const formData = new FormData();
                formData.append('profilePicture', profilePictureInput.files[0]);
                
                const pictureResponse = await fetch('/api/users/profile/picture', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${NatureTrackerAuth.getToken()}`
                    },
                    body: formData
                });
                
                if (pictureResponse.ok) {
                    userData = await pictureResponse.json();
                    showMessage('success', 'Profile picture updated successfully');
                } else {
                    const pictureError = await pictureResponse.json();
                    showMessage('error', pictureError.message || 'Failed to update profile picture');
                }
            }
            
            // Update profile and switch view
            displayUserProfile(userData);
            document.querySelector('.profile-edit').style.display = 'none';
            document.querySelector('.profile-view').style.display = 'block';
            
            // Reset the file input
            profilePictureInput.value = '';
            document.querySelector('.profile-picture-preview').style.display = 'none';
            
            // Show success message
            showMessage('success', 'Profile updated successfully');
        } catch (error) {
            console.error('Update profile error:', error);
            showMessage('error', 'An error occurred while updating profile');
        }
    });
    
    // Handle Google sign-in buttons
    document.querySelectorAll('.btn-google').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                // Show loading state on button
                const originalButtonText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting to Google...';
                button.disabled = true;
                
                // Redirect to Google OAuth endpoint
                await NatureTrackerAuth.authenticateWithGoogle();
                
                // Note: The page will redirect, so the code below won't execute
                // but we'll include it for completeness
            } catch (error) {
                console.error('Google auth error:', error);
                showMessage('error', error.message || 'Google authentication failed');
                
                // Reset button
                button.innerHTML = originalButtonText;
                button.disabled = false;
            }
        });
    });
}

// Handle login form submission
const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    const email = document.querySelector('#login-email').value;
    const password = document.querySelector('#login-password').value;
    
    // Disable form during login attempt
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    try {
        const user = await NatureTrackerAuth.loginUser(email, password);
        
        // Update UI
        displayUserProfile(user);
        
        // Show success message
        showMessage('success', 'Logged in successfully');
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('error', error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
        // Re-enable form
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
};

// Handle registration form submission
const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    const name = document.querySelector('#register-name').value;
    const email = document.querySelector('#register-email').value;
    const password = document.querySelector('#register-password').value;
    const confirmPassword = document.querySelector('#register-confirm-password').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showAuthMessage('error', 'Passwords do not match');
        return;
    }
    
    // Disable form during registration attempt
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';
    
    try {
        const user = await NatureTrackerAuth.registerUser(name, email, password);
        
        // Update UI
        displayUserProfile(user);
        
        // Show success message
        showMessage('success', 'Account created successfully');
    } catch (error) {
        console.error('Registration error:', error);
        showAuthMessage('error', error.message || 'Registration failed. Please try again.');
    } finally {
        // Re-enable form
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
};

// Show message
function showMessage(type, text) {
    const messageEl = document.querySelector('.message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Reset authentication data
async function resetAuthentication() {
    try {
        // Clear local storage token
        localStorage.removeItem('natureTracker_token');
        
        // Clear cookies via server
        await fetch('/api/users/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Show message
        showAuthMessage('success', 'Authentication data cleared. Please login again.');
        
        // Refresh page after a delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error resetting authentication:', error);
        showAuthMessage('error', 'Error resetting authentication. Please try again.');
    }
}

// Run diagnostic tests
async function runDiagnostics() {
    try {
        const result = await NatureTrackerAuth.testAuthSystem();
        showAuthMessage('success', 'Diagnostics completed. Check browser console for details.');
    } catch (error) {
        console.error('Diagnostics error:', error);
        showAuthMessage('error', 'Error running diagnostics.');
    }
} 