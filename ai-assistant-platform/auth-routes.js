const express = require('express');
const nodemailer = require('nodemailer');

// Email setup (use console if not configured)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: {
        user: process.env.EMAIL_USER || 'test@test.com',
        pass: process.env.EMAIL_PASS || 'test'
    }
});

function createAuthRoutes(db) {
    const router = express.Router();

    // Register
    router.post('/register', async (req, res) => {
        try {
            const { email, password, name } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            // Create user
            const user = await db.createUser(email, password, name || email.split('@')[0]);

            // Log them in
            req.session.userId = user.id;
            req.session.save();

            res.json({ 
                success: true, 
                user: { id: user.id, email: user.email, name: user.name }
            });

        } catch (error) {
            if (error.message === 'Email already exists') {
                res.status(400).json({ error: 'Email already registered' });
            } else {
                console.error('Registration error:', error);
                res.status(500).json({ error: 'Registration failed' });
            }
        }
    });

    // Login
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            const user = await db.verifyPassword(email, password);

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Create session
            req.session.userId = user.id;
            req.session.save();

            res.json({ 
                success: true, 
                user: { id: user.id, email: user.email, name: user.name }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Logout
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.json({ success: true });
        });
    });

    // Request password reset
    router.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email required' });
            }

            const token = await db.createResetToken(email);
            const resetUrl = `http://localhost:${process.env.PORT || 3000}/reset-password.html?token=${token}`;

            // Try to send email
            if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'test@test.com') {
                await transporter.sendMail({
                    from: '"AI Assistant Platform" <noreply@example.com>',
                    to: email,
                    subject: 'Password Reset Request',
                    html: `
                        <h2>Password Reset</h2>
                        <p>You requested a password reset. Click the link below to reset your password:</p>
                        <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                        <p>Or copy this link: ${resetUrl}</p>
                        <p>This link expires in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    `
                });
                res.json({ success: true, message: 'Check your email for reset link' });
            } else {
                // Log to console for development
                console.log('\n' + '='.repeat(60));
                console.log('🔑 PASSWORD RESET LINK:');
                console.log(resetUrl);
                console.log('='.repeat(60) + '\n');
                
                res.json({ 
                    success: true, 
                    message: 'Check console for reset link (email not configured)',
                    debug: true,
                    resetUrl // Only in development!
                });
            }

        } catch (error) {
            if (error.message === 'Email not found') {
                // Don't reveal if email exists
                res.json({ success: true, message: 'If email exists, reset link sent' });
            } else {
                console.error('Password reset error:', error);
                res.status(500).json({ error: 'Failed to process request' });
            }
        }
    });

    // Reset password with token
    router.post('/reset-password', async (req, res) => {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).json({ error: 'Token and password required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            await db.resetPassword(token, password);
            res.json({ success: true, message: 'Password reset successfully' });

        } catch (error) {
            if (error.message === 'Invalid or expired token') {
                res.status(400).json({ error: 'Invalid or expired reset link' });
            } else {
                console.error('Reset error:', error);
                res.status(500).json({ error: 'Failed to reset password' });
            }
        }
    });

    return router;
}

module.exports = createAuthRoutes;