const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')))

app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.get('/refresh', async (req, res) => {
  await scrapeUppsalaBostad();
  res.send("OK");
});

app.listen(5000, () => console.log('listening on port 5000'));

let scheduledScrape = schedule
  .scheduleJob({ hour: 13, minute: 30 }, scrapeUppsalaBostad);

async function scrapeUppsalaBostad(){
  try{
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://bostad.uppsala.se/lediga-bostader/');
    await page.waitForSelector('#rental-objects-table')
    const rentalObjects = await page.$$('.rentalobject');
    const rentalData = await processHTML(rentalObjects);
    const { featureCollection, rawData } = formatRentalData(rentalData);

    fs.writeFileSync('public/formatted.geojson', JSON.stringify(featureCollection), 'utf-8');
    fs.writeFileSync('public/raw.json', JSON.stringify(rawData), 'utf-8');
    await browser.close();
  } catch(error){
    console.log(error);
    await browser.close();
  }
};

function formatProperties(rentalObject) {
  return {
    address: rentalObject.address,
    rent: parseInt(rentalObject.rent, 10),
    rooms: parseInt(rentalObject.rooms, 10),
    size: parseInt(rentalObject.size, 10),
    rentPerArea: parseFloat(parseFloat(rentalObject.rent) / parseFloat(rentalObject.size)),
    applications: parseInt(rentalObject.applications, 10),
    landlord: rentalObject.landlord,
    image: rentalObject.imagePrimaryId,
    balcony: Boolean(rentalObject.balcony),
    rentalObjectId: rentalObject.rentalObjectId,
    typeOfRental: rentalObject.boendetyp.trim(),
    region: rentalObject.region.trim(),
    location: rentalObject.location.trim()
  }
}

function formatGeometry(rentalObject) {
  return {
    type: "Point",
    coordinates: [
      parseFloat(rentalObject.longitude.replace(',', '.')),
      parseFloat(rentalObject.latitude.replace(',', '.'))
    ]
  }
}

function formatRentalData(rentalData) {
  const featureCollection = {
    type: "FeatureCollection",
    features: []
  }
  const rawData = [];
  for (const rentalObject of rentalData) {
    const properties = formatProperties(rentalObject);
    const feat = {
      type: "Feature",
      properties,
      geometry: formatGeometry(rentalObject)
    }
    featureCollection.features.push(feat);
    rawData.push(properties);
  }
  return {
    featureCollection,
    rawData
  }
}

async function processHTML(rentalObjects) {
  const rentalData = [];

  for(const rentalObject of rentalObjects){
    const infoObject = await rentalObject.$$eval('span', spans => {
      let obj = {};
      spans.forEach(span => obj[span.classList.item(0)] = span.innerText);
      return obj;
    });
    rentalData.push(infoObject);
  }
  return rentalData;
}

async function scrapeBlocket(){
  const url = "https://www.blocket.se/bostad/uthyres/uppsala?sort=&ss=&se=&ros=1&roe=3&bs=&be=&mre=8000&q=&q=&q=&is=1&save_search=1&l=0&md=th&f=p&f=c&f=b&m=113";
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('#item_list');
  const rentalObjects = await page.$$('.item_row');
}