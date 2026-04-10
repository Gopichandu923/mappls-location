"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  state: string;
  district: string;
  locality: string;
  subLocality: string;
  pincode: string;
  village?: string;
  subDistrict?: string;
}

interface MapplsClickEvent {
  lngLat: { lng: number; lat: number };
}

declare global {
  interface Window {
    mappls: any;
  }
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapObject = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const loadMapplsScripts = async () => {
      setMapReady(false);
      mapObject.current = null;

      const mapplsCoreScript = document.querySelector(
        'script[src*="sdk.mappls.com/map/sdk/web"]'
      ) || document.querySelector(
        'script[src*="apis.mappls.com/advancedmaps/api"]'
      );

      if (!mapplsCoreScript) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "/api/mappls-sdk";
          script.async = true;
          script.defer = true;
          script.onload = () => {
            resolve();
          };
          script.onerror = () => {
            resolve();
          };
          document.head.appendChild(script);
        });
      }

      let attempts = 0;
      const waitForMappls = () => {
        return new Promise<void>((resolve) => {
          const check = () => {
            if (window.mappls) {
              resolve();
            } else if (attempts < 50) {
              attempts++;
              setTimeout(check, 100);
            } else {

              resolve();
            }
          };
          check();
        });
      };

      await waitForMappls();
      setMapReady(true);
    };

    loadMapplsScripts();
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainer.current) return;

    if (mapObject.current && typeof mapObject.current.remove === "function") {
      try { mapObject.current.remove(); } catch { }
      mapObject.current = null;
    }

    const initMapInstance = () => {
      try {
        if (!window.mappls || !window.mappls.Map) {
          setTimeout(initMapInstance, 200);
          return;
        }

        mapObject.current = new window.mappls.Map("map", {
          center: [28.633, 77.2194],
          zoom: 5,
          zoomControl: true,
        });
      } catch {
        // Map initialization failed
      }
    };

    initMapInstance();

    return () => {
      if (mapObject.current && typeof mapObject.current.remove === "function") {
        try { mapObject.current.remove(); } catch { }
        mapObject.current = null;
      }
    };
  }, [mapReady]);

  const getLocationDetails = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reverse-geocode?latitude=${lat}&longitude=${lng}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText || `HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text || text === '{}') {
        throw new Error("Location not found. Please try a different location.");
      }

      const data = JSON.parse(text);

      if (data?.error || data?.error_description) {
        throw new Error(data.error_description || data.error);
      }

      const results = data?.results?.[0] || {};
      const locationData: LocationData = {
        latitude: lat,
        longitude: lng,
        address: results?.formatted_address || results?.address || "Address not available",
        state: results?.state || "Not available",
        district: results?.district || "Not available",
        locality: results?.locality || results?.village || "Not available",
        subLocality: results?.subLocality || results?.subDistrict || "Not available",
        pincode: results?.pincode || "Not available",
        village: results?.village,
        subDistrict: results?.subDistrict,
      };

      setLocation(locationData);

      if (mapObject.current && window.mappls) {
        if (markerRef.current && typeof markerRef.current.remove === "function") {
          try { markerRef.current.remove(); } catch { }
        }

        markerRef.current = new window.mappls.Marker({
          map: mapObject.current,
          position: { lat, lng },
        });
        mapObject.current.setCenter({ lat, lng });
        mapObject.current.setZoom(15);
      }
    } catch (err) {
      setError(`Failed to get location details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        getLocationDetails(latitude, longitude);
      },
      (err) => {
        setError("Unable to get your location. Please enable location access.");
        setLoading(false);
      }
    );
  }, [getLocationDetails]);

  useEffect(() => {
    if (!mapObject.current || !mapReady) return;

    mapObject.current.on("click", (e: MapplsClickEvent) => {
      const { lng, lat } = e.lngLat;
      getLocationDetails(lat, lng);
    });
  }, [mapReady, getLocationDetails]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-indigo-600 text-white py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold">Location Finder</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div
                id="map"
                ref={mapContainer}
                className="h-[300px] sm:h-[400px] lg:h-[500px] w-full"
                style={{ minHeight: '300px', position: 'relative' }}
              />
              <div className="p-4 bg-gray-50 border-t">
                <p className="text-sm text-gray-600">
                  Click on the map or use the button below to get location details
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Get Your Location
              </h2>
              <button
                onClick={handleGetLocation}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Get My Current Location
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {location && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Location Details
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Coordinates</span>
                    <span className="font-mono text-sm text-indigo-600">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="py-2 border-b">
                    <span className="text-gray-600 block text-sm">Full Address</span>
                    <span className="text-gray-800 font-medium">{location.address}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">State</span>
                    <span className="font-medium text-gray-800">{location.state}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">District</span>
                    <span className="font-medium text-gray-800">{location.district}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Locality</span>
                    <span className="font-medium text-gray-800">{location.locality}</span>
                  </div>
                  {location.village && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Village</span>
                      <span className="font-medium text-gray-800">{location.village}</span>
                    </div>
                  )}
                  {location.subDistrict && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Sub District</span>
                      <span className="font-medium text-gray-800">{location.subDistrict}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Sub-Locality</span>
                    <span className="font-medium text-gray-800">{location.subLocality}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">PIN Code</span>
                    <span className="font-medium text-gray-800">{location.pincode}</span>
                  </div>
                </div>
              </div>
            )}

            {!location && !loading && (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p>Click on the map or use the button to get location details</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-3 px-4 mt-6 sm:mt-8">
        <div className="max-w-7xl mx-auto text-center text-xs sm:text-sm">
          Powered by Mappls (MapmyIndia)
        </div>
      </footer>
    </div>
  );
}