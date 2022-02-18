/**
 * Component that renders Mapbox Map
 */

import React, { useEffect, useState } from "react";
import ReactMapGL, { NavigationControl, Source, Layer } from "react-map-gl";
import { useSelector, useDispatch } from "react-redux";
import { useHistory, Link } from "react-router-dom";
import Markers from "./Markers";
import MapCard from "./MapCard";
import circle from "@turf/circle";

import { convertCoords, drivetimeMapCalc, radiusCalc } from "./utils/helpers";
import { ViewListIcon, SearchIcon } from "@heroicons/react/solid";
import { MapIcon } from "@heroicons/react/outline";
import { searchAdventuresByMap } from "./actions/adventuresActions";

const navControlStyle = {
  right: 10,
  top: 10,
};

function AdventureMap({
  coords,
  urlParam,
  setCoords,
  getAdventureSlug,
  rounded,
}) {
  const history = useHistory();
  const dispatch = useDispatch();

  const adventuresObj = useSelector((store) => store.adventures);
  const user = useSelector((store) => store.users);

  //center map on initial load
  const [viewport, setViewport] = React.useState(coords);
  const [circleInfo, setCircleInfo] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [drivetime, setDrivetime] = useState(null);

  useEffect(() => {
    //shows drivetime for map card when user location is known and map card is visible
    if (user.location && popupInfo) {
      drivetimeMapCalc([
        convertCoords(adventuresObj[popupInfo].starting_location),
        user.location,
      ]).then((res) => {
        setDrivetime(res);
      });
    }

    //re-centers map on highest rated adventure after search
    if (Object.values(adventuresObj).length > 0 && urlParam === "?search") {
      const latLonArrToCenter =
        Object.values(adventuresObj)[
          Object.values(adventuresObj).reduce((accum, current, idx) => {
            return current.rating > Object.values(adventuresObj)[accum].rating
              ? idx
              : accum;
          }, 0)
        ].starting_location.split(",");
      setCoords({
        latitude: parseFloat(latLonArrToCenter[0]),
        longitude: parseFloat(latLonArrToCenter[1]),
        zoom: 6,
      });
      setViewport({
        latitude: parseFloat(latLonArrToCenter[0]),
        longitude: parseFloat(latLonArrToCenter[1]),
        zoom: 6,
      });
    }
  }, [user.location, popupInfo, adventuresObj, urlParam, setCoords]);

  // left off needing to make sure viewport doesn't get new lat long every click on map... only when new search results... maybe useMemo on useeffect calc or something?

  const clickHandler = (e) => {
    setPopupInfo(e);
    if (getAdventureSlug) {
      getAdventureSlug(e);
    }
  };

  const handleSearchByMap = (e) => {
    dispatch(
      searchAdventuresByMap(
        viewport.latitude,
        viewport.longitude,
        viewport.zoom
      )
    );
    setCircleInfo({
      latitude: viewport.latitude,
      longitude: viewport.longitude,
      radius: radiusCalc(viewport.zoom),
    });
  };

  return (
    <div
      className={`fixed bg-gray-50 w-full h-[calc(100%-4rem)] sm:h-[calc(100%-5rem)] ${
        history.location.search === "?fullscreen"
          ? "lg:mt-[9.375rem] lg:h-[calc(100%-9.375rem)]"
          : "lg:w-[calc(100vw-51.25rem)] lg:h-[calc(100%-12rem)] lg:mt-0"
      } border border-gray-300 shadow-inner mt-16 sm:mt-20 ${
        rounded && "rounded-lg"
      }`}
    >
      {/* search this area button */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <button
          type="button"
          onClick={handleSearchByMap}
          className="flex items-center px-4 py-2 text-lg font-semibold text-white transition-colors duration-300 bg-indigo-600 rounded-full shadow hover:bg-indigo-700 focus:outline-none focus:ring-blue-200 focus:ring-4"
        >
          <SearchIcon className="h-6 w-6 mr-1" />
          Search this area
        </button>
      </div>

      {/* shows back button if on /map, otherwise, show fullscreen button and hide back button (applicable in case of split screen map view on adventure page) */}
      {history.location.pathname === "/map" ? (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={() => history.push("/adventures")}
            className="flex items-center px-4 py-2 text-lg font-semibold text-white transition-colors duration-300 bg-indigo-600 rounded-full shadow hover:bg-indigo-700 focus:outline-none focus:ring-blue-200 focus:ring-4"
          >
            <ViewListIcon className="h-6 w-6 mr-1" />
            Back
          </button>
        </div>
      ) : (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-10">
          <Link to={`/map?fullscreen`}>
            <button
              type="button"
              className="flex items-center px-4 py-2 text-lg font-semibold text-white transition-colors duration-300 bg-indigo-600 rounded-full shadow hover:bg-indigo-700 focus:outline-none focus:ring-blue-200 focus:ring-4"
            >
              <MapIcon className="h-6 w-6 mr-1" />
              Fullscreen
            </button>
          </Link>
        </div>
      )}
      <ReactMapGL
        mapStyle="mapbox://styles/mapbox/outdoors-v11"
        {...viewport}
        width="100%"
        height="100%"
        className={`${rounded && "rounded-lg"}`}
        onViewportChange={(viewport) => {
          // if statement removes ?search or ?all from the urlParam so viewport changes not overridden when dragging around map
          if (urlParam === "?search" || urlParam === "?all") {
            history.push("/adventures");
          }
          setViewport(viewport);
        }}
      >
        <NavigationControl
          style={navControlStyle}
          showCompass={false}
          className="z-20"
        />

        <Markers
          data={adventuresObj}
          clickHandler={clickHandler}
          className="relative"
        />

        {popupInfo && (
          <MapCard
            drivetime={drivetime}
            adventure={adventuresObj[popupInfo]}
            setPopupInfo={setPopupInfo}
          />
        )}

        {circleInfo ? (
          <Source
            id="radius"
            type="geojson"
            data={circle(
              [circleInfo.longitude, circleInfo.latitude],
              circleInfo.radius,
              {
                steps: 50,
                units: "miles",
              }
            )}
          >
            <Layer
              id="fill-layer"
              type="fill"
              paint={{
                "fill-color": "#4F46E5",
                "fill-opacity": 0.05,
              }}
            />
            <Layer
              id="line-layer"
              type="line"
              paint={{
                "line-color": "#4F46E5",
                "line-opacity": 0.2,
                "line-width": 1,
              }}
            />
          </Source>
        ) : null}
      </ReactMapGL>
    </div>
  );
}

export default AdventureMap;
