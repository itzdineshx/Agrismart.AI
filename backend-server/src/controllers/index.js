const { User, Product, Order, Delivery, Cart, Wishlist, Review, Category, Notification, Payment, BlockchainTransaction, Refund, PaymentMethod, Escrow } = require('../models/index');
const { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, generateResetToken } = require('../utils/auth');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto-js');
const paymentWorkflow = require('../utils/paymentWorkflow');
const blockchainService = require('../utils/blockchain');
const AdvancedForecastingService = require('../utils/advancedForecastingService');

// Initialize Razorpay
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// Weather Controllers
const getCurrentWeather = async (req, res) => {
    try {
        const { lat, lon, city } = req.query;

        // Mock weather data
        const mockWeather = {
            location: {
                name: city || 'Delhi',
                region: 'Delhi',
                country: 'India',
                lat: lat || 28.6139,
                lon: lon || 77.2090,
                tz_id: 'Asia/Kolkata',
                localtime_epoch: Math.floor(Date.now() / 1000),
                localtime: new Date().toISOString()
            },
            current: {
                last_updated_epoch: Math.floor(Date.now() / 1000),
                last_updated: new Date().toISOString(),
                temp_c: Math.floor(Math.random() * 15) + 20, // 20-35°C
                temp_f: 0, // Will be calculated
                is_day: new Date().getHours() > 6 && new Date().getHours() < 18 ? 1 : 0,
                condition: {
                    text: 'Sunny',
                    icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
                    code: 1000
                },
                wind_mph: Math.floor(Math.random() * 10) + 5,
                wind_kph: Math.floor(Math.random() * 16) + 8,
                wind_degree: Math.floor(Math.random() * 360),
                wind_dir: 'NE',
                pressure_mb: Math.floor(Math.random() * 20) + 1000,
                pressure_in: 0, // Will be calculated
                precip_mm: Math.random() * 5,
                precip_in: 0, // Will be calculated
                humidity: Math.floor(Math.random() * 30) + 40,
                cloud: Math.floor(Math.random() * 50),
                feelslike_c: Math.floor(Math.random() * 15) + 20,
                feelslike_f: 0, // Will be calculated
                vis_km: Math.floor(Math.random() * 5) + 5,
                vis_miles: 0, // Will be calculated
                uv: Math.floor(Math.random() * 10),
                gust_mph: Math.floor(Math.random() * 15) + 10,
                gust_kph: Math.floor(Math.random() * 24) + 16
            }
        };

        // Calculate derived values
        mockWeather.current.temp_f = Math.round((mockWeather.current.temp_c * 9/5) + 32);
        mockWeather.current.pressure_in = Math.round(mockWeather.current.pressure_mb * 0.02953 * 100) / 100;
        mockWeather.current.precip_in = Math.round(mockWeather.current.precip_mm * 0.03937 * 100) / 100;
        mockWeather.current.feelslike_f = Math.round((mockWeather.current.feelslike_c * 9/5) + 32);
        mockWeather.current.vis_miles = Math.round(mockWeather.current.vis_km * 0.621371 * 100) / 100;

        res.json(mockWeather);
    } catch (error) {
        console.error('Get current weather error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getWeatherForecast = async (req, res) => {
    try {
        const { lat, lon, city, days = 7 } = req.query;

        // Mock forecast data
        const forecast = {
            location: {
                name: city || 'Delhi',
                region: 'Delhi',
                country: 'India',
                lat: lat || 28.6139,
                lon: lon || 77.2090,
                tz_id: 'Asia/Kolkata',
                localtime_epoch: Math.floor(Date.now() / 1000),
                localtime: new Date().toISOString()
            },
            current: {
                last_updated_epoch: Math.floor(Date.now() / 1000),
                last_updated: new Date().toISOString(),
                temp_c: Math.floor(Math.random() * 15) + 20,
                temp_f: Math.floor(Math.random() * 15) + 68,
                is_day: 1,
                condition: {
                    text: 'Sunny',
                    icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
                    code: 1000
                },
                wind_mph: Math.floor(Math.random() * 10) + 5,
                wind_kph: Math.floor(Math.random() * 16) + 8,
                wind_degree: Math.floor(Math.random() * 360),
                wind_dir: 'NE',
                pressure_mb: Math.floor(Math.random() * 20) + 1000,
                pressure_in: Math.floor(Math.random() * 0.6) + 29.8,
                precip_mm: Math.random() * 5,
                precip_in: Math.random() * 0.2,
                humidity: Math.floor(Math.random() * 30) + 40,
                cloud: Math.floor(Math.random() * 50),
                feelslike_c: Math.floor(Math.random() * 15) + 20,
                feelslike_f: Math.floor(Math.random() * 15) + 68,
                vis_km: Math.floor(Math.random() * 5) + 5,
                vis_miles: Math.floor(Math.random() * 3) + 3,
                uv: Math.floor(Math.random() * 10),
                gust_mph: Math.floor(Math.random() * 15) + 10,
                gust_kph: Math.floor(Math.random() * 24) + 16
            },
            forecast: {
                forecastday: []
            }
        };

        // Generate forecast days
        for (let i = 0; i < parseInt(days); i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            const dayData = {
                date: date.toISOString().split('T')[0],
                date_epoch: Math.floor(date.getTime() / 1000),
                day: {
                    maxtemp_c: Math.floor(Math.random() * 10) + 25,
                    maxtemp_f: Math.floor(Math.random() * 18) + 77,
                    mintemp_c: Math.floor(Math.random() * 10) + 15,
                    mintemp_f: Math.floor(Math.random() * 18) + 59,
                    avgtemp_c: Math.floor(Math.random() * 10) + 20,
                    avgtemp_f: Math.floor(Math.random() * 18) + 68,
                    maxwind_mph: Math.floor(Math.random() * 15) + 10,
                    maxwind_kph: Math.floor(Math.random() * 24) + 16,
                    totalprecip_mm: Math.random() * 10,
                    totalprecip_in: Math.random() * 0.4,
                    totalsnow_cm: 0,
                    avgvis_km: Math.floor(Math.random() * 5) + 5,
                    avgvis_miles: Math.floor(Math.random() * 3) + 3,
                    avghumidity: Math.floor(Math.random() * 30) + 40,
                    daily_will_it_rain: Math.random() > 0.7 ? 1 : 0,
                    daily_chance_of_rain: Math.floor(Math.random() * 100),
                    daily_will_it_snow: 0,
                    daily_chance_of_snow: 0,
                    condition: {
                        text: Math.random() > 0.7 ? 'Partly cloudy' : 'Sunny',
                        icon: Math.random() > 0.7 ? '//cdn.weatherapi.com/weather/64x64/day/116.png' : '//cdn.weatherapi.com/weather/64x64/day/113.png',
                        code: Math.random() > 0.7 ? 1003 : 1000
                    },
                    uv: Math.floor(Math.random() * 10)
                },
                astro: {
                    sunrise: '06:30 AM',
                    sunset: '06:30 PM',
                    moonrise: '08:45 PM',
                    moonset: '08:30 AM',
                    moon_phase: 'Waning Gibbous',
                    moon_illumination: '78',
                    is_moon_up: 0,
                    is_sun_up: 1
                },
                hour: [] // Would contain hourly data
            };

            forecast.forecast.forecastday.push(dayData);
        }

        res.json(forecast);
    } catch (error) {
        console.error('Get weather forecast error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getWeatherHistory = async (req, res) => {
    try {
        const { lat, lon, city, date } = req.query;

        // Mock historical weather data
        const history = {
            location: {
                name: city || 'Delhi',
                region: 'Delhi',
                country: 'India',
                lat: lat || 28.6139,
                lon: lon || 77.2090,
                tz_id: 'Asia/Kolkata',
                localtime_epoch: Math.floor(Date.now() / 1000),
                localtime: new Date().toISOString()
            },
            forecast: {
                forecastday: [{
                    date: date || new Date().toISOString().split('T')[0],
                    date_epoch: Math.floor(Date.now() / 1000),
                    day: {
                        maxtemp_c: Math.floor(Math.random() * 10) + 25,
                        maxtemp_f: Math.floor(Math.random() * 18) + 77,
                        mintemp_c: Math.floor(Math.random() * 10) + 15,
                        mintemp_f: Math.floor(Math.random() * 18) + 59,
                        avgtemp_c: Math.floor(Math.random() * 10) + 20,
                        avgtemp_f: Math.floor(Math.random() * 18) + 68,
                        maxwind_mph: Math.floor(Math.random() * 15) + 10,
                        maxwind_kph: Math.floor(Math.random() * 24) + 16,
                        totalprecip_mm: Math.random() * 10,
                        totalprecip_in: Math.random() * 0.4,
                        totalsnow_cm: 0,
                        avgvis_km: Math.floor(Math.random() * 5) + 5,
                        avgvis_miles: Math.floor(Math.random() * 3) + 3,
                        avghumidity: Math.floor(Math.random() * 30) + 40,
                        daily_will_it_rain: Math.random() > 0.7 ? 1 : 0,
                        daily_chance_of_rain: Math.floor(Math.random() * 100),
                        daily_will_it_snow: 0,
                        daily_chance_of_snow: 0,
                        condition: {
                            text: Math.random() > 0.7 ? 'Partly cloudy' : 'Sunny',
                            icon: Math.random() > 0.7 ? '//cdn.weatherapi.com/weather/64x64/day/116.png' : '//cdn.weatherapi.com/weather/64x64/day/113.png',
                            code: Math.random() > 0.7 ? 1003 : 1000
                        },
                        uv: Math.floor(Math.random() * 10)
                    },
                    astro: {
                        sunrise: '06:30 AM',
                        sunset: '06:30 PM',
                        moonrise: '08:45 PM',
                        moonset: '08:30 AM',
                        moon_phase: 'Waning Gibbous',
                        moon_illumination: '78',
                        is_moon_up: 0,
                        is_sun_up: 1
                    },
                    hour: [] // Historical hourly data would go here
                }]
            }
        };

        res.json(history);
    } catch (error) {
        console.error('Get weather history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getWeatherAlerts = async (req, res) => {
    try {
        const { lat, lon, city } = req.query;

        // Mock weather alerts
        const alerts = {
            alerts: {
                alert: [
                    {
                        headline: 'Heavy Rain Warning',
                        msgtype: 'Alert',
                        severity: 'Moderate',
                        urgency: 'Immediate',
                        areas: city || 'Delhi',
                        category: 'Met',
                        certainty: 'Likely',
                        event: 'Heavy Rain',
                        note: 'Heavy rainfall expected in the next 24 hours',
                        effective: new Date().toISOString(),
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        desc: 'Heavy rainfall with possible flooding in low-lying areas',
                        instruction: 'Avoid travel in affected areas and stay indoors'
                    }
                ]
            }
        };

        res.json(alerts);
    } catch (error) {
        console.error('Get weather alerts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const subscribeWeatherAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        const { location, alertTypes } = req.body;

        // Mock subscription
        const subscription = {
            userId,
            location,
            alertTypes: alertTypes || ['rain', 'storm', 'heat'],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            message: 'Weather alert subscription created successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscribe weather alerts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const unsubscribeWeatherAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        const { subscriptionId } = req.params;

        // Mock unsubscription
        res.json({ message: 'Weather alert subscription cancelled successfully' });
    } catch (error) {
        console.error('Unsubscribe weather alerts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, role = 'buyer', farmerProfile, buyerProfile } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Validate role
        if (!['admin', 'farmer', 'buyer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be admin, farmer, or buyer' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user object
        const userData = {
            name,
            email,
            password: hashedPassword,
            role
        };

        // Add role-specific profile data
        if (role === 'farmer' && farmerProfile) {
            userData.farmerProfile = farmerProfile;
        } else if (role === 'buyer' && buyerProfile) {
            userData.buyerProfile = buyerProfile;
        }

        // Create user in database
        const user = new User(userData);
        await user.save();

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Return user data (exclude password)
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            farmerProfile: user.farmerProfile,
            buyerProfile: user.buyerProfile,
            avatar: user.avatar,
            preferences: user.preferences,
            createdAt: user.createdAt
        };

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Return user data (exclude password)
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            farmerProfile: user.farmerProfile,
            buyerProfile: user.buyerProfile,
            avatar: user.avatar,
            preferences: user.preferences,
            lastLogin: user.lastLogin
        };

        res.json({
            message: 'Login successful',
            user: userResponse,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

const demoLogin = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Demo credentials
        const demoCredentials = {
            admin: { username: 'admin_agri', password: 'AgriAdmin@2024' },
            buyer: { username: 'buyer_pro', password: 'BuyPro@2024' },
            farmer: { username: 'farmer_user', password: 'FarmUser@2024' }
        };

        const roleCredentials = demoCredentials[role];
        if (!roleCredentials || username !== roleCredentials.username || password !== roleCredentials.password) {
            return res.status(401).json({ message: 'Invalid demo credentials' });
        }

        // Create demo user object
        const demoUser = {
            _id: `demo_${role}_${Date.now()}`,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
            email: `${role}@demo.agri`,
            role: role,
            preferences: {
                theme: 'light',
                language: 'en',
                notifications: {
                    email: true,
                    push: true,
                    weather: true,
                    market: true
                }
            },
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        // Generate real JWT tokens for demo user
        const accessToken = generateAccessToken(demoUser._id);
        const refreshToken = generateRefreshToken(demoUser._id);

        res.json({
            message: 'Demo login successful',
            user: demoUser,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Demo login error:', error);
        res.status(500).json({ message: 'Server error during demo login' });
    }
};

const logout = async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // You might want to implement token blacklisting for enhanced security
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(401).json({ message: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Generate new tokens
        const accessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.json({
            accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ message: 'Invalid refresh token' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = req.user;
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            farmerProfile: user.farmerProfile,
            buyerProfile: user.buyerProfile,
            avatar: user.avatar,
            preferences: user.preferences,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };

        res.json({ user: userResponse });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // TODO: Send email with reset link
        // For now, just return the token (in production, send via email)
        res.json({
            message: 'If the email exists, a reset link has been sent',
            resetToken // Remove this in production
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Role-based access controllers
const getRoles = async (req, res) => {
    try {
        const roles = ['admin', 'seller', 'user'];
        res.json({ roles });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const assignRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!['admin', 'seller', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json({ message: 'Role assigned successfully', user: { _id: user._id, role: user.role } });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserRole = async (req, res) => {
    try {
        const user = req.user;
        res.json({ role: user.role });
    } catch (error) {
        console.error('Get user role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User management controllers
const getProfile = async (req, res) => {
    try {
        const user = req.user;
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            preferences: user.preferences,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };

        res.json({ user: userResponse });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email } = req.body;
        const user = req.user;

        // Check if email is being changed and if it's already taken
        if (email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            preferences: user.preferences
        };

        res.json({ message: 'Profile updated successfully', user: userResponse });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        // TODO: Implement file upload logic
        // For now, just accept a URL
        const { avatarUrl } = req.body;
        const user = req.user;

        user.avatar = avatarUrl;
        await user.save();

        res.json({ message: 'Avatar updated successfully', avatar: user.avatar });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteAvatar = async (req, res) => {
    try {
        const user = req.user;
        user.avatar = null;
        await user.save();

        res.json({ message: 'Avatar deleted successfully' });
    } catch (error) {
        console.error('Delete avatar error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        const user = req.user;

        user.preferences = { ...user.preferences, ...preferences };
        await user.save();

        res.json({ message: 'Preferences updated successfully', preferences: user.preferences });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Weather Controllers
const getMarketPrices = async (req, res) => {
    try {
        const { commodity, state, district, limit = 50 } = req.query;

        // Mock market price data
        const commodities = ['wheat', 'rice', 'maize', 'cotton', 'sugarcane', 'potato', 'tomato', 'onion'];
        const states = ['Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Rajasthan', 'Maharashtra'];

        const mockPrices = [];
        for (let i = 0; i < parseInt(limit); i++) {
            const selectedCommodity = commodity || commodities[Math.floor(Math.random() * commodities.length)];
            const selectedState = state || states[Math.floor(Math.random() * states.length)];

            mockPrices.push({
                commodity: selectedCommodity,
                market: {
                    name: `${selectedState} Mandi ${i + 1}`,
                    city: selectedState,
                    state: selectedState,
                    mandiId: `MANDI${String(i + 1).padStart(3, '0')}`
                },
                price: {
                    min: Math.floor(Math.random() * 1000) + 500,
                    max: Math.floor(Math.random() * 1000) + 1500,
                    modal: Math.floor(Math.random() * 1000) + 1000,
                    unit: '₹/quintal'
                },
                date: new Date(),
                lastUpdated: new Date(),
                source: 'data.gov.in'
            });
        }

        res.json({ prices: mockPrices, total: mockPrices.length });
    } catch (error) {
        console.error('Get market prices error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMarketPricesByCommodity = async (req, res) => {
    try {
        const { commodity } = req.params;
        const { state, limit = 20 } = req.query;

        // Mock data for specific commodity
        const mockPrices = [];
        for (let i = 0; i < parseInt(limit); i++) {
            mockPrices.push({
                commodity,
                market: {
                    name: `Market ${i + 1}`,
                    city: `City ${i + 1}`,
                    state: state || 'Delhi',
                    mandiId: `MANDI${String(i + 1).padStart(3, '0')}`
                },
                price: {
                    min: Math.floor(Math.random() * 500) + 800,
                    max: Math.floor(Math.random() * 500) + 1300,
                    modal: Math.floor(Math.random() * 500) + 1000,
                    unit: '₹/quintal'
                },
                date: new Date(),
                lastUpdated: new Date(),
                source: 'data.gov.in'
            });
        }

        res.json({ commodity, prices: mockPrices });
    } catch (error) {
        console.error('Get market prices by commodity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMarketPriceHistory = async (req, res) => {
    try {
        const { commodity } = req.params;
        const { days = 30 } = req.query;

        // Mock historical data
        const history = [];
        const baseDate = new Date();

        for (let i = parseInt(days); i >= 0; i--) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() - i);

            history.push({
                date,
                commodity,
                price: {
                    min: Math.floor(Math.random() * 300) + 700,
                    max: Math.floor(Math.random() * 300) + 1200,
                    modal: Math.floor(Math.random() * 300) + 900,
                    unit: '₹/quintal'
                },
                volume: Math.floor(Math.random() * 1000) + 100,
                market: 'Delhi Mandi'
            });
        }

        res.json({ commodity, history });
    } catch (error) {
        console.error('Get market price history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMarketTrends = async (req, res) => {
    try {
        const { commodity, period = 'weekly' } = req.query;

        // Mock trend data
        const commodities = commodity ? [commodity] : ['wheat', 'rice', 'maize', 'cotton'];
        const trends = [];

        commodities.forEach(comm => {
            const direction = Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable';
            const percentage = direction === 'stable' ? 0 : Math.random() * 20;

            trends.push({
                commodity: comm,
                period,
                trend: {
                    direction,
                    percentage: Math.round(percentage * 100) / 100,
                    priceChange: direction === 'up' ? Math.round(Math.random() * 200) :
                               direction === 'down' ? -Math.round(Math.random() * 200) : 0
                },
                data: [], // Would contain historical data points
                lastUpdated: new Date(),
                source: 'data.gov.in'
            });
        });

        res.json({ trends });
    } catch (error) {
        console.error('Get market trends error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMarketAnalysis = async (req, res) => {
    try {
        const { commodity } = req.query;

        // API configuration - use environment variable
        const API_KEY = process.env.MARKET_API_KEY || '579b464db66ec23bdd00000155389df796544a8c7e34f05e167005a7';
        const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

        // Fetch recent data from the API
        const fetchMarketData = (commodityFilter = '') => {
            return new Promise((resolve, reject) => {
                try {
                    const params = new URLSearchParams({
                        'api-key': API_KEY,
                        'format': 'json',
                        'limit': '1000', // Get more data for analysis
                        'offset': '0',
                        'sort[Arrival_Date]': 'desc', // Get most recent data first
                    });

                    if (commodityFilter) {
                        params.append('filters[Commodity]', commodityFilter);
                    }

                    const url = `${BASE_URL}?${params.toString()}`;
                    console.log('Fetching from URL:', url);

                    const https = require('https');
                    https.get(url, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'AgriSmart-Backend/1.0',
                        },
                        timeout: 30000,
                    }, (response) => {
                        let data = '';

                        response.on('data', (chunk) => {
                            data += chunk;
                        });

                        response.on('end', () => {
                            try {
                                if (response.statusCode === 200) {
                                    const result = JSON.parse(data);
                                    if (result.records && Array.isArray(result.records)) {
                                        resolve(result.records);
                                    } else {
                                        console.warn('Invalid API response format:', result);
                                        resolve(null);
                                    }
                                } else {
                                    console.error(`API returned status ${response.statusCode}:`, data);
                                    resolve(null);
                                }
                            } catch (parseError) {
                                console.error('Error parsing API response:', parseError);
                                resolve(null);
                            }
                        });
                    }).on('error', (error) => {
                        console.error('HTTPS request error:', error);
                        resolve(null);
                    }).on('timeout', () => {
                        console.error('API request timed out');
                        reject(new Error('Request timeout'));
                    });
                } catch (error) {
                    console.error('Error in fetchMarketData:', error);
                    resolve(null);
                }
            });
        };

        // Analyze price data
        const analyzePriceData = (records, targetCommodity) => {
            if (!records || records.length === 0) {
                return null;
            }

            // Filter for the target commodity if specified
            let commodityRecords = records;
            if (targetCommodity) {
                commodityRecords = records.filter(record =>
                    record.Commodity && record.Commodity.toLowerCase().includes(targetCommodity.toLowerCase())
                );
            }

            if (commodityRecords.length === 0) {
                // If no records for specific commodity, use general data
                commodityRecords = records.slice(0, 100);
            }

            // Sort by date (most recent first)
            commodityRecords.sort((a, b) => {
                const dateA = new Date(a.Arrival_Date.split('/').reverse().join('-'));
                const dateB = new Date(b.Arrival_Date.split('/').reverse().join('-'));
                return dateB - dateA;
            });

            // Get current price (most recent modal price)
            const currentRecord = commodityRecords[0];
            const currentPrice = parseFloat(currentRecord?.Modal_Price) || 0;

            // Calculate price changes
            const prices = commodityRecords
                .filter(record => record.Modal_Price)
                .map(record => ({
                    price: parseFloat(record.Modal_Price),
                    date: new Date(record.Arrival_Date.split('/').reverse().join('-'))
                }))
                .filter(item => !isNaN(item.price) && item.price > 0)
                .slice(0, 30); // Use last 30 records for analysis

            if (prices.length < 2) {
                return {
                    currentPrice: currentPrice,
                    priceChange24h: 0,
                    priceChange7d: 0,
                    volatility: 0,
                    trend: 'stable'
                };
            }

            // Calculate 24h change (compare with previous day)
            const priceChange24h = prices.length >= 2 ? prices[0].price - prices[1].price : 0;

            // Calculate 7-day change
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentPrices = prices.filter(p => p.date >= sevenDaysAgo);
            const priceChange7d = recentPrices.length >= 2 ?
                recentPrices[0].price - recentPrices[recentPrices.length - 1].price : 0;

            // Calculate volatility (standard deviation of price changes)
            const priceChanges = [];
            for (let i = 1; i < prices.length; i++) {
                priceChanges.push(prices[i-1].price - prices[i].price);
            }
            const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
            const variance = priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length;
            const volatility = Math.sqrt(variance);

            // Determine trend
            const recentTrend = priceChange7d > 50 ? 'bullish' : priceChange7d < -50 ? 'bearish' : 'stable';

            return {
                currentPrice: currentPrice,
                priceChange24h: Math.round(priceChange24h * 100) / 100,
                priceChange7d: Math.round(priceChange7d * 100) / 100,
                volatility: Math.round(volatility * 100) / 100,
                trend: recentTrend
            };
        };

        // Generate insights based on data
        const generateInsights = (analysis, records, commodity) => {
            const insights = [];
            const recommendations = [];

            if (!analysis) {
                insights.push('Market data is currently unavailable');
                recommendations.push('Please check back later for updated market information');
                return { insights, recommendations };
            }

            // Price trend insights
            if (analysis.trend === 'bullish') {
                insights.push(`Prices for ${commodity || 'commodities'} are trending upward`);
                insights.push('Strong demand is driving price increases');
                recommendations.push('Consider holding inventory if possible');
                recommendations.push('Monitor price movements closely for optimal selling timing');
            } else if (analysis.trend === 'bearish') {
                insights.push(`Prices for ${commodity || 'commodities'} are trending downward`);
                insights.push('Market saturation or oversupply may be affecting prices');
                recommendations.push('Consider selling soon to avoid further price drops');
                recommendations.push('Explore alternative markets or storage options');
            } else {
                insights.push(`Prices for ${commodity || 'commodities'} are relatively stable`);
                insights.push('Market conditions appear balanced');
                recommendations.push('Monitor for upcoming seasonal changes');
                recommendations.push('Consider long-term storage if prices are favorable');
            }

            // Volatility insights
            if (analysis.volatility > 200) {
                insights.push('High price volatility detected in the market');
                recommendations.push('Use price alerts to monitor sudden changes');
                recommendations.push('Consider hedging strategies to manage risk');
            } else if (analysis.volatility < 50) {
                insights.push('Market prices are relatively stable');
                recommendations.push('Good time for planned transactions');
            }

            // Recent price changes
            if (Math.abs(analysis.priceChange24h) > 100) {
                insights.push(`Significant 24-hour price movement: ₹${analysis.priceChange24h > 0 ? '+' : ''}${analysis.priceChange24h}`);
            }

            if (Math.abs(analysis.priceChange7d) > 200) {
                insights.push(`Notable 7-day price trend: ₹${analysis.priceChange7d > 0 ? '+' : ''}${analysis.priceChange7d}`);
            }

            // Data freshness
            if (records && records.length > 0) {
                const latestDate = new Date(records[0].Arrival_Date.split('/').reverse().join('-'));
                const daysSinceUpdate = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
                if (daysSinceUpdate > 7) {
                    insights.push(`Market data is ${daysSinceUpdate} days old`);
                    recommendations.push('Data may not reflect current market conditions');
                }
            }

            return { insights, recommendations };
        };

        // Fetch data for the specified commodity or general market data
        const records = await fetchMarketData(commodity);

        if (!records || records.length === 0) {
            // Fallback to mock data if API fails
            console.warn('API fetch failed, using fallback mock data');
            const analysis = {
                commodity: commodity || 'wheat',
                summary: {
                    currentPrice: 1200,
                    priceChange24h: Math.random() > 0.5 ? Math.random() * 100 : -Math.random() * 100,
                    priceChange7d: Math.random() > 0.5 ? Math.random() * 300 : -Math.random() * 300,
                    volatility: Math.random() * 20,
                    trend: Math.random() > 0.5 ? 'bullish' : 'bearish'
                },
                insights: [
                    'Prices are expected to rise due to increased demand',
                    'Weather conditions are favorable for the upcoming harvest',
                    'Supply chain disruptions may affect availability'
                ],
                recommendations: [
                    'Consider selling if prices reach target levels',
                    'Monitor weather updates for harvest predictions',
                    'Diversify storage locations to minimize risk'
                ],
                lastUpdated: new Date()
            };
            return res.json({ analysis });
        }

        // Analyze the data
        const summary = analyzePriceData(records, commodity);
        const { insights, recommendations } = generateInsights(summary, records, commodity);

        // Determine commodity name
        let commodityName = commodity || 'General Market';
        if (records.length > 0 && records[0].Commodity) {
            commodityName = records[0].Commodity;
        }

        const analysis = {
            commodity: commodityName,
            summary: summary,
            insights: insights,
            recommendations: recommendations,
            lastUpdated: new Date(),
            dataSource: 'Government of India - Directorate of Marketing and Inspection',
            recordCount: records.length
        };

        res.json({ analysis });
    } catch (error) {
        console.error('Get market analysis error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get mandi prices from data.gov.in API (proxy to avoid CORS issues)
const getMandiPrices = async (req, res) => {
    try {
        const {
            commodity,
            state,
            district,
            date,
            limit = 500,
            offset = 0,
            onlyRecentData = true,
            searchTerm
        } = req.query;

        // API configuration - use environment variable
        const API_KEY = process.env.MARKET_API_KEY || '579b464db66ec23bdd00000155389df796544a8c7e34f05e167005a7';
        const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

        console.log('Backend: Fetching mandi prices with filters:', {
            commodity, state, district, date, limit, offset, onlyRecentData, searchTerm
        });

        // Build API parameters
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': limit.toString(),
            'offset': offset.toString(),
            'sort[Arrival_Date]': 'desc',
        });

        // Add filters if provided
        if (state) {
            params.append('filters[State]', state);
        }
        if (district) {
            params.append('filters[District]', district);
        }
        if (commodity) {
            params.append('filters[Commodity]', commodity);
        }
        if (date) {
            // Convert YYYY-MM-DD to DD-MM-YYYY format for API
            const dateParts = date.split('-');
            if (dateParts.length === 3) {
                const apiDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                params.append('filters[Arrival_Date]', apiDate);
            }
        }

        const url = `${BASE_URL}?${params.toString()}`;
        console.log('Backend: API Request URL:', url);

        // Make the API request using https module
        const https = require('https');

        const response = await new Promise((resolve, reject) => {
            const request = https.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'AgriSmart-Backend/1.0',
                },
                timeout: 30000,
            }, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (parseError) {
                            reject(new Error(`Failed to parse API response: ${parseError.message}`));
                        }
                    } else {
                        reject(new Error(`API returned status ${response.statusCode}: ${data}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('API request timed out'));
            });
        });

        console.log('Backend: API Response received');

        // Check if we got valid data
        if (response.status === 'error') {
            throw new Error(`API Error: ${response.message || JSON.stringify(response)}`);
        }

        if (response.records && Array.isArray(response.records)) {
            console.log(`Backend: Successfully fetched ${response.records.length} records`);

            // Transform the data to match frontend expectations
            const transformedData = response.records.map(record => ({
                commodity: record.Commodity || '',
                variety: record.Variety || '',
                min_price: parseFloat(record.Min_Price) || 0,
                max_price: parseFloat(record.Max_Price) || 0,
                modal_price: parseFloat(record.Modal_Price) || 0,
                price_date: record.Arrival_Date || '',
                market: record.Market || '',
                district: record.District || '',
                state: record.State || '',
                arrival_date: record.Arrival_Date || '',
                grade: record.Grade || '',
                min_price_per_kg: parseFloat(record.Min_Price) || 0,
                max_price_per_kg: parseFloat(record.Max_Price) || 0,
                modal_price_per_kg: parseFloat(record.Modal_Price) || 0,
                isLiveData: true
            }));

            // Filter for recent data if requested
            let filteredData = transformedData;
            if (onlyRecentData) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filteredData = transformedData.filter(record => {
                    if (!record.arrival_date) return false;
                    const recordDate = new Date(record.arrival_date.split('/').reverse().join('-'));
                    return recordDate >= sevenDaysAgo;
                });
            }

            // Apply search term filter if provided
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredData = filteredData.filter(record =>
                    record.commodity.toLowerCase().includes(term) ||
                    record.market.toLowerCase().includes(term) ||
                    record.district.toLowerCase().includes(term) ||
                    record.state.toLowerCase().includes(term)
                );
            }

            // Calculate freshness information
            const now = new Date();
            const freshRecords = filteredData.filter(record => {
                if (!record.arrival_date) return false;
                const recordDate = new Date(record.arrival_date.split('/').reverse().join('-'));
                const daysDiff = (now - recordDate) / (1000 * 60 * 60 * 24);
                return daysDiff <= 7;
            });

            const freshness = {
                status: filteredData.length > 0 ? 'success' : 'warning',
                message: filteredData.length > 0 ?
                    `Data from ${freshRecords.length} recent records` :
                    'No recent data available',
                freshness: filteredData.length > 0 ? 'fresh' : 'stale',
                lastUpdate: filteredData.length > 0 ?
                    new Date(filteredData[0].arrival_date.split('/').reverse().join('-')) :
                    null,
                isRealTime: true,
                totalRecords: response.records.length,
                freshRecords: freshRecords.length
            };

            res.json({
                data: filteredData,
                total: filteredData.length,
                fallback: false,
                message: `Successfully fetched ${filteredData.length} mandi price records`,
                freshness
            });

        } else {
            console.warn('Backend: Invalid API response format:', response);
            throw new Error('Invalid API response format');
        }

    } catch (error) {
        console.error('Backend: Get mandi prices error:', error);

        // Return fallback data on error
        const fallbackData = [
            {
                commodity: 'Wheat',
                variety: 'Sharbati',
                min_price: 1800,
                max_price: 2200,
                modal_price: 2000,
                price_date: new Date().toISOString().split('T')[0],
                market: 'Azamgarh',
                district: 'Azamgarh',
                state: 'Uttar Pradesh',
                arrival_date: new Date().toISOString().split('T')[0],
                grade: 'FAQ',
                min_price_per_kg: 18,
                max_price_per_kg: 22,
                modal_price_per_kg: 20,
                isLiveData: false
            },
            {
                commodity: 'Rice',
                variety: 'Basmati',
                min_price: 3200,
                max_price: 3800,
                modal_price: 3500,
                price_date: new Date().toISOString().split('T')[0],
                market: 'Karnal',
                district: 'Karnal',
                state: 'Haryana',
                arrival_date: new Date().toISOString().split('T')[0],
                grade: 'FAQ',
                min_price_per_kg: 32,
                max_price_per_kg: 38,
                modal_price_per_kg: 35,
                isLiveData: false
            },
            {
                commodity: 'Soyabean',
                variety: 'Yellow',
                min_price: 3800,
                max_price: 4200,
                modal_price: 4000,
                price_date: new Date().toISOString().split('T')[0],
                market: 'Indore',
                district: 'Indore',
                state: 'Madhya Pradesh',
                arrival_date: new Date().toISOString().split('T')[0],
                grade: 'FAQ',
                min_price_per_kg: 38,
                max_price_per_kg: 42,
                modal_price_per_kg: 40,
                isLiveData: false
            }
        ];

        res.json({
            data: fallbackData,
            total: fallbackData.length,
            fallback: true,
            message: 'Using fallback data due to API unavailability',
            freshness: {
                status: 'warning',
                message: 'Using fallback data',
                freshness: 'stale',
                lastUpdate: new Date(),
                isRealTime: false,
                totalRecords: fallbackData.length,
                freshRecords: 0
            }
        });
    }
};

const createMarketPriceAlert = async (req, res) => {
    try {
        const userId = req.user._id;
        const { commodity, condition } = req.body;

        // Mock alert creation
        const alert = {
            userId,
            commodity,
            condition,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            message: 'Market price alert created successfully',
            alert
        });
    } catch (error) {
        console.error('Create market price alert error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteMarketPriceAlert = async (req, res) => {
    try {
        const userId = req.user._id;
        const { alertId } = req.params;

        // Mock alert deletion
        res.json({ message: 'Market price alert deleted successfully' });
    } catch (error) {
        console.error('Delete market price alert error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// AI Price Forecasting Controller
const getPriceForecast = async (req, res) => {
    try {
        const {
            commodity,
            state,
            district,
            days = 7,
            algorithm = 'ensemble'
        } = req.query;

        // Map algorithm names (convert snake_case to camelCase for backend compatibility)
        const algorithmMap = {
            'linear_regression': 'arima', // Map deprecated linear_regression to arima
            'random_forest': 'randomForest',
            'svr': 'svr',
            'arima': 'arima',
            'lstm': 'lstm',
            'xgboost': 'xgboost',
            'ensemble': 'ensemble'
        };
        const normalizedAlgorithm = algorithmMap[algorithm] || 'ensemble';

        console.log('Backend: Generating price forecast with params:', {
            commodity, state, district, days, algorithm: normalizedAlgorithm
        });

        // Validate required parameters
        if (!commodity) {
            return res.status(400).json({
                message: 'Commodity parameter is required'
            });
        }

        // First, fetch historical data for the commodity - use environment variable
        const API_KEY = process.env.MARKET_API_KEY || '579b464db66ec23bdd00000155389df796544a8c7e34f05e167005a7';
        const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

        // Build parameters for historical data
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': '1000', // Get more data for better forecasting
            'offset': '0',
            'sort[Arrival_Date]': 'desc',
        });

        // Add filters
        if (state) {
            params.append('filters[State]', state);
        }
        if (district) {
            params.append('filters[District]', district);
        }
        params.append('filters[Commodity]', commodity);

        const url = `${BASE_URL}?${params.toString()}`;

        // Fetch historical data
        const https = require('https');
        const historicalResponse = await new Promise((resolve, reject) => {
            const request = https.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'AgriSmart-Backend/1.0',
                },
                timeout: 30000,
            }, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (parseError) {
                            reject(new Error(`Failed to parse API response: ${parseError.message}`));
                        }
                    } else {
                        reject(new Error(`API returned status ${response.statusCode}: ${data}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('API request timed out'));
            });
        });

        if (!historicalResponse.records || !Array.isArray(historicalResponse.records) || historicalResponse.records.length === 0) {
            return res.status(404).json({
                message: 'Insufficient historical data for forecasting'
            });
        }

        // Transform historical data for forecasting
        const historicalData = historicalResponse.records
            .filter(record => record.Modal_Price && record.Arrival_Date)
            .map(record => ({
                date: record.Arrival_Date,
                price: parseFloat(record.Modal_Price),
                commodity: record.Commodity,
                market: record.Market,
                district: record.District,
                state: record.State
            }))
            .sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));

        if (historicalData.length < 5) {
            return res.status(400).json({
                message: 'Need at least 5 data points for reliable forecasting'
            });
        }

        // Generate forecast using AI algorithms
        const forecastingService = new AdvancedForecastingService();
        const forecast = forecastingService.forecast(historicalData, parseInt(days), normalizedAlgorithm);

        // Get model validation metrics
        const processedData = forecastingService.preprocessData(historicalData);
        const validationMetrics = forecastingService.validateModel(processedData, normalizedAlgorithm);

        // Calculate insights
        const insights = getPriceInsights(historicalData, forecast);

        res.json({
            commodity,
            state,
            district,
            algorithm: normalizedAlgorithm,
            historicalData: historicalData.slice(-30), // Last 30 days for context
            forecast,
            insights,
            validationMetrics,
            generatedAt: new Date().toISOString(),
            dataPoints: historicalData.length
        });

    } catch (error) {
        console.error('Backend: Price forecast error:', error);
        res.status(500).json({
            message: 'Failed to generate price forecast',
            error: error.message
        });
    }
};

// Helper functions for forecasting (simplified versions for backend)
function getPriceInsights(historicalData, forecast) {
    const currentPrice = historicalData[historicalData.length - 1].price;
    const avgPrice = historicalData.reduce((sum, item) => sum + item.price, 0) / historicalData.length;

    const trend = currentPrice > avgPrice ? 'upward' : currentPrice < avgPrice ? 'downward' : 'stable';

    const volatility = calculateVolatility(historicalData);

    const nextDayPrediction = forecast[0]?.predictedPrice || currentPrice;
    const priceChange = ((nextDayPrediction - currentPrice) / currentPrice) * 100;

    return {
        currentPrice: Math.round(currentPrice * 100) / 100,
        averagePrice: Math.round(avgPrice * 100) / 100,
        trend,
        volatility: Math.round(volatility * 100) / 100,
        predictedChangePercent: Math.round(priceChange * 100) / 100,
        confidence: forecast[0]?.confidence || 0.5,
        recommendation: priceChange > 5 ? 'Consider selling soon' :
                       priceChange < -5 ? 'Good time to buy' : 'Monitor prices closely'
    };
}

function calculateVolatility(data) {
    if (data.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < data.length; i++) {
        const return_pct = (data[i].price - data[i-1].price) / data[i-1].price;
        returns.push(return_pct);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
}

// Product Controllers
const getProducts = async (req, res) => {
    try {
        const { category, seller, search, page = 1, limit = 10 } = req.query;

        let query = { isActive: true };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (seller) {
            query.seller = seller;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .populate('seller', 'name email farmerProfile.businessName buyerProfile.businessName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate('seller', 'name email farmerProfile.businessName buyerProfile.businessName');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, price, description, category, image, stock, unit, organic, location, discount } = req.body;

        const product = new Product({
            name,
            price,
            description,
            category,
            image,
            stock,
            unit,
            organic,
            location,
            discount,
            seller: req.user.id
        });

        await product.save();

        const populatedProduct = await Product.findById(product._id)
            .populate('seller', 'name email farmerProfile.businessName buyerProfile.businessName');

        res.status(201).json({ success: true, data: populatedProduct });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Failed to create product' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const product = await Product.findOne({ _id: id, seller: req.user.id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });
        }

        Object.assign(product, updates);
        product.updatedAt = new Date();
        await product.save();

        const populatedProduct = await Product.findById(product._id)
            .populate('seller', 'name email farmerProfile.businessName buyerProfile.businessName');

        res.json({ success: true, data: populatedProduct });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findOneAndDelete({ _id: id, seller: req.user.id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

// Order Controllers
const getOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = {};

        if (userRole === 'farmer') {
            query.seller = userId;
        } else if (userRole === 'buyer') {
            query.buyer = userId;
        }

        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('buyer', 'name email buyerProfile.businessName')
            .populate('seller', 'name email farmerProfile.farmName')
            .populate('items.product', 'name image unit')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = { _id: id };

        if (userRole === 'farmer') {
            query.seller = userId;
        } else if (userRole === 'buyer') {
            query.buyer = userId;
        }

        const order = await Order.findOne(query)
            .populate('buyer', 'name email buyerProfile.businessName buyerProfile.businessType')
            .populate('seller', 'name email farmerProfile.farmName farmerProfile.location')
            .populate('items.product', 'name image unit category');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order' });
    }
};

const createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, notes } = req.body;
        const buyerId = req.user.id;

        // Validate items and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                unit: product.unit,
                total: itemTotal
            });

            // Update product stock
            product.stock -= item.quantity;
            await product.save();
        }

        // Generate tracking ID
        const trackingId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const order = new Order({
            buyer: buyerId,
            seller: orderItems[0].product.seller, // Assuming all items from same seller for now
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod,
            trackingId,
            notes
        });

        await order.save();

        const populatedOrder = await Order.findById(order._id)
            .populate('buyer', 'name email buyerProfile.businessName')
            .populate('seller', 'name email farmerProfile.farmName')
            .populate('items.product', 'name image unit');

        res.status(201).json({ success: true, data: populatedOrder });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, deliveryDate, notes } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = { _id: id };

        if (userRole === 'farmer') {
            query.seller = userId;
        } else if (userRole === 'buyer') {
            query.buyer = userId;
        }

        const order = await Order.findOne(query);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
        }

        // Update order
        order.status = status;
        if (deliveryDate) order.deliveryDate = deliveryDate;
        if (notes) order.notes = notes;
        order.updatedAt = new Date();

        await order.save();

        // If order is delivered, create delivery record
        if (status === 'delivered' && !order.deliveryDate) {
            order.deliveryDate = new Date();
            await order.save();

            // Create delivery record
            const delivery = new Delivery({
                order: order._id,
                status: 'delivered',
                trackingId: order.trackingId,
                deliveryAddress: order.shippingAddress,
                actualDeliveryDate: new Date()
            });
            await delivery.save();
        }

        const populatedOrder = await Order.findById(order._id)
            .populate('buyer', 'name email buyerProfile.businessName')
            .populate('seller', 'name email farmerProfile.farmName')
            .populate('items.product', 'name image unit');

        res.json({ success: true, data: populatedOrder });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = { _id: id };

        if (userRole === 'farmer') {
            query.seller = userId;
        } else if (userRole === 'buyer') {
            query.buyer = userId;
        }

        const order = await Order.findOne(query);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
        }

        if (order.status !== 'pending' && order.status !== 'confirmed') {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
        }

        // Restore product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }

        order.status = 'cancelled';
        order.updatedAt = new Date();
        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};

// Delivery Controllers
const getDeliveries = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        let orderQuery = {};

        if (userRole === 'farmer') {
            orderQuery.seller = userId;
        } else if (userRole === 'buyer') {
            orderQuery.buyer = userId;
        }

        // Get orders first
        const orders = await Order.find(orderQuery, '_id');
        const orderIds = orders.map(order => order._id);

        let deliveryQuery = { order: { $in: orderIds } };

        if (status) {
            deliveryQuery.status = status;
        }

        const deliveries = await Delivery.find(deliveryQuery)
            .populate({
                path: 'order',
                populate: [
                    { path: 'buyer', select: 'name email buyerProfile.businessName' },
                    { path: 'seller', select: 'name email farmerProfile.farmName' }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Delivery.countDocuments(deliveryQuery);

        res.json({
            success: true,
            data: deliveries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get deliveries error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch deliveries' });
    }
};

const getDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findById(id)
            .populate({
                path: 'order',
                populate: [
                    { path: 'buyer', select: 'name email buyerProfile.businessName buyerProfile.businessType' },
                    { path: 'seller', select: 'name email farmerProfile.farmName farmerProfile.location' },
                    { path: 'items.product', select: 'name image unit category' }
                ]
            });

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery not found' });
        }

        res.json({ success: true, data: delivery });
    } catch (error) {
        console.error('Get delivery error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch delivery' });
    }
};

const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, currentLocation, notes, proofOfDelivery } = req.body;

        const delivery = await Delivery.findById(id);

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery not found' });
        }

        // Update delivery
        delivery.status = status;
        if (currentLocation) delivery.currentLocation = currentLocation;
        if (notes) delivery.notes = notes;
        if (proofOfDelivery) delivery.proofOfDelivery = proofOfDelivery;

        if (status === 'delivered') {
            delivery.actualDeliveryDate = new Date();
        }

        delivery.updatedAt = new Date();
        await delivery.save();

        // Update order status if delivery is completed
        if (status === 'delivered') {
            await Order.findByIdAndUpdate(delivery.order, {
                status: 'delivered',
                deliveryDate: new Date()
            });
        }

        const populatedDelivery = await Delivery.findById(delivery._id)
            .populate({
                path: 'order',
                populate: [
                    { path: 'buyer', select: 'name email buyerProfile.businessName' },
                    { path: 'seller', select: 'name email farmerProfile.farmName' }
                ]
            });

        res.json({ success: true, data: populatedDelivery });
    } catch (error) {
        console.error('Update delivery status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update delivery status' });
    }
};

const getDeliveryByTrackingId = async (req, res) => {
    try {
        const { trackingId } = req.params;

        const delivery = await Delivery.findOne({ trackingId })
            .populate({
                path: 'order',
                populate: [
                    { path: 'buyer', select: 'name email buyerProfile.businessName buyerProfile.businessType' },
                    { path: 'seller', select: 'name email farmerProfile.farmName farmerProfile.location' },
                    { path: 'items.product', select: 'name image unit category' }
                ]
            });

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery not found' });
        }

        res.json({ success: true, data: delivery });
    } catch (error) {
        console.error('Get delivery by tracking ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch delivery' });
    }
};

// Cart Controllers
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ user: userId })
            .populate('items.product', 'name price image unit category stock organic')
            .lean();

        if (!cart) {
            return res.json({ success: true, data: { items: [] } });
        }

        // Calculate totals
        const items = cart.items.map(item => ({
            ...item,
            total: item.product.price * item.quantity
        }));

        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

        res.json({
            success: true,
            data: {
                items,
                totalAmount,
                totalItems
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch cart' });
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;

        // Validate product exists and has stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // Find or create cart
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // Check if product already in cart
        const existingItem = cart.items.find(item =>
            item.product.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                product: productId,
                quantity
            });
        }

        cart.updatedAt = new Date();
        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price image unit category stock organic');

        res.json({ success: true, data: populatedCart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to add item to cart' });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity } = req.body;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            // Check stock availability
            const product = await Product.findById(productId);
            if (product && product.stock < quantity) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            cart.items[itemIndex].quantity = quantity;
        }

        cart.updatedAt = new Date();
        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price image unit category stock organic');

        res.json({ success: true, data: populatedCart });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart item' });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item =>
            item.product.toString() !== productId
        );

        cart.updatedAt = new Date();
        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price image unit category stock organic');

        res.json({ success: true, data: populatedCart });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        await Cart.findOneAndUpdate(
            { user: userId },
            { items: [], updatedAt: new Date() },
            { upsert: true }
        );

        res.json({ success: true, message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear cart' });
    }
};

// Wishlist Controllers
const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await Wishlist.find({ user: userId })
            .populate('product', 'name price image category rating stock unit organic seller')
            .populate('product.seller', 'name farmerProfile.businessName')
            .sort({ addedAt: -1 });

        res.json({ success: true, data: wishlist });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if already in wishlist
        const existingItem = await Wishlist.findOne({ user: userId, product: productId });
        if (existingItem) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist' });
        }

        const wishlistItem = new Wishlist({
            user: userId,
            product: productId
        });

        await wishlistItem.save();

        const populatedItem = await Wishlist.findById(wishlistItem._id)
            .populate('product', 'name price image category rating stock unit organic seller')
            .populate('product.seller', 'name farmerProfile.businessName');

        res.status(201).json({ success: true, data: populatedItem });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const result = await Wishlist.findOneAndDelete({
            user: userId,
            product: productId
        });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
        }

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
    }
};

const checkWishlistStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const item = await Wishlist.findOne({ user: userId, product: productId });

        res.json({ success: true, data: { isInWishlist: !!item } });
    } catch (error) {
        console.error('Check wishlist status error:', error);
        res.status(500).json({ success: false, message: 'Failed to check wishlist status' });
    }
};

// Review Controllers
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ product: productId })
            .populate('user', 'name avatar')
            .populate('order', 'id')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Review.countDocuments({ product: productId });

        // Calculate average rating
        const ratingStats = await Review.aggregate([
            { $match: { product: mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            stats: ratingStats[0] || { averageRating: 0, totalReviews: 0 }
        });
    } catch (error) {
        console.error('Get product reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
};

const createReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, orderId, rating, title, comment, images } = req.body;

        // Check if user has purchased this product
        if (orderId) {
            const order = await Order.findOne({
                _id: orderId,
                buyer: userId,
                items: { $elemMatch: { product: productId } }
            });

            if (!order) {
                return res.status(403).json({ success: false, message: 'You can only review products you have purchased' });
            }
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
        }

        const review = new Review({
            user: userId,
            product: productId,
            order: orderId,
            rating,
            title,
            comment,
            images,
            isVerified: !!orderId
        });

        await review.save();

        // Update product rating
        const productReviews = await Review.find({ product: productId });
        const averageRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;

        await Product.findByIdAndUpdate(productId, {
            rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
        });

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'name avatar')
            .populate('order', 'id');

        res.status(201).json({ success: true, data: populatedReview });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ success: false, message: 'Failed to create review' });
    }
};

const updateReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;
        const updates = req.body;

        const review = await Review.findOne({ _id: reviewId, user: userId });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        Object.assign(review, updates);
        review.updatedAt = new Date();
        await review.save();

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'name avatar')
            .populate('order', 'id');

        res.json({ success: true, data: populatedReview });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ success: false, message: 'Failed to update review' });
    }
};

const deleteReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;

        const review = await Review.findOneAndDelete({ _id: reviewId, user: userId });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review' });
    }
};

const getUserReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name image category')
            .populate('order', 'id status')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Review.countDocuments({ user: userId });

        res.json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user reviews' });
    }
};

// Category Controllers
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .sort({ sortOrder: 1, name: 1 });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, slug, description, image, parent, sortOrder } = req.body;

        const category = new Category({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description,
            image,
            parent,
            sortOrder
        });

        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Create category error:', error);
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Category name or slug already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create category' });
        }
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const category = await Category.findByIdAndUpdate(id, updates, { new: true });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

// Notification Controllers
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        let query = { user: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

        res.json({
            success: true,
            data: notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({ _id: id, user: userId });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};

// Analytics Controllers
const getSellerAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query;

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        // Get seller's products
        const products = await Product.find({ seller: userId }, '_id name');
        const productIds = products.map(p => p._id);

        // Orders analytics
        const orders = await Order.find({
            seller: userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const completedOrders = orders.filter(order => order.status === 'delivered').length;

        // Product performance
        const productStats = await Promise.all(
            products.map(async (product) => {
                const productOrders = orders.filter(order =>
                    order.items.some(item => item.product.toString() === product._id.toString())
                );

                const totalSold = productOrders.reduce((sum, order) => {
                    const item = order.items.find(item => item.product.toString() === product._id.toString());
                    return sum + (item ? item.quantity : 0);
                }, 0);

                const revenue = productOrders.reduce((sum, order) => sum + order.totalAmount, 0);

                return {
                    productId: product._id,
                    productName: product.name,
                    totalSold,
                    revenue,
                    orders: productOrders.length
                };
            })
        );

        res.json({
            success: true,
            data: {
                period,
                overview: {
                    totalOrders,
                    totalRevenue,
                    completedOrders,
                    completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0
                },
                products: productStats.sort((a, b) => b.revenue - a.revenue)
            }
        });
    } catch (error) {
        console.error('Get seller analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch seller analytics' });
    }
};

const getBuyerAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query;

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        // Orders analytics
        const orders = await Order.find({
            buyer: userId,
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate('items.product', 'category');

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const completedOrders = orders.filter(order => order.status === 'delivered').length;

        // Category preferences
        const categoryStats = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const category = item.product.category;
                if (!categoryStats[category]) {
                    categoryStats[category] = { count: 0, spent: 0 };
                }
                categoryStats[category].count += item.quantity;
                categoryStats[category].spent += item.total;
            });
        });

        res.json({
            success: true,
            data: {
                period,
                overview: {
                    totalOrders,
                    totalSpent,
                    completedOrders,
                    completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0
                },
                categories: Object.entries(categoryStats).map(([category, stats]) => ({
                    category,
                    itemsPurchased: stats.count,
                    amountSpent: stats.spent
                })).sort((a, b) => b.amountSpent - a.amountSpent)
            }
        });
    } catch (error) {
        console.error('Get buyer analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch buyer analytics' });
    }
};

