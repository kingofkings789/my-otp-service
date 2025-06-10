const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Your phone settings (we'll change these later)
const SMS_GATEWAY_URL = 'https://your-phone-url.ngrok.io';
const SMS_PASSWORD = 'mypassword123';
const PORT = process.env.PORT || 3000;

// Store OTPs temporarily
const otpStore = new Map();

// Make random 6-digit number
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Home page - shows service is working
app.get('/', (req, res) => {
    res.json({
        message: '🎉 OTP Service is Running!',
        howTo: {
            sendOTP: 'POST /send-otp with {"phone": "+1234567890"}',
            verifyOTP: 'POST /verify-otp with {"phone": "+1234567890", "otp": "123456"}'
        }
    });
});

// Send OTP to phone number
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide phone number' 
            });
        }

        // Make random code
        const otp = generateOTP();
        
        // Remember this code for 5 minutes
        otpStore.set(phone, {
            code: otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        // Message to send
        const message = `Your verification code is: ${otp}. Valid for 5 minutes. Keep it secret! 🔐`;

        // Ask your phone to send SMS
        const smsResponse = await axios.post(`${SMS_GATEWAY_URL}/message`, {
            phone: phone,
            message: message
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SMS_PASSWORD}`
            }
        });

        console.log(`✅ OTP sent to ${phone}: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent successfully! 📱',
            phone: phone
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to send OTP. Check your phone connection! 📱'
        });
    }
});

// Check if OTP is correct
app.post('/verify-otp', (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ 
                success: false, 
                error: 'Need both phone number and OTP code' 
            });
        }

        const storedOTP = otpStore.get(phone);

        if (!storedOTP) {
            return res.status(400).json({ 
                success: false, 
                error: 'No OTP found. Please request a new one! 🔄' 
            });
        }

        // Check if code expired (older than 5 minutes)
        if (Date.now() > storedOTP.expires) {
            otpStore.delete(phone);
            return res.status(400).json({ 
                success: false, 
                error: 'OTP expired! Please get a new one ⏰' 
            });
        }

        // Check if code matches
        if (storedOTP.code !== otp) {
            return res.status(400).json({ 
                success: false, 
                error: 'Wrong OTP code! Try again 🔢' 
            });
        }

        // Success! Remove the used code
        otpStore.delete(phone);
        console.log(`✅ OTP verified for: ${phone}`);

        res.json({
            success: true,
            message: 'OTP verified! You are authenticated! 🎉',
            phone: phone
        });

    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Something went wrong during verification' 
        });
    }
});

// Start the service
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OTP Service running on port ${PORT}`);
    console.log(`📱 Phone URL: ${SMS_GATEWAY_URL}`);
    console.log(`🌍 Ready to send OTPs!`);
});
