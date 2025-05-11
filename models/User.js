const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

class User {
  constructor(userData) {
    this._id = userData._id || userData.id;
    this.email = userData.email;
    this.password = userData.password;
    this.name = userData.name;
    this.googleId = userData.googleId || null;
    this.createdAt = userData.createdAt || new Date();
    this.avatar = userData.avatar || null;
    this.bio = userData.bio || '';
    this.stats = userData.stats || {
      sightings: 0,
      bookmarks: 0,
      following: 0
    };
    this._passwordModified = userData._passwordModified || false;
    this._passwordHashed = userData._passwordHashed || false;
  }

  async save() {
    // Hash password if it's new or modified
    if (this.password && (!this._passwordHashed || this._passwordModified)) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this._passwordHashed = true;
      this._passwordModified = false;
    }
    
    // Generate an id if this is a new user
    if (!this._id) {
      this._id = admin.firestore().collection('users').doc().id;
    }
    
    // Convert to a Firestore-friendly object
    const userObject = {
      _id: this._id,
      email: this.email,
      password: this.password,
      name: this.name,
      googleId: this.googleId,
      createdAt: this.createdAt,
      avatar: this.avatar,
      bio: this.bio,
      stats: this.stats
    };
    
    // Save to Firestore
    await admin.firestore().collection('users').doc(this._id).set(userObject);
    
    return this;
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    
    try {
      console.log('Comparing password for user:', this.email);
      console.log('Stored password exists:', !!this.password);
      
      const isMatch = await bcrypt.compare(candidatePassword, this.password);
      console.log('Password comparison result:', isMatch);
      
      return isMatch;
    } catch (error) {
      console.error('Error comparing password:', error);
      return false;
    }
  }
  
  // Static methods
  static async findOne(queryParams) {
    try {
      let query = admin.firestore().collection('users');
      
      if (queryParams.email) {
        query = query.where('email', '==', queryParams.email);
      }
      
      if (queryParams.googleId) {
        query = query.where('googleId', '==', queryParams.googleId);
      }
      
      const querySnapshot = await query.get();
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return new User(userData);
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }
  
  static async findById(id) {
    try {
      const docRef = admin.firestore().collection('users').doc(id);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const userData = docSnap.data();
        return new User(userData);
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }
}

module.exports = User; 