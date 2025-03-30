// Bookmark management module
const bookmarkManager = {
    // Key for localStorage
    STORAGE_KEY: 'nature_tracker_bookmarks',

    // Get all bookmarks
    getBookmarks() {
        const bookmarks = localStorage.getItem(this.STORAGE_KEY);
        return bookmarks ? JSON.parse(bookmarks) : [];
    },

    // Add a bookmark
    addBookmark(item) {
        const bookmarks = this.getBookmarks();
        // Check if item already exists
        if (!bookmarks.some(bookmark => bookmark.id === item.id)) {
            bookmarks.push({
                ...item,
                bookmarkedAt: new Date().toISOString()
            });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
            return true;
        }
        return false;
    },

    // Remove a bookmark
    removeBookmark(itemId) {
        const bookmarks = this.getBookmarks();
        const filteredBookmarks = bookmarks.filter(bookmark => bookmark.id !== itemId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredBookmarks));
        return bookmarks.length !== filteredBookmarks.length;
    },

    // Check if an item is bookmarked
    isBookmarked(itemId) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(bookmark => bookmark.id === itemId);
    },

    // Get bookmarks by type
    getBookmarksByType(type) {
        const bookmarks = this.getBookmarks();
        return type === 'all' ? bookmarks : bookmarks.filter(bookmark => bookmark.type.toLowerCase() === type.toLowerCase());
    }
};

export default bookmarkManager; 