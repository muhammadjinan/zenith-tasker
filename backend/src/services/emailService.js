const nodemailer = require('nodemailer');

// Create transporter with environment variables
const createTransporter = () => {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('SMTP not configured. Email functionality disabled.');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const transporter = createTransporter();

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordResetEmail = async (email, resetLink) => {
    if (!transporter) {
        console.error('Cannot send email: SMTP not configured');
        return false;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Zenith Tasker - Password Reset',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Password Reset Request</h2>
                    <p>You requested a password reset for your Zenith Tasker account.</p>
                    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #3b82f6, #6366f1); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                        Reset Password
                    </a>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Zenith Tasker - Your Productivity Partner
                    </p>
                </div>
            `,
            text: `Password Reset Request\n\nYou requested a password reset. Click this link to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
        });
        return true;
    } catch (err) {
        console.error('Failed to send email:', err);
        return false;
    }
};

/**
 * Check if email service is configured
 * @returns {boolean}
 */
const isEmailConfigured = () => {
    return transporter !== null;
};

module.exports = {
    sendPasswordResetEmail,
    isEmailConfigured,
};