const getProductAnalytics = async (req, res) => {
    try {
        const { productId } = req.params;
        const { period = '30d' } = req.query;

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Get orders containing this product
        const orders = await Order.find({
            'items.product': productId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const totalSold = orders.reduce((sum, order) => {
            const item = order.items.find(item => item.product.toString() === productId);
            return sum + (item ? item.quantity : 0);
        }, 0);

        const totalRevenue = orders.reduce((sum, order) => {
            const item = order.items.find(item => item.product.toString() === productId);
            return sum + (item ? item.total : 0);
        }, 0);

        const uniqueBuyers = new Set(orders.map(order => order.buyer.toString())).size;

        // Reviews analytics
        const reviews = await Review.find({
            product: productId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        res.json({
            success: true,
            data: {
                productId,
                productName: product.name,
                period,
                sales: {
                    totalSold,
                    totalRevenue,
                    uniqueBuyers,
                    ordersCount: orders.length
                },
                reviews: {
                    totalReviews: reviews.length,
                    averageRating: Math.round(averageRating * 10) / 10
                }
            }
        });
    res.json({
        success: true,
        data: {
            productId,
            productName: product.name,
            period,
            sales: {
                totalSold,
                totalRevenue,
                uniqueBuyers,
                ordersCount: orders.length
            },
            reviews: {
                totalReviews: reviews.length,
                averageRating: Math.round(averageRating * 10) / 10
            }
        }
    });
    } catch (error) {
        console.error('Get product analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch product analytics' });
    }
};

// Payment Controllers - Enhanced with Workflow Management
const createPaymentIntent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId, amount, currency = 'INR', paymentMethodId } = req.body;

        const result = await paymentWorkflow.createPaymentIntent(orderId, userId, {
            amount,
            currency,
            paymentMethodId
        });

        res.json(result);
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentId } = req.params;
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        const result = await paymentWorkflow.confirmPayment(paymentId, {
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature
        }, userId);

        res.json(result);
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const releaseEscrow = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentId } = req.params;
        const { deliveryConfirmed, notes } = req.body;

        const result = await paymentWorkflow.releaseEscrow(paymentId, userId, {
            deliveryConfirmed,
            notes
        });

        res.json(result);
    } catch (error) {
        console.error('Release escrow error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentId } = req.params;

        const result = await paymentWorkflow.getPaymentStatus(paymentId, userId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        let query = { user: userId };
        if (status) {
            query.status = status;
        }

        const payments = await Payment.find(query)
            .populate('order', 'status totalAmount createdAt')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
    }
};

const processRefund = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentId } = req.params;
        const { amount, reason = 'requested_by_customer', notes } = req.body;

        if (!razorpay) {
            return res.status(503).json({
                error: 'Payment provider is not configured',
                code: 'RAZORPAY_NOT_CONFIGURED',
                details: { required: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'] }
            });
        }

        // Find payment
        const payment = await Payment.findOne({ _id: paymentId, user: userId });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment is not eligible for refund' });
        }

        // Check if refund already exists
        const existingRefund = await Refund.findOne({ payment: paymentId });
        if (existingRefund) {
            return res.status(400).json({ success: false, message: 'Refund already processed for this payment' });
        }

        const refundAmount = amount || payment.amount;

        // Process Razorpay refund
        const razorpayRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100), // Convert to paisa
            notes: {
                reason,
                notes: notes || ''
            }
        });

        // Create refund record
        const refund = new Refund({
            payment: paymentId,
            order: payment.order,
            user: userId,
            razorpayRefundId: razorpayRefund.id,
            amount: refundAmount,
            currency: payment.currency,
            reason,
            status: 'processed',
            notes,
            processedAt: new Date(),
            metadata: { razorpayRefund }
        });

        await refund.save();

        // Update payment status
        payment.status = 'refunded';
        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, { status: 'refunded' });

        // Record blockchain transaction for refund
        const blockchainTx = await recordBlockchainTransaction({
            payment: payment._id,
            amount: refundAmount,
            currency: payment.currency,
            transactionType: 'refund',
            fromAddress: payment.order.seller.toString(), // Seller
            toAddress: userId.toString(), // Buyer
            metadata: {
                refundId: refund._id,
                razorpayRefundId: razorpayRefund.id
            }
        });

        refund.blockchainTxHash = blockchainTx.transactionHash;
        await refund.save();

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: {
                refundId: refund._id,
                amount: refundAmount,
                razorpayRefundId: razorpayRefund.id,
                blockchainTxHash: blockchainTx.transactionHash
            }
        });
    } catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({ success: false, message: 'Failed to process refund' });
    }
};

const getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;

        const paymentMethods = await PaymentMethod.find({
            user: userId,
            isActive: true
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: paymentMethods
        });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment methods' });
    }
};

const addPaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, provider, razorpayMethodId, last4, expiryMonth, expiryYear, name } = req.body;

        // If setting as default, unset other defaults
        if (req.body.isDefault) {
            await PaymentMethod.updateMany(
                { user: userId },
                { isDefault: false }
            );
        }

        const paymentMethod = new PaymentMethod({
            user: userId,
            type,
            provider,
            razorpayMethodId,
            last4,
            expiryMonth,
            expiryYear,
            name,
            isDefault: req.body.isDefault || false
        });

        await paymentMethod.save();

        res.status(201).json({
            success: true,
            data: paymentMethod
        });
    } catch (error) {
        console.error('Add payment method error:', error);
        res.status(500).json({ success: false, message: 'Failed to add payment method' });
    }
};

const deletePaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { methodId } = req.params;

        const paymentMethod = await PaymentMethod.findOneAndDelete({
            _id: methodId,
            user: userId
        });

        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        res.json({
            success: true,
            message: 'Payment method deleted successfully'
        });
    } catch (error) {
        console.error('Delete payment method error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete payment method' });
    }
};

// Blockchain Helper Functions
const recordBlockchainTransaction = async (transactionData) => {
    try {
        // Simulate blockchain transaction recording
        // In a real implementation, this would interact with a blockchain network

        const transactionHash = crypto.SHA256(
            JSON.stringify({
                ...transactionData,
                timestamp: Date.now(),
                nonce: Math.random()
            })
        ).toString();

        const blockNumber = Math.floor(Date.now() / 10000); // Simulate block number

        const blockchainTx = new BlockchainTransaction({
            ...transactionData,
            transactionHash,
            blockNumber,
            status: 'confirmed' // Simulate immediate confirmation
        });

        await blockchainTx.save();

        return {
            transactionHash,
            blockNumber,
            status: 'confirmed'
        };
    } catch (error) {
        console.error('Blockchain transaction recording error:', error);
        throw error;
    }
};

