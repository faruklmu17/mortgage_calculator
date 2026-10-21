import { useState } from 'react';
import './WeatherWidget.css';

const API_KEY = 'e179175f784399e074d0075f33d96573';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState(
    'Allow location access or search for a city to see the weather.'
  );
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  async function getWeather(params, fallbackName = '') {
    setLoading(true);
    setWeather(null);
    setStatus('Loading weather...');

    try {
      const url = new URL(
        'https://api.openweathermap.org/data/2.5/weather'
      );

      url.search = new URLSearchParams({
        ...params,
        appid: API_KEY,
        units: 'imperial',
      }).toString();

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'The weather API key was rejected. Check that it is valid and active.'
          );
        }
        if (response.status === 404) {
          throw new Error('City not found. Try another city name.');
        }
        throw new Error(
          'Weather is temporarily unavailable. Please try again.'
        );
      }

      const data = await response.json();

      if (!data.weather?.[0] || !data.main) {
        throw new Error('Unexpected weather response. Please try again.');
      }

      setWeather(data);
      setLocation(data.name || fallbackName || 'Your location');
      setStatus('');
    } catch (error) {
      setStatus(error.message || 'Could not load weather. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function loadLocalWeather() {
    if (!navigator.geolocation) {
      setStatus('Location is not supported by this browser. Search for a city below.');
      return;
    }

    setLoading(true);
    setWeather(null);
    setStatus('Requesting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        let message = 'Could not access your location. Search for a city below.';

        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission was denied. Allow access in your browser settings, or search for a city below.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location lookup timed out. Please try again or search for a city.';
        }

        setStatus(message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }

  function handleCitySearch(event) {
    event.preventDefault();

    const cityName = city.trim();
    if (!cityName) {
      setStatus('Enter a city name first.');
      return;
    }

    getWeather({ q: cityName }, cityName);
  }

  return (
    <section className="weather-widget" aria-label="Local weather">
      <div className="weather-heading">
        <h2>Local Weather</h2>
        <p>{location || 'Discover the weather around you'}</p>

        <button
          type="button"
          className="get-weather-btn"
          onClick={loadLocalWeather}
          disabled={loading}
        >
          <span aria-hidden="true">📍</span>{' '}
          {loading ? 'Getting weather...' : 'Show My Local Weather'}
        </button>
      </div>

      <div className="weather-content" aria-live="polite" aria-busy={loading}>
        {status && <p className="weather-status">{status}</p>}

        {weather && (
          <>
            <div className="weather-now">
              <img
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                alt={weather.weather[0].description}
                width="76"
                height="76"
              />

              <div>
                <div className="weather-temperature">
                  {Math.round(weather.main.temp)}°F
                </div>
                <div className="weather-description">
                  {weather.weather[0].description}
                </div>
              </div>
            </div>

            <div className="weather-details">
              <span>Feels like {Math.round(weather.main.feels_like)}°F</span>
              <span>Humidity {weather.main.humidity}%</span>
              <span>Wind {Math.round(weather.wind?.speed ?? 0)} mph</span>
            </div>
          </>
        )}
      </div>

      <form className="weather-city-form" onSubmit={handleCitySearch}>
        <label htmlFor="weather-city">Or search by city</label>
        <div className="weather-city-controls">
          <input
            id="weather-city"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="e.g. Atlanta"
            autoComplete="address-level2"
          />
          <button type="submit" disabled={loading}>
            Search
          </button>
        </div>
      </form>
    </section>
  );
}
