const passport = require('passport');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Only use Google login if we have credentials
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.APP_URL + '/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if a user with the same email exists
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              if (!user.avatar && profile.photos && profile.photos[0]) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
              return done(null, user);
            }
          }

          // Create a new user
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: email,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });

          await newUser.save();
          return done(null, newUser);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.log('Google OAuth credentials not found. Google authentication will not be available.');
}

module.exports = passport; 