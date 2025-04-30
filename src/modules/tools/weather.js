import axios from 'axios';
import { log } from '../../utils/logger.js';

export class WeatherSearch {
    constructor() {
        this.geoUrl = 'https://geocoding-api.open-meteo.com/v1/search';
        this.weatherUrl = 'https://api.open-meteo.com/v1/forecast';
    }

    async getCurrentWeather(location) {
        try {
            log(`Searching weather for location: "${location}"`, 'debug');

            const geoResponse = await axios.get(this.geoUrl, {
                params: {
                    name: location,
                    count: 1,
                    language: 'en',
                    format: 'json'
                }
            });

            if (!geoResponse.data.results?.[0]) {
                log(`No location found for query: "${location}"`, 'debug');
                return null;
            }

            const locationData = geoResponse.data.results[0];
            log(`Found location: ${locationData.name}, ${locationData.country}`, 'debug');

            const weatherResponse = await axios.get(this.weatherUrl, {
                params: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    current: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'weather_code'],
                    timezone: 'auto'
                }
            });

            const current = weatherResponse.data.current;
            return {
                location: {
                    name: locationData.name,
                    country: locationData.country,
                    coordinates: {
                        lat: locationData.latitude,
                        lon: locationData.longitude
                    }
                },
                current: {
                    temp: current.temperature_2m,
                    feels_like: current.temperature_2m,
                    humidity: current.relative_humidity_2m,
                    wind_speed: current.wind_speed_10m,
                    description: this.getWeatherDescription(current.weather_code),
                    icon: this.getWeatherIcon(current.weather_code)
                },
                timestamp: new Date()
            };
        } catch (error) {
            log(`Weather search error: ${error.message}`, 'error');
            log(`Error details: ${JSON.stringify(error.response?.data || error)}`, 'error');
            return null;
        }
    }

    getWeatherDescription(code) {
        const weatherCodes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        return weatherCodes[code] || 'Unknown';
    }

    getWeatherIcon(code) {
        if (code === 0) return '☀️';
        if (code <= 3) return '🌤️';
        if (code <= 48) return '🌫️';
        if (code <= 55) return '🌧️';
        if (code <= 65) return '🌧️';
        if (code <= 77) return '🌨️';
        if (code <= 82) return '🌦️';
        if (code <= 86) return '🌨️';
        if (code <= 99) return '⛈️';
        return '❓';
    }

    formatWeatherResponse(weatherData) {
        if (!weatherData) return null;

        return {
            status: 'success',
            location: {
                name: weatherData.location.name,
                country: weatherData.location.country
            },
            conditions: {
                temperature: Math.round(weatherData.current.temp),
                feelsLike: Math.round(weatherData.current.feels_like),
                humidity: weatherData.current.humidity,
                windSpeed: weatherData.current.wind_speed,
                description: weatherData.current.description,
                icon: weatherData.current.icon
            },
            timestamp: weatherData.timestamp.toISOString()
        };
    }
}
