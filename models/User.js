const bcrypt = require('bcrypt');
const { adminDb } = require('../config/firebase');
const { collection, doc, getDoc, setDoc, query, where, getDocs } = require('firebase/firestore');
const { db } = require('../config/firebase');

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
      this._id = doc(collection(db, 'users')).id;
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
    await setDoc(doc(db, 'users', this._id), userObject);
    
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
      if (queryParams.email) {
        const userQuery = query(collection(db, 'users'), where('email', '==', queryParams.email));
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          return new User(userData);
        }
      }
      
      if (queryParams.googleId) {
        const userQuery = query(collection(db, 'users'), where('googleId', '==', queryParams.googleId));
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          return new User(userData);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }
  
  static async findById(id) {
    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
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