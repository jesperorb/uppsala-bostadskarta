const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')))

app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname });
})

app.listen(5000, () => console.log('listening on port 5000'));

let j = schedule.scheduleJob({ hour: 13, minute: 30 }, function () {
  runScrape();
});

async function runScrape(){
  try{
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://bostad.uppsala.se/lediga-bostader/');
    
    await page.waitForSelector('#rental-objects-table')

    const rentalObjects = await page.$$('.rentalobject');
    const data = [];

    for(let rentalObject of rentalObjects){
      let moreInfo = await rentalObject.$$eval('span', spans => {
        let obj = {};
        spans.map(span => obj[span.classList.item(0)] = span.innerText);
        return obj;
      });
      data.push(moreInfo);
    }

    let featureCollection = {
      type: "FeatureCollection",
      features: []
    }

    for (let rentalObject of data) {
      let feat = {
        type: "Feature",
        properties: {
          address: rentalObject.address,
          rent: parseInt(rentalObject.rent, 10),
          rooms: parseInt(rentalObject.rooms, 10),
          size: parseInt(rentalObject.size, 10),
          rentPerArea: parseFloat(parseFloat(rentalObject.rent) / parseFloat(rentalObject.size)),
          applications: parseInt(rentalObject.applications, 10),
          landlord: rentalObject.landlord,
          image: rentalObject.imagePrimaryId,
          balcony: Boolean(rentalObject.balcony),
          rentalObjectId: rentalObject.rentalObjectId
        },
        geometry: {
          type: "Point",
          coordinates: [
            parseFloat(rentalObject.longitude.replace(',', '.')),
            parseFloat(rentalObject.latitude.replace(',', '.'))
          ]
        }
      }
      featureCollection.features.push(feat);
    }

    fs.writeFileSync('public/formatted.geojson', JSON.stringify(featureCollection), 'utf-8');
    console.log('Scrape finished');
    await browser.close();
  } catch(error){
    console.log(error);
    await browser.close();
  }
};


