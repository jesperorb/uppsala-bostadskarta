mapboxgl.accessToken = "";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v9",
  zoom: 13,
  pitch: 60,
  bearing: -10,
  center: [17.639312, 59.858694]
}).addControl(new mapboxgl.NavigationControl());

const popup = new mapboxgl.Popup({
  closeButton: true,
  closeOnClick: false
});

const setCursor = cursor => (map.getCanvas().style.cursor = cursor);

const formatRent = rent => {
  let formattedRent = "";
  if (rent.toString().length > 4) {
    formattedRent =
      rent.toString().substr(0, 2) + " " + rent.toString().substr(2);
  } else {
    formattedRent =
      rent.toString().substr(0, 1) + " " + rent.toString().substr(1);
  }
  return formattedRent;
};

const formatPopup = properties => {
  return `
    <h2><a href="https://bostad.uppsala.se/lediga-bostader/bostad/?id=${
      properties.rentalObjectId
    }">${properties.address}</a></h2>
  <div class="info">
    <p style="font-weight: 700;">${properties.rent} kr / <span style="color: rgba(0,0,0, 0.4)">${
    properties.size
  } km²</span></p>
  </div >
  <p>Sökande: <strong>${properties.applications}</strong></p>
  <p>Rum: <strong>${properties.rooms}</strong> </p>
  `;
};

map.on("load", () => {
  map.addSource("apartments", {
    type: "geojson",
    data: "public/formatted.geojson"
  });

  map.addLayer({
    id: "apartments-mapping",
    type: "circle",
    source: "apartments",
    paint: {
      "circle-radius": {
        property: "size",
        stops: [[30, 8], [150, 16]]
      },
      "circle-color": {
        property: "rentPerArea",
        stops: [[0, "#FFE100"], [300, "#FF2A00"]]
      }
    }
  });
  map.setFilter("apartments-mapping", 
    [
      "all",
      ["==", "rooms", 2],
      ["==", "region", "Uppsala"],
      ["!=", "typeOfRental", "student"]
    ]);
});

map.on("click", "apartments-mapping", e => {
  setCursor("pointer");
  const [ selected ] = e.features;
  const { geometry: { coordinates }, properties } = selected;
  properties.rent = formatRent(properties.rent);
  const html = formatPopup(properties);
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }
  popup
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);
});

map.on("mouseenter", "apartments-mapping", () => {
  setCursor("pointer");
});

map.on("mouseleave", "apartments-mapping", () => {
  setCursor("");
});

ui.filter.addEventListener("change", ({ target }) => {
  const value = parseInt(target.value || 2, 10);
  map.setFilter("apartments-mapping", [
    "all",
    ["==", "rooms", value],
    ["==", "region", "Uppsala"],
    ["!=", "typeOfRental", "student"],
  ]);
});