// Helper function to create notifications
const createNotification = async (notificationData) => {
    try {
        const notification = new Notification(notificationData);
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        // Don't throw error for notifications
    }
};

module.exports = {
    // Auth controllers
    register,
    login,
    demoLogin,
    logout,
    refreshToken,
    getMe,
    forgotPassword,
    resetPassword,
    getRoles,
    assignRole,
    getUserRole,

    // User controllers
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    updatePreferences,

    // Weather controllers
    getCurrentWeather,
    getWeatherForecast,
    getWeatherHistory,
    getWeatherAlerts,
    subscribeWeatherAlerts,
    unsubscribeWeatherAlerts,

    // Market controllers
    getMarketPrices,
    getMarketPricesByCommodity,
    getMarketPriceHistory,
    getMarketTrends,
    getMarketAnalysis,
    getPriceForecast,
    getMandiPrices,
    createMarketPriceAlert,
    deleteMarketPriceAlert,

    // Product controllers
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,

    // Order controllers
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    cancelOrder,

    // Delivery controllers
    getDeliveries,
    getDeliveryById,
    updateDeliveryStatus,
    getDeliveryByTrackingId,

    // Cart controllers
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,

    // Wishlist controllers
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus,

    // Review controllers
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    getUserReviews,

    // Category controllers
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    // Notification controllers
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,

    // Analytics controllers
    getSellerAnalytics,
    getBuyerAnalytics,
    getProductAnalytics,

    // Payment controllers
    createPaymentIntent,
    confirmPayment,
    getPaymentHistory,
    processRefund,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    releaseEscrow,
    getPaymentStatus
};