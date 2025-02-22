import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const PORT = process.env.PORT || 3000

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express and middleware
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../pub')));

// Spotify API credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
let accessToken = '';
let refreshToken = '';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pub/index.html'));
});

// Auth state endpoint
app.get('/auth-state', (req, res) => {
    res.json({ isAuthenticated: !!accessToken });
});

// Auth state check endpoint
app.get('/check-auth', (req, res) => {
    res.json({ 
        authenticated: !!accessToken,
        username: null // Will be populated after Spotify API call
    });
});

// Login endpoint
app.get('/login', (req, res) => {
    const scope = 'playlist-modify-public playlist-modify-private';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state
        });
    
    res.redirect(authUrl);
});

// Update callback endpoint
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.redirect('/#error=missing_code');
    }

    try {
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            querystring.stringify({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            }), {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token;

        // Get user profile
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        res.redirect('/#authenticated=true&user=' + userResponse.data.display_name);
    } catch (error) {
        console.error('Authentication error:', error);
        res.redirect('/#error=auth_failed');
    }
});


// Add token refresh endpoint
app.get('/refresh-token', async (_req, res) => {
    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token available' });
    }
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }), {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
        accessToken = response.data.access_token;
        if (response.data.refresh_token) {
            refreshToken = response.data.refresh_token;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Update the playlist generation endpoint:

// Add rate limiting helper
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const spotifyRequest = async (config, retries = 3) => {
    try {
        return await axios(config);
    } catch (error) {
        if (error.response?.status === 429 && retries > 0) {
            const retryAfter = error.response.headers['retry-after'] || 3;
            await wait(retryAfter * 1000);
            return spotifyRequest(config, retries - 1);
        }
        throw error;
    }
};

// Add debugging to playlist generation endpoint

app.post('/generate-playlist', async (req, res) => {
    try {
        const { course, theme, duration, songCount = 5 } = req.body;
        
        const prompt = `Create a study playlist for ${course} class.
            Theme: ${theme}
            Duration: ${duration} minutes
            Number of songs: ${songCount}
            Format: Give me exactly ${songCount} songs in this format:
            1. Artist - Song Title
            Only return the numbered list, no other text.`;

        console.log('Sending prompt:', prompt);
        
        const result = await model.generateContent(prompt);
        const songList = result.response.text()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.match(/^\d+\./));

        console.log('Generated songs:', songList);

        // Simplified response structure
        res.json({
            success: true,
            songs: songList,
            course,
            theme,
            duration,
            totalSongs: songList.length
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate playlist' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});