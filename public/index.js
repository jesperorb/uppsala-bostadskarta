const ui = {
  toggle: document.getElementById("toggle"),
  list: document.getElementById("list"),
  map: document.getElementById("map"),
  filter: document.getElementById("filter"),
  refresh: document.getElementById("refresh")
};

const state = {
  rentals: [],
  filteredRentals: []
}

async function getRentalObjects(){
  try {
    const response = await fetch("public/raw.json");
    return response.json();
  } catch({ message }){
    throw new Error(message);
  }
}

function bindEvents() {
  ui.toggle.addEventListener("click", () => {
    if(ui.map.classList.contains("hide")) {
      ui.toggle.innerText = "List";
    } else {
      ui.toggle.innerText = "Map";
    }
    ui.list.classList.toggle("hide");
    ui.map.classList.toggle("hide");
  });

  ui.filter.addEventListener("change", ({ target }) => {
    const filtered = state.rentals
      .filter(r => r.rooms == target.value && r.region == "Uppsala" && r.typeOfRental != "student");
    filtered.sort((a,b) => a.rent - b.rent);
    state.filteredRentals = filtered;
    renderList(filtered);
  });

  ui.refresh.addEventListener("click", async () => {
      try {
        ui.refresh.innerText = "Loading";
        const response = await fetch("/refresh");
        const text = await response.text();
        ui.refresh.innerText = "Refresh";
        console.log(text);
      } catch({ message }) {
        console.log(message);
      }
  })
}

function renderList(data) {
  const html = data
    .reduce((acc, r) => acc += `
      <div class="list__item">
        <img class="image" src="https://bostad.uppsala.se/${r.image}"/>
        <div class="details">
          <h2><a href="https://bostad.uppsala.se/lediga-bostader/bostad/?id=${
            r.rentalObjectId
          }">${r.address}</a></h2>
          <p>Hyra: <strong>${r.rent}</strong></p>
          <p>Rum: <strong>${r.rooms}</strong></p>
          <p>Sökande: <strong>${r.applications}</strong></p>
        </div>
      </div>`, "");
  ui.list.innerHTML = html;
}

async function init(){
  const rentalObjects = await getRentalObjects();
  const filtered = rentalObjects
    .filter(r => r.rooms == 2 && r.region == "Uppsala" && r.typeOfRental != "student")
  filtered.sort((a,b) => a.rent - b.rent);
  state.rentals = rentalObjects;
  state.filteredRentals = filtered;
  renderList(filtered);
  bindEvents();
}

init();
