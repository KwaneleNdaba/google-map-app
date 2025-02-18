"use client";
import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = "AIzaSyDlAU1G9yivtZKRC_s2HJ5KPfTrB93lPEk";

type GoogleMapProps = google.maps.Map | null;
type GoogleMarkerProps = google.maps.Marker | null;
type GoogleInfoWindowProps = google.maps.InfoWindow | null;

type PlaceType = {
  geometry?: { location?: google.maps.LatLng };
  name?: string;
  formatted_address?: string;
  place_id?: string;
  custom?: boolean;
};

export default function GoogleMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<GoogleMapProps>(null);
  const [infoWindow, setInfoWindow] = useState<GoogleInfoWindowProps>(null);
  const [places, setPlaces] = useState<{ place: PlaceType; funFact: string, marker?: google.maps.Marker |any }[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceType | null>(null);
  const [customDetails, setCustomDetails] = useState({ name: "", funFact: "", address: "" });

  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY ?? "",
      version: "weekly",
      libraries: ["places"],
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const google = window.google;
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: -25.7479, lng: 28.2293 },
          zoom: 10,
        });
        setMap(mapInstance);
        setInfoWindow(new google.maps.InfoWindow());
      }
    });
  }, []);

  const fetchFunFact = (placeName: string) => {
    const funFacts: { [key: string]: string } = {
      Paris: "Did you know? Paris has only one stop sign!",
      "New York": "The Empire State Building has its own zip code: 10118!",
      Tokyo: "Tokyo has the world's busiest pedestrian crossing!",
      London: "Big Ben is actually the name of the bell inside the tower!",
      "Cape Town": "Table Mountain in Cape Town is one of the oldest mountains in the world, estimated to be around 600 million years old!",
      "Johannesburg": "Johannesburg is known as the 'City of Gold' due to its history in gold mining, and it's the largest city in the world not built on a river or coastline!",
      "Durban": "Durban is famous for having the largest Indian population outside of India, and it has some of the best beaches in South Africa!",
      "Kruger National Park": "Kruger National Park is one of Africa's largest game reserves, spanning nearly 2 million hectares and home to the Big Five!",
      "Sydney": "The Sydney Opera House is one of the most recognizable buildings in the world and is actually a UNESCO World Heritage Site!",
      "Rome": "Rome is known as the Eternal City, and it has been continuously inhabited for over 2,500 years!",
      "Machu Picchu": "Machu Picchu was built by the Incas around the 15th century, and its exact purpose is still a mystery!",
      "Great Wall of China": "The Great Wall of China is not a single continuous wall but a series of walls built by different dynasties over the years, stretching over 13,000 miles!",
      "Egypt": "The Great Pyramid of Giza is the only surviving Wonder of the Ancient Seven Wonders of the World!",
      "Dubai": "Dubai is home to the tallest building in the world, the Burj Khalifa, standing at 828 meters tall!",
    };

    return funFacts[placeName] || "This place is awesome, but we couldn't find a fun fact!";
  };

  const handlePlaceSelect = async (place: PlaceType) => {
    if (!place.geometry?.location || !map || !infoWindow) return;
  
    const { lat, lng } = place.geometry.location;
  
    let existing = places.find((p) => {
      const pos = p.place.geometry?.location;
      return pos?.lat() === lat() && pos?.lng() === lng();
    });
  
    let funFact = existing ? existing.funFact : fetchFunFact(place.name ?? "");
    setSelectedPlace(place);
  
    let marker: google.maps.Marker | null = null;
  
    if (!existing) {
      marker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        animation: google.maps.Animation.DROP,
      });
  
      marker.addListener("click", () => {
        showInfoWindow(marker, place, funFact);
      });
  
      setPlaces((prev) => [...prev, { place, funFact, marker }]);
    } else {
      marker = existing.marker ?? null;
    }
  
    // Open info window even if marker is already present
    showInfoWindow(marker, place, funFact);
  
    // Recenter the map
    map.setCenter(place.geometry.location);
    map.setZoom(14);
  };
  

  const showInfoWindow = (
    marker: google.maps.Marker | null,
    place: PlaceType,
    funFact: string
  ) => {
    if (!infoWindow || !map) return;

    const content = `
      <div>
        <h3>${place.name ?? "Unknown Location"}</h3>
        <p>${place.formatted_address ?? "No address available"}</p>
        <p style="font-style: italic">${funFact}</p>
      </div>
    `;

    infoWindow.setContent(content);
    if (marker) infoWindow.open(map, marker);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !map || !infoWindow) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: event.latLng }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const placeDetails = results[0];

        const newPlace: PlaceType = {
          geometry: { location: event.latLng as google.maps.LatLng },
          name: placeDetails.formatted_address || "Unknown Location",
          formatted_address: placeDetails.formatted_address || "No Address Available",
          custom: true,
        };

        const funFact = fetchFunFact(newPlace.name || "");

        const marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          animation: google.maps.Animation.DROP,
        });

        marker.addListener("click", () => {
          showInfoWindow(marker, newPlace, funFact);
        });

        setPlaces((prev) => [...prev, { place: newPlace, funFact, marker }]);
        setSelectedPlace(newPlace);

        showInfoWindow(marker, newPlace, funFact);
      } else {
        console.error("Geocoder failed due to: " + status);
      }
    });
  };

  useEffect(() => {
    if (!map) return;

    const input = document.getElementById("autocomplete") as HTMLInputElement;
    if (!input) return;

    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace() as PlaceType;
      handlePlaceSelect(place);
    });

    map.addListener("click", handleMapClick);
  }, [map]);

  const saveCustomPlace = () => {
    if (!selectedPlace || !selectedPlace.geometry?.location) return;

    const updatedPlace = {
      ...selectedPlace,
      name: customDetails.name || "Custom Place",
      formatted_address: customDetails.address || "Unknown Address",
    };

    setPlaces((prev) => [...prev, { place: updatedPlace, funFact: customDetails.funFact }]);
    setSelectedPlace(null);
    setCustomDetails({ name: "", funFact: "", address: "" });
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 border-r bg-gray-100">
        <h2 className="text-xl font-bold mb-4">📍 Places</h2>
        <ul>
          {places.map(({ place, funFact }, index) => (
            <li
              key={index}
              className="p-2 mb-2 bg-white shadow rounded cursor-pointer"
              onClick={() => handlePlaceSelect(place)}
            >
              <h3 className="font-semibold">{place.name || "Unnamed Place"}</h3>
              <p className="text-sm">{place.formatted_address || "No Address"}</p>
              <p className="text-xs italic">💡 {funFact}</p>
            </li>
          ))}
        </ul>

        {selectedPlace?.custom && !selectedPlace.name && !selectedPlace.formatted_address && (
          <div className="mt-4 p-3 bg-white shadow rounded">
            <h3 className="font-bold">Add Details</h3>
            <input
              type="text"
              placeholder="Name"
              className="w-full p-2 border rounded mt-2"
              value={customDetails.name}
              onChange={(e) => setCustomDetails({ ...customDetails, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address"
              className="w-full p-2 border rounded mt-2"
              value={customDetails.address}
              onChange={(e) => setCustomDetails({ ...customDetails, address: e.target.value })}
            />
            <textarea
              placeholder="Fun Fact"
              className="w-full p-2 border rounded mt-2"
              value={customDetails.funFact}
              onChange={(e) => setCustomDetails({ ...customDetails, funFact: e.target.value })}
            />
            <button
              className="w-full bg-blue-500 text-white p-2 mt-3 rounded"
              onClick={saveCustomPlace}
            >
              Save Place
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="w-2/3">
        <input
          style={{
            zIndex: "99",
          }}
          id="autocomplete"
          type="text"
          placeholder="Search for a location"
          className="p-2 border rounded mb-4 w-full relative"
        />

        <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />
      </div>
    </div>
  );
}