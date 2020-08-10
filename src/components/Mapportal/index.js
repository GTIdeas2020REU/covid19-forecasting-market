import React from "react";
import L from "leaflet";
import statesData from './us-states.json';
import countriesData from './countries.json';
//import './map.css'

const style = {
  width: "100%",
  height: "600px"
};

const mapStyle = (feature) => {
  return ({
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.7,
    fillColor: "#FFEDA0"

  });
}

class Mapportal extends React.Component {
  componentDidMount() {
    // create map
    this.map = L.map("map", {
      center: [37.8, -96],
      zoom: 4,
      layers: [
        L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFjaGVsb21ib2siLCJhIjoiY2tjODZ6c3UzMTh3ZTJyb2JndHN0dXhlOSJ9.h8aubFClamI3kiUsjIgNTg",
        {
          maxZoom: 18,
          attribution:
            'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
          id: "dark-v10"
        })
      ]
    });

    this.geojson = L.geoJson(statesData, {
      style: mapStyle,
      onEachFeature: this.onEachFeature
    }).addTo(this.map);

    this.countries = L.geoJson(countriesData, {
		style: mapStyle,
		onEachFeature: this.onEachFeature
    }).addTo(this.map);
    
    var overlay = {
			"Countries": this.countries,
			"States" : this.geojson
	};
  L.control.layers(overlay).addTo(this.map);


    // add layer
    this.layer = L.layerGroup().addTo(this.map);
  }
  onEachFeature = (feature, layer) => {
	layer.bindTooltip(feature.properties.name.toString(),{noHide:true}).openTooltip();
    layer.on({
      mouseover: this.highlightFeature,
      mouseout: this.resetHighlight
    });
    layer.on("click",function(e){
      // this gets the id for each country, and we can use that to redirect to different pages since each 
      // json layer has different ids. the states are 1-50, and the countries are their official code
      window.alert(layer.feature.id);
  });
  }
  highlightFeature = (e) => {
    var layer = e.target;

    layer.setStyle({
      fillColor: "#FFEDA0",
      weight: 5,
      color: "#666",
      dashArray: "",
      fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
    //layer.bringToFront();

  
  }
  resetHighlight = (event) => {
	this.geojson.resetStyle(event.target);
	this.countries.resetStyle(event.target);
  }

  render() {
    return <div id="map" style={style} />;
  }
}

export default Mapportal;
