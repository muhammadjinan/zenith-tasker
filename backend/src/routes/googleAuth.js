const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const router = express.Router();

// Only configure Google OAuth if credentials are provided
const googleEnabled = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (googleEnabled) {
    // Configure Passport with Google Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const profilePic = profile.photos?.[0]?.value;
                const googleId = profile.id;

                if (!email) {
                    return done(new Error('No email found in Google profile'), null);
                }

                // 1. Check if user exists by Google ID
                let user = await userModel.findUserByGoogleId(googleId);
                if (user) {
                    return done(null, user);
                }

                // 2. Check if user exists by Email (Link account)
                user = await userModel.findUserByEmail(email);
                if (user) {
                    user = await userModel.linkGoogleAccount(user.id, googleId, profilePic);
                    return done(null, user);
                }

                // 3. New User -> Return special object to trigger Signup Flow
                return done(null, {
                    isNew: true,
                    profile: {
                        email,
                        googleId,
                        name,
                        profilePic
                    }
                });

            } catch (err) {
                return done(err, null);
            }
        }));

    // Route to start Google OAuth
    router.get('/google', passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account', // Force account selection
        session: false
    }));

    // Callback route after Google auth
    router.get('/google/callback',
        (req, res, next) => {
            passport.authenticate('google', { session: false }, (err, user, info) => {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

                if (err) {
                    console.error('Google OAuth error:', err);
                    return res.redirect(`${frontendUrl}/login?error=google_auth_error`);
                }
                if (!user) {
                    console.error('Google OAuth failed - no user:', info);
                    return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
                }

                // --- Handle New User Signup Flow ---
                if (user.isNew) {
                    console.log('New Google User - Redirecting to Signup');
                    // Create a temporary token containing the profile info
                    const signupToken = jwt.sign(
                        user.profile,
                        process.env.JWT_SECRET,
                        { expiresIn: '15m' } // 15 minutes to complete signup
                    );
                    return res.redirect(`${frontendUrl}/signup?google_signup=${signupToken}`);
                }

                // --- Handle Existing User Login Flow ---
                console.log('Google OAuth success for user:', user.username);

                // Generate JWT token for the authenticated user
                const token = jwt.sign(
                    { user_id: user.id, username: user.username },
                    process.env.JWT_SECRET,
                    { expiresIn: '2h' }
                );

                res.redirect(`${frontendUrl}/login?token=${token}`);
            })(req, res, next);
        }
    );
} else {
    // Google OAuth not configured - return error
    router.get('/google', (req, res) => {
        res.status(503).json({ error: 'Google Sign-In is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    });

    router.get('/google/callback', (req, res) => {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_not_configured`);
    });

    console.log('⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

module.exports = router;

