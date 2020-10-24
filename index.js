const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const app = express();
let lastUpdated = null;

app.use('/public', express.static(path.join(__dirname, 'public')))

app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.get('/refresh', async (req, res) => {
  if ((lastUpdated + 1800) > new Date().getTime()){
    await scrapeUppsalaBostad();
    return res.send("Refreshed");
  }
  return res.send("30 mins between every refresh");
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
    lastUpdated = new Date().getTime();
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
