// import { bindFn } from './util.js';
import config from './client-cfg.js'
console.log(config)

window.addEventListener('load', async e => {
    // Get Projects
    // Get Abouts
    await getAbouts();

    
});

async function getAbouts(){
    let apiRes;

    apiRes = await fetch(`/About`)
    console.log(13, apiRes)

}

async function initMap(){
    new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
      })
}

