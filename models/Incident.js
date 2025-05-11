const { collection, doc, getDoc, setDoc, getDocs, deleteDoc, serverTimestamp, query, where, orderBy, limit, Timestamp } = require('firebase/firestore');
const { db } = require('../config/firebase');

class Incident {
  constructor(incidentData) {
    this.id = incidentData.id;
    this.type = incidentData.type;
    this.title = incidentData.title;
    this.description = incidentData.description;
    this.location = incidentData.location || { lat: 0, lng: 0 };
    this.mediaFiles = incidentData.mediaFiles || []; // Array of { url: string, type: 'image' | 'video', thumbnailUrl?: string }
    this.eventDate = incidentData.eventDate ? new Timestamp(incidentData.eventDate.seconds, incidentData.eventDate.nanoseconds) : Timestamp.now();
    this.timestamp = incidentData.timestamp ? new Timestamp(incidentData.timestamp.seconds, incidentData.timestamp.nanoseconds) : Timestamp.now();
    this.userId = incidentData.userId || null;
  }
  
  async save() {
    // Generate an id if this is a new incident
    if (!this.id) {
      this.id = doc(collection(db, 'incidents')).id;
    }
    
    // Convert to a Firestore-friendly object
    const incidentObject = {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      location: this.location,
      mediaFiles: this.mediaFiles,
      eventDate: this.eventDate,
      timestamp: this.timestamp,
      userId: this.userId
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'incidents', this.id), incidentObject);
    
    return this;
  }
  
  // Static methods
  static async getAll(filters = {}) {
    try {
      let queryRef = collection(db, 'incidents');
      const queryConstraints = [];
      
      // Apply filters
      if (filters.type) {
        queryConstraints.push(where('type', '==', filters.type.toLowerCase()));
      }
      
      if (filters.eventType || filters.timeFilter) {
        const now = Timestamp.now();
        
        if (filters.eventType === 'upcoming') {
          queryConstraints.push(where('eventDate', '>', now));
        } else if (filters.eventType === 'current') {
          queryConstraints.push(where('eventDate', '<=', now));
        }
        
        if (filters.timeFilter) {
          // Time filter logic is applied after retrieval in the code below
          // since Firestore cannot do complex time range calculations in a query
        }
      }
      
      // Add ordering by date
      queryConstraints.push(orderBy('eventDate', 'desc'));
      
      const incidentsQuery = query(queryRef, ...queryConstraints);
      const querySnapshot = await getDocs(incidentsQuery);
      
      let incidents = [];
      querySnapshot.forEach(doc => {
        incidents.push(new Incident(doc.data()));
      });
      
      // Apply time filtering if needed
      if (filters.timeFilter) {
        const now = Timestamp.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;
        
        incidents = incidents.filter(incident => {
          const eventDate = incident.eventDate.toDate();
          const diff = Math.abs(now.toDate() - eventDate);
          
          if (filters.timeFilter === '1day') {
            return diff <= oneDay;
          } else if (filters.timeFilter === '1week') {
            return diff <= oneWeek;
          } else if (filters.timeFilter === '1month') {
            return diff <= oneMonth;
          }
          
          return true;
        });
      }
      
      return incidents;
    } catch (error) {
      console.error('Error getting incidents:', error);
      return [];
    }
  }
  
  static async findById(id) {
    try {
      const docRef = doc(db, 'incidents', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return new Incident(docSnap.data());
      }
      
      return null;
    } catch (error) {
      console.error('Error finding incident by ID:', error);
      return null;
    }
  }
  
  static async deleteById(id) {
    try {
      await deleteDoc(doc(db, 'incidents', id));
      return true;
    } catch (error) {
      console.error('Error deleting incident:', error);
      return false;
    }
  }
}

module.exports = Incident; 