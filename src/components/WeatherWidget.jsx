import { useEffect, useRef, useState } from 'react';

const WEATHER_ORIGIN = 'http://127.0.0.1:5001';

export default function WeatherWidget() {
  const frameRef = useRef(null);
  const [frameHeight, setFrameHeight] = useState(null);

  useEffect(() => {
    function handleResize(event) {
      if (event.origin !== WEATHER_ORIGIN
          || event.source !== frameRef.current?.contentWindow
          || event.data?.type !== 'weather:resize') return;
      const height = event.data.height;
      if (Number.isFinite(height) && height >= 80 && height <= 2000) {
        setFrameHeight(Math.ceil(height) + 2);
      }
    }
    window.addEventListener('message', handleResize);
    return () => window.removeEventListener('message', handleResize);
  }, []);

  return (
    <aside className="weather-toolbar" aria-label="Local weather">
      <iframe
        ref={frameRef}
        className="weather-frame"
        src={`${WEATHER_ORIGIN}/?layout=strip`}
        allow="geolocation"
        title="Local weather and city search"
        style={frameHeight === null ? undefined : { height: frameHeight }}
      />
    </aside>
  );
}
