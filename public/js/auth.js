// auth.js - Shared authentication utilities

// Get the stored token
function getToken() {
    return localStorage.getItem('natureTracker_token');
}

// Set token in localStorage
function setToken(token) {
    if (token) {
        localStorage.setItem('natureTracker_token', token);
        console.log('Token saved to localStorage');
    }
}

// Remove token (logout)
function removeToken() {
    localStorage.removeItem('natureTracker_token');
    console.log('Token removed from localStorage');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Fetch current user data
async function getCurrentUser() {
    try {
        if (!isAuthenticated()) {
            console.log('Not authenticated, no token found');
            return null;
        }
        
        console.log('Fetching current user profile');
        const response = await fetch('/api/users/profile', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (!response.ok) {
            console.error('Failed to fetch user profile', response.status);
            // If token is invalid, clear it
            if (response.status === 401) {
                console.log('Unauthorized (401) response, removing token');
                removeToken();
                // Try to extract the token from cookie
                await refreshTokenFromCookie();
            }
            return null;
        }
        
        const userData = await response.json();
        console.log('User profile fetched successfully');
        return userData;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}

// Attempt to refresh the token from cookies
async function refreshTokenFromCookie() {
    try {
        console.log('Attempting to refresh token from cookie');
        // Make a simple request to check if we have a valid cookie token
        const response = await fetch('/api/users/profile');
        
        if (response.ok) {
            // If we get a successful response, we have a valid cookie token
            // Extract it from response headers if possible
            console.log('Valid session found, extracting token');
            const data = await response.json();
            return data;
        } else {
            console.log('No valid session found in cookie');
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token from cookie:', error);
        return null;
    }
}

// Login user
async function loginUser(email, password) {
    try {
        console.log(`Attempting login for ${email} with password: ${password ? "provided" : "missing"}`);
        
        // Check if inputs are valid
        if (!email || !password) {
            console.error('Missing email or password');
            throw new Error('Email and password are required');
        }
        
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include' // Include cookies in the request
        });
        
        // Log response status
        console.log(`Login response status: ${response.status}`);
        
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (!response.ok) {
            console.error('Login failed:', data.message);
            throw new Error(data.message || 'Login failed');
        }
        
        // Check if token is present
        if (!data.token) {
            console.error('No token received from server');
            throw new Error('Authentication error: No token received');
        }
        
        console.log('Login successful, token received length:', data.token.length);
        setToken(data.token);
        
        // Verify the token is saved
        const savedToken = getToken();
        console.log('Token saved successfully:', !!savedToken);
        
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Register new user
async function registerUser(name, email, password) {
    try {
        console.log(`Attempting to register ${email}`);
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include' // Include cookies in the request
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Registration failed:', data.message);
            throw new Error(data.message || 'Registration failed');
        }
        
        console.log('Registration successful, saving token');
        setToken(data.token);
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Logout user
async function logoutUser() {
    try {
        if (!isAuthenticated()) {
            console.log('Already logged out, no token found');
            return;
        }
        
        console.log('Sending logout request to server');
        await fetch('/api/users/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            credentials: 'include' // Include cookies in the request
        });
        
        console.log('Logout successful, removing token');
        removeToken();
    } catch (error) {
        console.error('Logout error:', error);
        // Still remove the token on error
        removeToken();
    }
}

// Handle Google Authentication
async function authenticateWithGoogle() {
    try {
        console.log('Redirecting to Google OAuth endpoint');
        // Redirect to the correct Google OAuth endpoint at the server level
        window.location.href = '/auth/google';
        
        // This function will not return as we're redirecting the browser
        return new Promise(() => {});
    } catch (error) {
        console.error('Google authentication error:', error);
        throw error;
    }
}

// Function to check if the user just completed Google OAuth
async function checkGoogleAuthStatus() {
    try {
        // Check URL parameters for Google auth success
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'google_auth_success') {
            console.log('Google auth success detected in URL');
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Now fetch the user data
            console.log('Fetching user data after Google auth');
            const response = await fetch('/api/users/google/status', {
                credentials: 'include' // Include cookies in request
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token) {
                    console.log('Google auth successful, saving token');
                    setToken(data.token);
                    return data.user;
                }
            }
        }
        
        console.log('No active Google auth session found');
        return null;
    } catch (error) {
        console.error('Error checking Google auth status:', error);
        return null;
    }
}

// Diagnostic test function to check auth system
async function testAuthSystem() {
    try {
        console.log('=== Auth System Diagnostic Test ===');
        console.log('1. Checking for existing token...');
        const existingToken = getToken();
        console.log('   Current token in localStorage:', existingToken ? 'Found (length: ' + existingToken.length + ')' : 'None');
        
        console.log('2. Testing server connection...');
        const pingResponse = await fetch('/api/users/ping', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        
        if (pingResponse.ok) {
            console.log('   Server connection successful:', await pingResponse.json());
        } else {
            console.log('   Server connection returned error:', pingResponse.status);
        }
        
        return 'Auth system diagnostic complete - check console for results';
    } catch (error) {
        console.error('Auth diagnostic test error:', error);
        return 'Auth diagnostic test failed: ' + error.message;
    }
}

// Export methods
window.NatureTrackerAuth = {
    getToken,
    isAuthenticated,
    getCurrentUser,
    loginUser,
    registerUser,
    logoutUser,
    authenticateWithGoogle,
    checkGoogleAuthStatus,
    refreshTokenFromCookie,
    testAuthSystem
}; 